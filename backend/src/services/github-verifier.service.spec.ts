import { GitHubVerifier } from './github-verifier.service';

type MockResponse = { ok: boolean; status: number; json: () => Promise<any> };

function jsonResponse(data: any, status = 200): MockResponse {
  return { ok: status < 400, status, json: async () => data };
}

function pathOf(input: any): string {
  return String(input).replace('https://api.github.com', '').split('?')[0];
}

function setupFetch(handler: (path: string) => MockResponse) {
  global.fetch = jest.fn(async (input: any) => {
    return handler(pathOf(input)) as unknown as Response;
  }) as unknown as typeof fetch;
}

describe('GitHubVerifier', () => {
  it('parses a plain GitHub repository URL', () => {
    const v = new GitHubVerifier();
    expect(v.parseRepoUrl('https://github.com/octocat/Hello-World')).toEqual({ owner: 'octocat', repo: 'Hello-World' });
  });

  it('parses a URL with a trailing .git or slash', () => {
    const v = new GitHubVerifier();
    expect(v.parseRepoUrl('https://github.com/facebook/react.git')).toEqual({ owner: 'facebook', repo: 'react' });
    expect(v.parseRepoUrl('https://github.com/nodejs/node/')).toEqual({ owner: 'nodejs', repo: 'node' });
  });

  it('returns null for an invalid repository URL', () => {
    const v = new GitHubVerifier();
    expect(v.parseRepoUrl('not-a-url')).toBeNull();
    expect(v.parseRepoUrl('')).toBeNull();
  });

  it('marks a repo as verified when it contains test files', async () => {
    let commitPages = 1;
    setupFetch(path => {
      if (path === '/repos/user/repo') return jsonResponse({ default_branch: 'main' });
      if (path.startsWith('/repos/user/repo/git/trees')) {
        return jsonResponse({ tree: [
          { path: 'src/index.js' },
          { path: 'test/app.test.js' },
          { path: 'Dockerfile' },
          { path: 'README.md' }
        ]});
      }
      if (path.startsWith('/repos/user/repo/commits')) {
        if (commitPages > 0) {
          commitPages -= 1;
          return jsonResponse(Array.from({ length: 100 }, (_, i) => ({ sha: `s${i}` })));
        }
        return jsonResponse([]);
      }
      return jsonResponse({}, 404);
    });

    const v = new GitHubVerifier();
    const res = await v.verify('https://github.com/user/repo');

    expect(res.reachable).toBe(true);
    expect(res.verified).toBe(true);
    expect(res.hasTests).toBe(true);
    expect(res.hasDocker).toBe(true);
    expect(res.hasReadme).toBe(true);
    expect(res.commitCount).toBe(100);
  });

  it('detects test files under common locations and jest configs', async () => {
    setupFetch(path => {
      if (path === '/repos/a/b') return jsonResponse({ default_branch: 'main' });
      if (path.startsWith('/repos/a/b/git/trees')) return jsonResponse({ tree: [{ path: '__tests__/foo.ts' }, { path: 'vitest.config.ts' }] });
      if (path.startsWith('/repos/a/b/commits')) return jsonResponse([]);
      return jsonResponse({}, 404);
    });

    const v = new GitHubVerifier();
    const res = await v.verify('https://github.com/a/b');
    expect(res.hasTests).toBe(true);
  });

  it('does not verify a reachable repo that lacks tests', async () => {
    setupFetch(path => {
      if (path === '/repos/user/repo') return jsonResponse({ default_branch: 'main' });
      if (path.startsWith('/repos/user/repo/git/trees')) return jsonResponse({ tree: [{ path: 'src/index.js' }, { path: 'README.md' }] });
      if (path.startsWith('/repos/user/repo/commits')) return jsonResponse([]);
      return jsonResponse({}, 404);
    });

    const v = new GitHubVerifier();
    const res = await v.verify('https://github.com/user/repo');

    expect(res.reachable).toBe(true);
    expect(res.verified).toBe(false);
    expect(res.hasTests).toBe(false);
  });

  it('reports an unreachable repo for a 404 response', async () => {
    setupFetch(() => jsonResponse({ message: 'Not Found' }, 404));
    const v = new GitHubVerifier();
    const res = await v.verify('https://github.com/user/missing');

    expect(res.reachable).toBe(false);
    expect(res.verified).toBe(false);
    expect(res.error).toMatch(/not found|accessible/i);
  });
});

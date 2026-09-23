import { GitHubVerifier } from './github-verifier.service';

type MockResponse = { ok: boolean; status: number; json: () => Promise<any> };

function jsonResponse(data: any, status = 200): MockResponse {
  return { ok: status < 400, status, json: async () => data };
}

function pathOf(input: any): string {
  return String(input).replace('https://api.github.com', '');
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

  it('treats an empty repo (no tree on default branch) as reachable but not verified', async () => {
    setupFetch(path => {
      if (path === '/repos/user/repo') return jsonResponse({ default_branch: 'main' });
      if (path.startsWith('/repos/user/repo/git/trees')) return jsonResponse({}, 409);
      if (path.startsWith('/repos/user/repo/commits')) return jsonResponse([]);
      return jsonResponse({}, 404);
    });

    const v = new GitHubVerifier();
    const res = await v.verify('https://github.com/user/repo');

    expect(res.reachable).toBe(true);
    expect(res.verified).toBe(false);
    expect(res.hasTests).toBe(false);
    expect(res.commitCount).toBe(0);
    expect(res.error).toBeUndefined();
  });

  it('surfaces repo metadata depth (language, fork, archive, push date)', async () => {
    setupFetch(path => {
      if (path === '/repos/user/repo') {
        return jsonResponse({
          default_branch: 'main',
          language: 'TypeScript',
          fork: true,
          pushed_at: '2025-01-15T10:00:00Z'
        });
      }
      if (path.startsWith('/repos/user/repo/git/trees')) {
        return jsonResponse({ tree: [{ path: 'src/index.ts' }] });
      }
      if (path.startsWith('/repos/user/repo/commits')) return jsonResponse([]);
      return jsonResponse({}, 404);
    });

    const v = new GitHubVerifier();
    const res = await v.verify('https://github.com/user/repo');

    expect(res.primaryLanguage).toBe('TypeScript');
    expect(res.isFork).toBe(true);
    expect(res.isArchived).toBe(false);
    expect(res.lastPushedAt).toBe('2025-01-15T10:00:00Z');
    expect(res.detectedStack).toContain('JavaScript / TypeScript');
  });

  it('detects stack from real file extensions, not just the primary language', async () => {
    setupFetch(path => {
      if (path === '/repos/user/repo') return jsonResponse({ default_branch: 'main' });
      if (path.startsWith('/repos/user/repo/git/trees')) {
        return jsonResponse({ tree: [{ path: 'main.py' }, { path: 'requirements.txt' }, { path: 'server.go' }] });
      }
      if (path.startsWith('/repos/user/repo/commits')) return jsonResponse([]);
      return jsonResponse({}, 404);
    });

    const v = new GitHubVerifier();
    const res = await v.verify('https://github.com/user/repo');

    expect(res.detectedStack).toContain('Python');
    expect(res.detectedStack).toContain('Go');
    expect(res.detectedStack).not.toContain('JavaScript / TypeScript');
  });

  it('ignores vendored/generated paths as test or stack evidence', async () => {
    setupFetch(path => {
      if (path === '/repos/user/repo') return jsonResponse({ default_branch: 'main' });
      if (path.startsWith('/repos/user/repo/git/trees')) {
        return jsonResponse({ tree: [
          { path: 'node_modules/foo/lib.test.js' },
          { path: 'dist/build.spec.ts' },
          { path: 'src/index.js' }
        ]});
      }
      if (path.startsWith('/repos/user/repo/commits')) return jsonResponse([]);
      return jsonResponse({}, 404);
    });

    const v = new GitHubVerifier();
    const res = await v.verify('https://github.com/user/repo');

    expect(res.hasTests).toBe(false);
    expect(res.detectedStack).toContain('JavaScript / TypeScript');
  });

  it('falls back to shallow + targeted scans when the recursive tree is truncated', async () => {
    setupFetch(path => {
      if (path === '/repos/user/repo') return jsonResponse({ default_branch: 'main' });
      if (path === '/repos/user/repo/git/trees/main?recursive=1') {
        return jsonResponse({ truncated: true, tree: [{ path: 'README.md' }] });
      }
      if (path === '/repos/user/repo/git/trees/main?recursive=0') {
        return jsonResponse({ tree: [{ path: 'tests', type: 'tree' }, { path: 'src', type: 'tree' }] });
      }
      if (path === '/repos/user/repo/git/trees/main/tests?recursive=1') {
        return jsonResponse({ tree: [{ path: 'cases.spec.ts' }, { path: 'helpers.ts' }] });
      }
      if (path.startsWith('/repos/user/repo/commits')) return jsonResponse([]);
      return jsonResponse({}, 404);
    });

    const v = new GitHubVerifier();
    const res = await v.verify('https://github.com/user/repo');

    expect(res.reachable).toBe(true);
    expect(res.hasReadme).toBe(true);
    expect(res.hasTests).toBe(true);
    expect(res.treeTruncated).toBe(true);
  });

  it('maps GitHub rate-limit errors to an actionable message', async () => {
    setupFetch(() => jsonResponse({ message: 'API rate limit exceeded' }, 403));
    const v = new GitHubVerifier();
    const res = await v.verify('https://github.com/user/repo');

    expect(res.reachable).toBe(false);
    expect(res.error).toMatch(/rate limit/i);
  });
});

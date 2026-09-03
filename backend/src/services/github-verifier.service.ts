export interface RepoVerification {
  rawUrl: string;
  owner: string;
  repo: string;
  reachable: boolean;
  hasTests: boolean;
  hasDocker: boolean;
  hasReadme: boolean;
  commitCount: number;
  verified: boolean;
  error?: string;
}

const TEST_FILE_PATTERN = /(\.test\.|\.spec\.|\.(test|spec)\.(js|jsx|ts|tsx|mjs|cjs)\b|\/tests?\b|__tests__|jest\.config|vitest\.config|pytest\.ini|pytest|test_|_test\.|mocha\.|cypress\.config|playwright\.config)/i;
const DOCKER_PATTERN = /(^|\/)dockerfile$|\.dockerignore|(^|\/)\.?docker\//i;
const README_PATTERN = /(^|\/)readme(\.[a-z]+)?$/i;

const API_BASE = 'https://api.github.com';
const MAX_COMMITS = 1000;

/**
 * Verifies a candidate's GitHub repository against real evidence (test files,
 * Dockerfile, README, commit count) using the GitHub REST API over native fetch.
 * The fetch global can be mocked in tests.
 */
export class GitHubVerifier {
  private readonly token?: string;

  constructor(token?: string) {
    // Default to the environment token; also allow direct injection.
    this.token = token || process.env.GITHUB_TOKEN || undefined;
  }

  public parseRepoUrl(repoUrl: string): { owner: string; repo: string } | null {
    if (!repoUrl || typeof repoUrl !== 'string') {
      return null;
    }
    const url = repoUrl.trim().replace(/\/+$/, '');
    const match = url.match(/(?:github\.com)[/:]([^/]+)\/([^/#?]+)/i);
    if (!match) {
      return null;
    }
    const owner = match[1].replace(/\.git$/i, '');
    const repo = match[2].replace(/\.git$/i, '');
    return { owner, repo };
  }

  public async verify(repoUrl: string): Promise<RepoVerification> {
    const parsed = this.parseRepoUrl(repoUrl);
    if (!parsed) {
      return {
        rawUrl: repoUrl,
        owner: '',
        repo: '',
        reachable: false,
        hasTests: false,
        hasDocker: false,
        hasReadme: false,
        commitCount: 0,
        verified: false,
        error: 'Could not parse repository URL.'
      };
    }

    const { owner, repo } = parsed;
    const base = { rawUrl: repoUrl, owner, repo };

    try {
      const repoRes = await this.request(`/repos/${owner}/${repo}`);
      if (repoRes.status === 404) {
        return {
          ...base,
          reachable: false,
          hasTests: false,
          hasDocker: false,
          hasReadme: false,
          commitCount: 0,
          verified: false,
          error: 'Repository was not found or is not accessible.'
        };
      }
      if (!repoRes.ok) {
        return this.failed(base, `GitHub returned ${repoRes.status}.`);
      }
      const repoInfo = await repoRes.json();
      const defaultBranch = repoInfo.default_branch || 'main';

      const treeRes = await this.request(`/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`);
      if (!treeRes.ok) {
        return this.failed(base, `Could not read repository tree (${treeRes.status}).`);
      }
      const tree = await treeRes.json();
      const entries: Array<{ path?: string }> = Array.isArray(tree.tree) ? tree.tree : [];

      let hasTests = false;
      let hasDocker = false;
      let hasReadme = false;
      for (const entry of entries) {
        const path = entry.path;
        if (!path) {
          continue;
        }
        if (!hasTests && TEST_FILE_PATTERN.test(path)) {
          hasTests = true;
        }
        if (!hasDocker && DOCKER_PATTERN.test(path)) {
          hasDocker = true;
        }
        if (!hasReadme && README_PATTERN.test(path)) {
          hasReadme = true;
        }
        if (hasTests && hasDocker && hasReadme) {
          break;
        }
      }

      const commitCount = await this.countCommits(owner, repo);
      return {
        ...base,
        reachable: true,
        hasTests,
        hasDocker,
        hasReadme,
        commitCount,
        verified: hasTests
      };
    } catch (err: any) {
      return this.failed(base, `GitHub verification failed (${err?.message || 'unknown error'}).`);
    }
  }

  private async countCommits(owner: string, repo: string): Promise<number> {
    let total = 0;
    let page = 1;
    let hasMore = true;
    while (hasMore && total < MAX_COMMITS) {
      const res = await this.request(`/repos/${owner}/${repo}/commits?per_page=100&page=${page}`);
      if (!res.ok) {
        break;
      }
      const commits = await res.json();
      const count = Array.isArray(commits) ? commits.length : 0;
      total += count;
      hasMore = count === 100;
      page += 1;
    }
    return Math.min(total, MAX_COMMITS);
  }

  private async request(path: string): Promise<Response> {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'skillbridge'
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return fetch(`${API_BASE}${path}`, { headers });
  }

  private failed(
    base: { rawUrl: string; owner: string; repo: string },
    error: string
  ): RepoVerification {
    return {
      ...base,
      reachable: false,
      hasTests: false,
      hasDocker: false,
      hasReadme: false,
      commitCount: 0,
      verified: false,
      error
    };
  }
}

export const githubVerifier = new GitHubVerifier();

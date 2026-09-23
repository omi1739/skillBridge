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
  // Depth metadata surfaced from the real repository.
  primaryLanguage?: string;
  isArchived?: boolean;
  isFork?: boolean;
  lastPushedAt?: string;
  detectedStack: string[]; // user-facing labels inferred from actual repo files
  treeTruncated?: boolean;
}

const TEST_FILE_PATTERN = /(\.test\.|\.spec\.|\.(test|spec)\.(js|jsx|ts|tsx|mjs|cjs)\b|\/tests?\b|__tests__|jest\.config|vitest\.config|pytest\.ini|pytest|test_|_test\.|mocha\.|cypress\.config|playwright\.config)/i;
const DOCKER_PATTERN = /(^|\/)dockerfile$|\.dockerignore|docker-compose|(^|\/)\.?docker\//i;
const README_PATTERN = /(^|\/)readme(\.[a-z]+)?$/i;

/**
 * Paths that are (almost certainly) vendored/generated and must never count as
 * evidence of the candidate's own tests or project structure.
 */
const VENDORED_PATH_PATTERN = /(^|\/)(node_modules|vendor|dist|build|target|__pycache__|\.next|\.venv|\.git)(\/|$)/;

const API_BASE = 'https://api.github.com';
const MAX_COMMITS = 1000;

/**
 * Extension -> detected stack label. Keep aligned with the vocabulary shown in
 * the portfolio UI (and ProjectService's description heuristics).
 */
const STACK_BY_EXTENSION: Array<{ labels: string[]; test: RegExp }> = [
  { labels: ['JavaScript / TypeScript'], test: /\.(?:js|jsx|mjs|cjs|ts|tsx)$/i },
  { labels: ['Python'], test: /\.(?:py|pyw)$|(^|\/)(requirements\.txt|pyproject\.toml|setup\.py|Pipfile)$/i },
  { labels: ['SQL'], test: /\.sql$/i },
  { labels: ['Go'], test: /\.go$/i },
  { labels: ['Rust'], test: /\.rs$/i },
  { labels: ['Java'], test: /\.java$/ },
  { labels: ['C# (.NET)'], test: /\.cs$/ },
  { labels: ['Ruby'], test: /\.rb$|(^|\/)Gemfile$/i },
  { labels: ['PHP'], test: /\.php$/ },
  { labels: ['Docker'], test: /(^|\/)dockerfile$|docker-compose|(^|\/)\.?docker\//i }
];

/** Map a GitHub repo `language` field onto the same user-facing labels. */
const STACK_BY_LANGUAGE: Record<string, string[]> = {
  JavaScript: ['JavaScript / TypeScript'],
  TypeScript: ['JavaScript / TypeScript'],
  Python: ['Python'],
  Go: ['Go'],
  Rust: ['Rust'],
  Java: ['Java'],
  'C#': ['C# (.NET)'],
  Ruby: ['Ruby'],
  PHP: ['PHP']
};

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
      return this.baseFailure(repoUrl, 'Could not parse repository URL.');
    }

    const { owner, repo } = parsed;
    const base = {
      rawUrl: repoUrl,
      owner,
      repo,
      reachable: false,
      hasTests: false,
      hasDocker: false,
      hasReadme: false,
      commitCount: 0,
      verified: false,
      detectedStack: [] as string[]
    };

    try {
      const repoRes = await this.request(`/repos/${owner}/${repo}`);
      if (repoRes.status === 404) {
        return {
          ...base,
          error: 'Repository was not found or is not accessible.'
        };
      }
      if (!repoRes.ok) {
        return this.rateLimitFailure(base, repoRes.status);
      }
      const repoInfo = await repoRes.json();

      const defaultBranch = repoInfo.default_branch || 'main';
      const treeScan = await this.scanTree(owner, repo, defaultBranch);

      const commitCount = treeScan.empty
        ? 0
        : await this.countCommits(owner, repo);

      const detectedStack = this.detectStack(treeScan.paths, repoInfo.language);

      return {
        ...base,
        reachable: true,
        hasTests: treeScan.hasTests,
        hasDocker: treeScan.hasDocker,
        hasReadme: treeScan.hasReadme,
        commitCount,
        verified: treeScan.hasTests,
        primaryLanguage: repoInfo.language || undefined,
        isArchived: repoInfo.archived === true,
        isFork: repoInfo.fork === true,
        lastPushedAt: repoInfo.pushed_at || undefined,
        detectedStack,
        treeTruncated: treeScan.truncated || undefined
      };
    } catch (err: any) {
      return this.failed(base, `GitHub verification failed (${err?.message || 'unknown error'}).`);
    }
  }

  /**
   * Walk the default branch tree (recursing into common test directories when
   * the recursive listing is truncated). Returns detection flags plus every
   * scanned path so stack inference can run over the same evidence.
   */
  private async scanTree(
    owner: string,
    repo: string,
    defaultBranch: string
  ): Promise<{
    paths: string[];
    hasTests: boolean;
    hasDocker: boolean;
    hasReadme: boolean;
    empty: boolean;
    truncated: boolean;
  }> {
    const res = await this.request(`/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`);
    // 409 = repository has no commits yet (no tree on the default branch).
    if (res.status === 409) {
      return { paths: [], hasTests: false, hasDocker: false, hasReadme: false, empty: true, truncated: false };
    }
    if (!res.ok) {
      throw new Error(`Could not read repository tree (${res.status}).`);
    }
    const tree = await res.json();
    let entries: Array<{ path?: string; type?: string }> = Array.isArray(tree.tree) ? tree.tree : [];
    let truncated = tree.truncated === true;

    if (truncated) {
      // Very large repos truncate the recursive listing. Fall back to a shallow
      // root listing, then scan the well-known test directories individually so
      // we still catch the evidence that matters without drifting over the whole
      // tree.
      const shallow = await this.request(`/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=0`);
      if (!shallow.ok) {
        throw new Error(`Could not read repository tree (${shallow.status}).`);
      }
      const shallowTree = await shallow.json();
      const rootEntries: Array<{ path?: string; type?: string }> = Array.isArray((shallowTree as any).tree) ? (shallowTree as any).tree : [];
      const testDirs = rootEntries
        .filter((e: { type?: string; path?: string }) => e.type === 'tree' && /^(test|tests|__tests__|spec|e2e|integration|cypress|playwright)$/i.test(e.path || ''))
        .map((e: { path?: string }) => e.path as string);

      const subEntries: Array<{ path?: string; type?: string }> = [];
      for (const dir of testDirs.slice(0, 8)) {
        try {
          const sub = await this.request(`/repos/${owner}/${repo}/git/trees/${defaultBranch}/${dir}?recursive=1`);
          if (sub.ok) {
            const subTree = await sub.json();
            if (Array.isArray(subTree.tree)) {
              subEntries.push(...(subTree.tree as Array<{ path?: string; type?: string }>).map(e => ({ ...e, path: `${dir}/${e.path}` })));
            }
          }
        } catch {
          // A missing directory is fine; keep scanning the rest.
        }
      }
      // Keep the (already fetched) truncated entries — they may include
      // root-level README/Dockerfile — and layer the targeted scans on top.
      const knownPaths = new Set(entries.map(e => e.path));
      entries = [...entries, ...rootEntries.filter(e => !knownPaths.has(e.path)), ...subEntries];
    }

    const paths: string[] = [];
      for (const e of entries) {
        const p = e.path;
        if (p && !VENDORED_PATH_PATTERN.test(p)) {
          paths.push(p);
        }
      }

    let hasTests = false;
    let hasDocker = false;
    let hasReadme = false;
    for (const path of paths) {
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

    return { paths, hasTests, hasDocker, hasReadme, empty: false, truncated };
  }

  /**
   * Infer the candidate's stack from the files actually present in the repo,
   * augmented with GitHub's detected primary language.
   */
  public detectStack(paths: string[], primaryLanguage?: string): string[] {
    const labels = new Set<string>();
    for (const p of paths) {
      if (VENDORED_PATH_PATTERN.test(p)) {
        continue;
      }
      for (const rule of STACK_BY_EXTENSION) {
        if (rule.test.test(p)) {
          for (const l of rule.labels) {
            labels.add(l);
          }
        }
      }
    }
    if (primaryLanguage && STACK_BY_LANGUAGE[primaryLanguage]) {
      for (const l of STACK_BY_LANGUAGE[primaryLanguage]) {
        labels.add(l);
      }
    }
    return Array.from(labels);
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

  private baseFailure(rawUrl: string, error: string): RepoVerification {
    return {
      rawUrl,
      owner: '',
      repo: '',
      reachable: false,
      hasTests: false,
      hasDocker: false,
      hasReadme: false,
      commitCount: 0,
      verified: false,
      error,
      detectedStack: []
    };
  }

  private rateLimitFailure(base: RepoVerification, status: number): RepoVerification {
    const isRateLimit = status === 403 || status === 429;
    return {
      ...base,
      error: isRateLimit
        ? 'GitHub API rate limit reached. Try again later or configure GITHUB_TOKEN.'
        : `GitHub returned ${status}.`
    };
  }

  private failed(base: RepoVerification, error: string): RepoVerification {
    return { ...base, error };
  }
}

export const githubVerifier = new GitHubVerifier();
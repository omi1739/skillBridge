import { ProjectEvidence, ProjectHealthReport } from '@skillbridge/types';
import { ProjectHealthService } from './project-health.service';
import { store } from '../store';
import { GitHubVerifier, RepoVerification } from './github-verifier.service';
import { generateAIJson } from './ai/ai-provider';

jest.mock('../store', () => ({
  store: {
    getProjects: jest.fn()
  }
}));

jest.mock('./ai/ai-provider', () => ({
  generateAIJson: jest.fn()
}));

const mockedStore = store as jest.Mocked<typeof store>;
const mockedGenerateAIJson = generateAIJson as jest.MockedFunction<typeof generateAIJson>;

const baseProject: ProjectEvidence = {
  id: 'proj_1',
  userId: 'user_1',
  title: 'My API',
  repoUrl: 'https://github.com/user/repo',
  description: 'A REST API built with Node.js, Express and PostgreSQL, with a clean architecture.',
  primarySkills: ['Node.js'],
  detectedStack: ['JavaScript / TypeScript', 'PostgreSQL'],
  hasTests: true,
  hasDocker: true,
  hasReadme: true,
  commitCountEstimate: 60,
  verificationStatus: 'VERIFIED',
  submittedAt: new Date().toISOString()
};

function fakeVerifier(result: Partial<RepoVerification>): GitHubVerifier {
  const verify = jest.fn().mockResolvedValue({
    rawUrl: baseProject.repoUrl,
    owner: 'user',
    repo: 'repo',
    reachable: true,
    hasTests: true,
    hasDocker: true,
    hasReadme: true,
    commitCount: 60,
    verified: true,
    detectedStack: ['JavaScript / TypeScript'],
    lastPushedAt: new Date().toISOString(),
    ...result
  } as RepoVerification);
  return { verify } as unknown as GitHubVerifier;
}

describe('ProjectHealthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGenerateAIJson.mockResolvedValue(null);
  });

  it('scores a well-rounded project as HEALTHY with no critical issues', () => {
    const service = new ProjectHealthService(fakeVerifier({}));
    const signals = service.buildSignals(baseProject, {
      rawUrl: baseProject.repoUrl,
      owner: 'user',
      repo: 'repo',
      reachable: true,
      hasTests: true,
      hasDocker: true,
      hasReadme: true,
      commitCount: 60,
      verified: true,
      isArchived: false,
      isFork: false,
      lastPushedAt: new Date().toISOString(),
      detectedStack: ['JavaScript / TypeScript']
    });
    const report = service.score(baseProject, signals);

    expect(report.overallScore).toBeGreaterThanOrEqual(90);
    expect(report.grade).toBe('A');
    expect(report.status).toBe('HEALTHY');
    expect(report.issues.filter(i => i.severity === 'CRIT')).toHaveLength(0);
    expect(report.detectedStack).toContain('JavaScript / TypeScript');
  });

  it('flags missing tests, docs, containerization, low activity and staleness', () => {
    const stale = {
      ...baseProject,
      hasTests: false,
      hasDocker: false,
      hasReadme: false,
      commitCountEstimate: 2,
      verificationStatus: 'NEEDS_REVIEW' as const
    };
    const service = new ProjectHealthService(fakeVerifier({}));
    const signals = service.buildSignals(stale, {
      rawUrl: stale.repoUrl,
      owner: 'user',
      repo: 'repo',
      reachable: true,
      hasTests: false,
      hasDocker: false,
      hasReadme: false,
      commitCount: 2,
      verified: false,
      isFork: false,
      isArchived: false,
      lastPushedAt: new Date(Date.now() - 500 * 86_400_000).toISOString(),
      detectedStack: []
    });
    const report = service.score(stale, signals);

    const titles = report.issues.map(i => i.title);
    expect(titles).toEqual(expect.arrayContaining([
      'No automated tests detected',
      'Missing README',
      'No reproducible setup',
      'Low commit activity',
      'Repository looks inactive'
    ]));
    expect(report.overallScore).toBeLessThan(50);
    expect(report.status).toBe('UNHEALTHY');
    expect(report.suggestions.length).toBeGreaterThan(0);
  });

  it('caps the score when the repository cannot be verified', () => {
    const service = new ProjectHealthService(fakeVerifier({ reachable: false }));
    const signals = service.buildSignals(baseProject, {
      rawUrl: baseProject.repoUrl,
      owner: '', repo: '',
      reachable: false,
      hasTests: false, hasDocker: false, hasReadme: false, commitCount: 0,
      verified: false, detectedStack: []
    });
    const report = service.score(baseProject, signals);

    expect(report.overallScore).toBeLessThanOrEqual(55);
    expect(report.issues.some(i => i.severity === 'CRIT' && /could not be verified/i.test(i.title))).toBe(true);
  });

  it('returns null when the project id is unknown', async () => {
    mockedStore.getProjects.mockResolvedValue([]);
    const service = new ProjectHealthService(fakeVerifier({}));

    const report = await service.checkProject('user_1', 'proj_missing');

    expect(report).toBeNull();
  });

  it('falls back to a heuristic report when no AI provider is available', async () => {
    mockedStore.getProjects.mockResolvedValue([baseProject]);
    const service = new ProjectHealthService(fakeVerifier({}));

    const report = await service.checkProject('user_1', 'proj_1');

    expect(report).not.toBeNull();
    expect((report as ProjectHealthReport).source).toBe('heuristic');
    expect((report as ProjectHealthReport).model).toBeNull();
  });

  it('merges AI narrative while preserving objectively-derived critical issues', async () => {
    const project = { ...baseProject, hasTests: false };
    mockedStore.getProjects.mockResolvedValue([project]);
    mockedGenerateAIJson.mockResolvedValue({
      model: 'gemini',
      data: {
        issues: [{ severity: 'WARN', title: 'Module is doing too much', detail: 'Split the controller from business logic.' }],
        suggestions: [{ title: 'Split responsibilities', detail: 'Extract services from the route handlers.', category: 'architecture' }]
      }
    });
    const service = new ProjectHealthService(fakeVerifier({ hasTests: false, verified: false }));

    const report = (await service.checkProject('user_1', 'proj_1')) as ProjectHealthReport;

    expect(report.source).toBe('ai');
    expect(report.model).toBe('gemini');
    const titles = report.issues.map(i => i.title);
    expect(titles).toContain('No automated tests detected');
    expect(titles).toContain('Module is doing too much');
    expect(report.suggestions[0].title).toBe('Split responsibilities');
  });
});

import { ProjectService } from './project.service';
import { store } from '../store';
import { GitHubVerifier, RepoVerification } from './github-verifier.service';

jest.mock('../store', () => ({
  store: {
    getProjects: jest.fn(),
    saveProjects: jest.fn(),
    getEvidence: jest.fn(),
    saveEvidence: jest.fn(),
    getRecommendations: jest.fn(),
    updateRecommendationStatus: jest.fn(),
    getTargetRoleId: jest.fn().mockResolvedValue('role_junior_backend')
  }
}));

jest.mock('./gap.service', () => ({
  gapService: { calculateGaps: jest.fn().mockResolvedValue([]) }
}));

const mockedStore = store as jest.Mocked<typeof store>;

function fakeVerifier(result: Partial<RepoVerification> & Pick<RepoVerification, 'reachable' | 'verified'>) {
  const verify = jest.fn().mockResolvedValue({
    rawUrl: 'https://github.com/user/repo',
    owner: 'user',
    repo: 'repo',
    hasTests: false,
    hasDocker: false,
    hasReadme: false,
    commitCount: 0,
    ...result
  } as RepoVerification);
  return { verify } as unknown as GitHubVerifier;
}

const baseData = {
  title: 'My API',
  repoUrl: 'https://github.com/user/repo',
  description: 'A REST API built with Node.js, Express and PostgreSQL',
  primarySkills: ['Node.js', 'PostgreSQL']
};

describe('ProjectService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedStore.getProjects.mockResolvedValue([]);
    mockedStore.saveProjects.mockResolvedValue([]);
    mockedStore.getEvidence.mockResolvedValue([]);
    mockedStore.saveEvidence.mockResolvedValue([]);
    mockedStore.getRecommendations.mockResolvedValue([]);
    mockedStore.updateRecommendationStatus.mockResolvedValue();
  });

  it('marks a project VERIFIED and records HIGH confidence evidence when the repo passes checks', async () => {
    mockedStore.getRecommendations.mockResolvedValue([
      { id: 'rec_1', type: 'CAPSTONE_PROJECT' } as any
    ]);
    const verifier = fakeVerifier({ reachable: true, verified: true, hasTests: true, hasDocker: true, hasReadme: true, commitCount: 30 });
    const service = new ProjectService(verifier);

    const out = await service.submitProject('user_1', baseData);

    expect(out.project.verificationStatus).toBe('VERIFIED');
    expect(out.project.hasTests).toBe(true);
    expect(out.project.hasDocker).toBe(true);
    expect(out.project.commitCountEstimate).toBe(30);
    expect(out.verifiedSkills).toEqual(['Node.js', 'PostgreSQL']);

    const savedEvidence = mockedStore.saveEvidence.mock.calls[0][1] as any[];
    for (const ev of savedEvidence) {
      expect(ev.confidence).toBe('HIGH');
      expect(ev.proficiencyScore).toBe(0.90);
    }
    expect(mockedStore.updateRecommendationStatus).toHaveBeenCalled();
  });

  it('marks a reachable repo without tests as NEEDS_REVIEW with MEDIUM confidence', async () => {
    const verifier = fakeVerifier({ reachable: true, verified: false, hasTests: false, hasReadme: true, commitCount: 3 });
    const service = new ProjectService(verifier);

    const out = await service.submitProject('user_1', baseData);

    expect(out.project.verificationStatus).toBe('NEEDS_REVIEW');
    expect(out.project.hasTests).toBe(false);
    expect(out.verifiedSkills).toEqual([]);
    expect(mockedStore.updateRecommendationStatus).not.toHaveBeenCalled();

    const savedEvidence = mockedStore.saveEvidence.mock.calls[0][1] as any[];
    for (const ev of savedEvidence) {
      expect(ev.confidence).toBe('MEDIUM');
      expect(ev.proficiencyScore).toBe(0.65);
    }
  });

  it('marks an unreachable repo as PENDING', async () => {
    const verifier = fakeVerifier({ reachable: false, verified: false, hasTests: false, commitCount: 0 });
    const service = new ProjectService(verifier);

    const out = await service.submitProject('user_1', baseData);

    expect(out.project.verificationStatus).toBe('PENDING');
    expect(out.verifiedSkills).toEqual([]);
  });
});

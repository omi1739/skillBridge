import { GapService } from './gap.service';
import { store } from '../store';
import { Role, SkillEvidence } from '@skillbridge/types';

jest.mock('../store', () => ({
  store: {
    getRole: jest.fn(),
    getEvidence: jest.fn()
  }
}));

const mockedStore = store as jest.Mocked<typeof store>;

describe('GapService', () => {
  const service = new GapService();

  const role: Role = {
    id: 'role_junior_backend',
    slug: 'junior-backend',
    title: 'Junior Backend Engineer',
    category: 'engineering',
    description: '',
    marketContext: { region: 'BD', experienceLevel: 'Junior', typicalTitles: [] },
    roleSkills: [
      {
        skillId: 'skill_nodejs',
        required: true,
        roleWeight: 0.9,
        marketDemandFrequency: 0.95,
        proficiencyTarget: 'Intermediate',
        skill: { id: 'skill_nodejs', canonicalName: 'Node.js', category: 'Backend', description: '', aliases: [], prerequisites: [] }
      },
      {
        skillId: 'skill_docker',
        required: true,
        roleWeight: 0.6,
        marketDemandFrequency: 0.7,
        proficiencyTarget: 'Intermediate',
        skill: { id: 'skill_docker', canonicalName: 'Docker', category: 'DevOps', description: '', aliases: [], prerequisites: [] }
      }
    ]
  };

  const evidence = (skillId: string, sourceType: SkillEvidence['sourceType'], proficiencyScore: number): SkillEvidence => ({
    id: 'ev_' + skillId,
    userId: 'user_1',
    skillId,
    sourceType,
    proficiencyScore,
    confidence: sourceType === 'ASSESSMENT' ? 'HIGH' : 'LOW',
    createdAt: new Date().toISOString()
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockedStore.getRole.mockResolvedValue(role);
    mockedStore.getEvidence.mockResolvedValue([]);
  });

  it('throws when the role does not exist', async () => {
    mockedStore.getRole.mockResolvedValue(undefined);
    await expect(service.calculateGaps('user_1', 'missing')).rejects.toThrow('not found');
  });

  it('reports MAJOR_GAP when there is no evidence at all', async () => {
    mockedStore.getEvidence.mockResolvedValue([]);
    const gaps = await service.calculateGaps('user_1', 'role_junior_backend');
    expect(gaps).toHaveLength(2);
    for (const g of gaps) {
      expect(g.status).toBe('MAJOR_GAP');
      expect(g.demonstratedProficiency).toBe(0);
    }
  });

  it('prioritizes the higher-weighted gap first', async () => {
    mockedStore.getEvidence.mockResolvedValue([]);
    const gaps = await service.calculateGaps('user_1', 'role_junior_backend');
    // nodejs priority = 0.9*0.95*1 = 0.855, docker = 0.6*0.7 = 0.42
    expect(gaps[0].skillId).toBe('skill_nodejs');
  });

  it('halves self-reported proficiency and marks MINOR_GAP/MAINTAIN thresholds', async () => {
    // nodejs self-reported at 0.5 -> effective 0.25 (MAJOR_GAP)
    // docker assessment at 0.8 -> MAINTAIN
    mockedStore.getEvidence.mockResolvedValue([
      evidence('skill_nodejs', 'SELF_REPORTED', 0.5),
      evidence('skill_docker', 'ASSESSMENT', 0.8)
    ]);
    const gaps = await service.calculateGaps('user_1', 'role_junior_backend');
    const nodejs = gaps.find(g => g.skillId === 'skill_nodejs')!;
    const docker = gaps.find(g => g.skillId === 'skill_docker')!;
    expect(nodejs.demonstratedProficiency).toBe(0.25);
    expect(nodejs.status).toBe('MAJOR_GAP');
    expect(docker.status).toBe('MAINTAIN');
  });

  it('prefers ASSESSMENT evidence over SELF_REPORTED for the same skill', async () => {
    mockedStore.getEvidence.mockResolvedValue([
      evidence('skill_nodejs', 'SELF_REPORTED', 0.5),
      evidence('skill_nodejs', 'ASSESSMENT', 0.9)
    ]);
    const gaps = await service.calculateGaps('user_1', 'role_junior_backend');
    const nodejs = gaps.find(g => g.skillId === 'skill_nodejs')!;
    expect(nodejs.demonstratedProficiency).toBe(0.9);
    expect(nodejs.status).toBe('MAINTAIN');
  });
});

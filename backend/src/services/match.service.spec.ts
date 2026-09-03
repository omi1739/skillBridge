import { MatchService } from './match.service';
import { store } from '../store';
import { SkillEvidence, JobListing, Skill } from '@skillbridge/types';

jest.mock('../store', () => ({
  store: {
    getJobs: jest.fn(),
    getSkills: jest.fn(),
    getEvidence: jest.fn(),
    saveJobMatches: jest.fn().mockResolvedValue(undefined)
  }
}));

const mockedStore = store as jest.Mocked<typeof store>;

describe('MatchService', () => {
  const service = new MatchService();

  const skills: Skill[] = [
    { id: 'skill_nodejs', canonicalName: 'Node.js', category: 'Backend', description: '', aliases: [], prerequisites: [] },
    { id: 'skill_postgresql', canonicalName: 'PostgreSQL', category: 'Backend', description: '', aliases: [], prerequisites: [] },
    { id: 'skill_docker', canonicalName: 'Docker', category: 'DevOps', description: '', aliases: [], prerequisites: [] }
  ];

  const job: JobListing = {
    id: 'job_1',
    title: 'Junior Backend Engineer',
    company: 'Acme',
    location: 'Dhaka',
    experienceLevel: 'Junior',
    roleId: 'role_junior_backend',
    description: '',
    requiredSkillIds: ['skill_nodejs', 'skill_postgresql'],
    preferredSkillIds: ['skill_docker'],
    postedAt: new Date().toISOString()
  };

  const evidence = (skillId: string, proficiencyScore: number): SkillEvidence => ({
    id: 'ev_' + skillId,
    userId: 'user_1',
    skillId,
    sourceType: 'ASSESSMENT',
    proficiencyScore,
    confidence: 'HIGH',
    createdAt: new Date().toISOString()
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockedStore.getSkills.mockResolvedValue(skills);
    mockedStore.getJobs.mockResolvedValue([job]);
  });

  it('throws when the job does not exist', async () => {
    mockedStore.getJobs.mockResolvedValue([]);
    await expect(service.matchJob('user_1', 'job_missing')).rejects.toThrow('not found');
  });

  it('scores 100% when all required and preferred skills are fully evidenced', async () => {
    mockedStore.getEvidence.mockResolvedValue([
      evidence('skill_nodejs', 1.0),
      evidence('skill_postgresql', 1.0),
      evidence('skill_docker', 1.0)
    ]);
    const result = await service.matchJob('user_1', 'job_1');
    expect(result.matchScore).toBe(100);
    expect(result.matchedSkills).toHaveLength(3);
    expect(result.missingSkills).toHaveLength(0);

    expect(mockedStore.saveJobMatches).toHaveBeenCalledTimes(1);
    const saved = mockedStore.saveJobMatches.mock.calls[0][1] as any[];
    expect(saved).toHaveLength(1);
    expect(saved[0].job.id).toBe('job_1');
    expect(saved[0].matchScore).toBe(100);
  });

  it('ignores low-proficiency evidence (<= 0.3) and treats the skill as missing', async () => {
    mockedStore.getEvidence.mockResolvedValue([
      evidence('skill_nodejs', 1.0),
      evidence('skill_postgresql', 0.2),
      evidence('skill_docker', 0.5)
    ]);
    const result = await service.matchJob('user_1', 'job_1');
    // total points = 100 + 100 + 50 = 250
    // earned = 100 (nodejs) + 0 (postgres too low) + 25 (docker 0.5*50) = 125
    expect(result.matchScore).toBe(50);
    expect(result.missingSkills.map(m => m.skillId)).toContain('skill_postgresql');
  });

  it('computes a partial score when only required skills are met', async () => {
    mockedStore.getEvidence.mockResolvedValue([
      evidence('skill_nodejs', 0.8),
      evidence('skill_postgresql', 0.6)
    ]);
    const result = await service.matchJob('user_1', 'job_1');
    // earned = 80 + 60 = 140 of 250
    expect(result.matchScore).toBe(56);
  });

  it('sorts matches by descending score in matchAllJobs', async () => {
    mockedStore.getEvidence.mockResolvedValue([]);
    const jobs: JobListing[] = [
      { ...job, id: 'job_a', requiredSkillIds: ['skill_nodejs'], preferredSkillIds: [] },
      { ...job, id: 'job_b', requiredSkillIds: ['skill_nodejs', 'skill_postgresql'], preferredSkillIds: ['skill_docker'] }
    ];
    mockedStore.getJobs.mockResolvedValue(jobs);
    const results = await service.matchAllJobs('user_1');
    expect(results[0].matchScore).toBeGreaterThanOrEqual(results[1].matchScore);
  });
});

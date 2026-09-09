import { CurriculumService } from './curriculum.service';
import { store } from '../store';
import { Role, CurriculumProfile } from '@skillbridge/types';

jest.mock('../store', () => ({
  store: { getRole: jest.fn() }
}));

const mockedStore = store as jest.Mocked<typeof store>;

const testRole: Role = {
  id: 'role_full_stack',
  slug: 'full-stack',
  title: 'Full-Stack Engineer',
  category: 'ENGINEERING',
  description: 'Full-stack engineering',
  marketContext: {
    region: 'Bangladesh',
    experienceLevel: 'Entry/Mid',
    typicalTitles: ['Full-Stack Developer']
  },
  roleSkills: [
    {
      skillId: 'skill_javascript',
      required: true,
      roleWeight: 0.5,
      marketDemandFrequency: 0.8,
      proficiencyTarget: 'Intermediate'
    }
  ]
};

const testCurriculum: CurriculumProfile = {
  id: 'curr_bsc_cse',
  institutionName: 'B.Sc. CSE (Test)',
  type: 'UNIVERSITY_DEGREE',
  coverageAreas: [
    {
      skillId: 'skill_javascript',
      canonicalName: 'JavaScript',
      academicEmphasis: 'HIGH',
      practicalHoursEstimate: 120,
      syllabusTopics: ['DOM', 'Async JS', 'ES6']
    }
  ]
};

describe('CurriculumService', () => {
  const service = new CurriculumService();

  beforeEach(() => {
    jest.clearAllMocks();
    mockedStore.getRole.mockResolvedValue(testRole);
    (service as any).curricula = [];
  });

  describe('analyzeCurriculum', () => {
    it('returns a graceful empty result instead of throwing when no curriculum is loaded', async () => {
      const result = await service.analyzeCurriculum('curr_bsc_cse', 'role_full_stack');

      expect(result).toEqual({
        institution: 'No curriculum loaded',
        targetRole: 'Full-Stack Engineer',
        marketAlignmentScore: 0,
        strongAcademicAreas: [],
        criticalMarketOmissions: [],
        summaryAnalysis: expect.any(String)
      });
    });

    it('returns a graceful empty result when the role is missing or has no skills', async () => {
      mockedStore.getRole.mockResolvedValue(undefined as any);

      (service as any).curricula = [testCurriculum];
      const result = await service.analyzeCurriculum('curr_bsc_cse', 'role_full_stack');

      expect(result.marketAlignmentScore).toBe(0);
      expect(result.strongAcademicAreas).toEqual([]);
      expect(result.criticalMarketOmissions).toEqual([]);
      expect(result.summaryAnalysis).toEqual(expect.any(String));
    });

    it('computes a real analysis when both curriculum and role data exist', async () => {
      (service as any).curricula = [testCurriculum];
      const result = await service.analyzeCurriculum('curr_bsc_cse', 'role_full_stack');

      expect(result.institution).toBe('B.Sc. CSE (Test)');
      expect(result.targetRole).toBe('Full-Stack Engineer');
      expect(result.marketAlignmentScore).toBe(100);
      expect(result.strongAcademicAreas).toHaveLength(1);
      expect(result.criticalMarketOmissions).toHaveLength(0);
    });
  });
});
import { BadRequestException } from '@nestjs/common';
import { AssessmentsService } from './assessments.service';

jest.mock('../../db/client', () => ({
  query: jest.fn(),
  withTransaction: jest.fn(async <T>(fn: (client: any) => Promise<T>): Promise<T> => fn({ query: jest.fn() })),
  testConnection: jest.fn(async () => true)
}));

jest.mock('../../store', () => ({
  store: {
    getAssessment: jest.fn(),
    getAssessments: jest.fn(),
    saveAttempt: jest.fn(),
    saveEvidence: jest.fn(),
    getTargetRoleId: jest.fn(async () => 'role_junior_backend')
  }
}));

jest.mock('../../services/gap.service', () => ({
  gapService: { calculateGaps: jest.fn(async () => []) }
}));

import { query } from '../../db/client';
import { store } from '../../store';

const mockQuery = query as jest.MockedFunction<typeof query>;
const mockSaveAttempt = (store.saveAttempt as unknown) as jest.Mock;

describe('AssessmentsService legacy time-limit enforcement', () => {
  let service: AssessmentsService;

  const seedQuery = () => {
    mockQuery.mockImplementation(async (text: string, params?: unknown[]) => {
      const sql = String(text);
      if (sql.includes('assessment_attempts') && sql.trimStart().toUpperCase().startsWith('SELECT')) {
        return [
          {
            id: 'att_test',
            started_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
            status: 'IN_PROGRESS'
          }
        ];
      }
      return [];
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AssessmentsService();
    seedQuery();
  });

  it('rejects a submission when no attempt was started', async () => {
    mockQuery.mockImplementation(async () => []);
    await expect(
      service.submitAssessment('assessment_backend_diagnostic', 'demo_user_01', [])
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.submitAssessment('assessment_backend_diagnostic', 'demo_user_01', [])
    ).rejects.toThrow(/not started yet/i);
  });

  it('grades a submission inside the time window using the server-started attempt', async () => {
    const result = await service.submitAssessment('assessment_backend_diagnostic', 'demo_user_01', []);
    expect(result.attempt.id).toBe('att_test');
    expect(result.attempt.status).toBe('COMPLETED');
    expect(mockSaveAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'att_test', userId: 'demo_user_01', assessmentId: 'assessment_backend_diagnostic' })
    );
  });

  it('marks the attempt ABANDONED and rejects when the time limit has elapsed', async () => {
    mockQuery.mockImplementation(async (text: string) => {
      const sql = String(text);
      if (sql.includes('assessment_attempts') && sql.trimStart().toUpperCase().startsWith('SELECT')) {
        return [
          {
            id: 'att_stale',
            started_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
            status: 'IN_PROGRESS'
          }
        ];
      }
      return [];
    });
    await expect(
      service.submitAssessment('assessment_backend_diagnostic', 'demo_user_01', [])
    ).rejects.toThrow(/expired/i);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("status = 'ABANDONED'"),
      expect.any(Array)
    );
    expect(mockSaveAttempt).not.toHaveBeenCalled();
  });

  it('startAssessment records an IN_PROGRESS row and reports the limit', async () => {
    mockQuery.mockImplementation(async () => []);
    const start = await service.startAssessment('assessment_backend_diagnostic', 'demo_user_01');
    expect(start.timeLimitMinutes).toBe(15);
    expect(start.attemptId).toMatch(/^att_/);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('IN_PROGRESS'),
      expect.any(Array)
    );
  });
});
import {
  DEFAULT_JOB_MAX_AGE_DAYS,
  isJobFresh,
  jobFreshnessCutoff,
  jobMaxAgeDays
} from './job-freshness';

describe('job freshness', () => {
  const now = new Date('2026-10-31T12:00:00.000Z');

  it('defaults to three days', () => {
    expect(DEFAULT_JOB_MAX_AGE_DAYS).toBe(3);
    expect(jobMaxAgeDays({})).toBe(3);
  });

  it('prefers JOB_MAX_AGE_DAYS and falls back to JOB_RETENTION_DAYS', () => {
    expect(jobMaxAgeDays({ JOB_MAX_AGE_DAYS: '5', JOB_RETENTION_DAYS: '14' } as NodeJS.ProcessEnv)).toBe(5);
    expect(jobMaxAgeDays({ JOB_RETENTION_DAYS: '2' } as NodeJS.ProcessEnv)).toBe(2);
  });

  it('clamps invalid or out-of-range values', () => {
    expect(jobMaxAgeDays({ JOB_MAX_AGE_DAYS: '0' } as NodeJS.ProcessEnv)).toBe(1);
    expect(jobMaxAgeDays({ JOB_MAX_AGE_DAYS: '999' } as NodeJS.ProcessEnv)).toBe(365);
    expect(jobMaxAgeDays({ JOB_MAX_AGE_DAYS: 'not-a-number' } as NodeJS.ProcessEnv)).toBe(3);
  });

  it('computes the cutoff from the posting date', () => {
    expect(jobFreshnessCutoff(3, now).toISOString()).toBe('2026-10-28T12:00:00.000Z');
  });

  it('treats recent dates as fresh and old/missing dates appropriately', () => {
    expect(isJobFresh('2026-10-30T12:00:00.000Z', 3, now)).toBe(true);
    expect(isJobFresh('2026-10-27T12:00:00.000Z', 3, now)).toBe(false);
    // Missing or invalid source dates are stamped with the ingest time.
    expect(isJobFresh(undefined, 3, now)).toBe(true);
    expect(isJobFresh('not-a-date', 3, now)).toBe(true);
  });
});

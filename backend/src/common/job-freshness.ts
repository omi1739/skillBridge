/**
 * A job posting is only useful while it is fresh. The product rule is three
 * days from the posting date (falling back to the ingest timestamp when the
 * source did not provide one), so the API, ingestion and retention sweep all
 * share this single setting.
 */
export const DEFAULT_JOB_MAX_AGE_DAYS = 3;
const MAX_JOB_MAX_AGE_DAYS = 365;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Resolve the freshness window in days. `JOB_MAX_AGE_DAYS` is the canonical
 * setting; `JOB_RETENTION_DAYS` remains supported so existing deployments and
 * scripts keep working during the migration.
 */
export function jobMaxAgeDays(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.JOB_MAX_AGE_DAYS ?? env.JOB_RETENTION_DAYS;
  const parsed = Number(raw);
  if (!raw || !Number.isFinite(parsed)) return DEFAULT_JOB_MAX_AGE_DAYS;
  return Math.min(MAX_JOB_MAX_AGE_DAYS, Math.max(1, Math.round(parsed)));
}

export function jobFreshnessCutoff(
  days: number = jobMaxAgeDays(),
  now: Date = new Date()
): Date {
  return new Date(now.getTime() - days * DAY_MS);
}

/**
 * True when a source-provided posting date is still inside the freshness
 * window. Missing or unparseable dates are treated as fresh: ingestion stamps
 * them with the current time, and rejecting them would silently drop valid
 * listings that simply omit a date.
 */
export function isJobFresh(
  value: string | Date | null | undefined,
  days: number = jobMaxAgeDays(),
  now: Date = new Date()
): boolean {
  if (!value) return true;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return true;
  return date.getTime() >= jobFreshnessCutoff(days, now).getTime();
}

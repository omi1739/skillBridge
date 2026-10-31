import 'reflect-metadata';
import { endAllPools } from '../db/client';
import { store } from '../store';
import { jobMaxAgeDays } from '../common/job-freshness';

/**
 * Repeatable retention command. Deletes every posting outside the shared
 * freshness window (three days by default) without waiting for the next
 * scheduled ingestion run. Safe to run at any time.
 */
async function main(): Promise<void> {
  const days = jobMaxAgeDays();
  const deleted = await store.pruneStaleJobs(days);
  console.log(`[prune-jobs] deleted ${deleted} posting(s) older than ${days} day(s).`);
}

main()
  .catch(err => {
    console.error('[prune-jobs] failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await endAllPools();
  });

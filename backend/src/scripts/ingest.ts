import 'reflect-metadata';
import { IngestionService } from '../modules/ingestion/ingestion.service';
import { CacheService } from '../common/cache.service';
import { endAllPools } from '../db/client';

async function main() {
  const service = new IngestionService(new CacheService());
  const requested = (process.env.JOB_INGEST_SOURCE || process.argv[2] || 'all').trim().toLowerCase();
  const sources = requested === 'all' ? ['arbeitnow', 'bdjobs'] : [requested];
  const minMatches = process.env.JOB_MIN_MATCHES ? Number(process.env.JOB_MIN_MATCHES) : 1;

  const reports = [];
  for (const source of sources) {
    const report = await service.ingest({ minMatches, source });
    reports.push(report);
  }

  console.log(JSON.stringify(reports.length === 1 ? reports[0] : reports, null, 2));
}

if (require.main === module) {
  main()
    .then(async () => {
      await endAllPools();
      process.exit(0);
    })
    .catch(async err => {
       
      console.error('[Ingest] failed:', err);
      await endAllPools();
      process.exit(1);
    });
}

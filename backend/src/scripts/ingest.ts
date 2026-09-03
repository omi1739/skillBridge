import 'reflect-metadata';
import { IngestionService } from '../modules/ingestion/ingestion.service';
import { CacheService } from '../common/cache.service';
import { pool } from '../db/client';

async function main() {
  const service = new IngestionService(new CacheService());
  const report = await service.ingest({
    minMatches: process.env.JOB_MIN_MATCHES ? Number(process.env.JOB_MIN_MATCHES) : 1,
    source: process.env.JOB_INGEST_SOURCE || process.argv[2] || 'arbeitnow'
  });
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(report, null, 2));
}

if (require.main === module) {
  main()
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async err => {
      // eslint-disable-next-line no-console
      console.error('[Ingest] failed:', err);
      await pool.end();
      process.exit(1);
    });
}

import 'reflect-metadata';
import { query, withTransaction, endAllPools } from '../db/client';
import { htmlToText } from '../common/text';

interface JobTextRow {
  id: string;
  title: string;
  company: string;
  location: string | null;
  description: string;
}

/**
 * One-off / repeatable repair for job rows ingested before HTML sanitization
 * was added. Safe to run multiple times: rows that are already clean are left
 * untouched.
 */
async function main(): Promise<void> {
  const rows = await query<JobTextRow>(
    `SELECT id, title, company, location, description FROM jobs ORDER BY id`
  );

  let updated = 0;
  await withTransaction(async client => {
    for (const row of rows) {
      const title = htmlToText(row.title, 300);
      const company = htmlToText(row.company, 200);
      const location = htmlToText(row.location, 200);
      const description = htmlToText(row.description, 4000);

      if (
        title === row.title &&
        company === row.company &&
        location === (row.location || '') &&
        description === row.description
      ) {
        continue;
      }

      await client.query(
        `UPDATE jobs
            SET title = $2, company = $3, location = $4, description = $5
          WHERE id = $1`,
        [row.id, title, company, location, description]
      );
      updated++;
    }
  });

  console.log(`[sanitize-jobs] cleaned ${updated} of ${rows.length} job rows.`);
}

main()
  .catch(err => {
    console.error('[sanitize-jobs] failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await endAllPools();
  });

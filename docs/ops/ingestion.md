# Live Job Ingestion Runbook

SkillBridge does **not** run a permanent scraper inside the web API. The API only
reads whatever is already in Postgres/Supabase. A separate batch command fetches
public job feeds, classifies them, upserts them, and recomputes market demand.

```text
Scheduler (GitHub Actions or Render cron)
  -> npm run db:ingest --workspace=@skillbridge/api all
     -> Arbeitnow API (international)
     -> BdJobs JSON API (Bangladesh)
     -> classify + dedupe + upsert into Supabase
     -> recompute role_skills.market_demand_frequency
        -> /api/stats
        -> /api/market/demand
        -> /api/jobs
```

## Schedule options

### Option A - GitHub Actions (free)

`.github/workflows/ingest.yml` runs every 8 hours and can also be started
manually.

1. In GitHub, open **Settings -> Secrets and variables -> Actions**.
2. Create a repository secret named `SUPABASE_DATABASE_URL`.
3. Paste the Supabase Postgres connection string (the same one used by the API
   service). Use the direct/session connection string, not the anon API key.
4. Push the workflow to the default branch.
5. Test it: **Actions -> Scheduled job ingestion -> Run workflow**.

The workflow builds the API and runs:

```bash
npm run db:ingest --workspace=@skillbridge/api all
```

### Option B - Render cron (paid)

Render cron jobs require paid compute; the `plan: free` value in `render.yaml`
is not valid for a cron service. If you prefer Render:

1. Change the cron service plan to a paid plan.
2. Make sure its `DATABASE_URL` is the **same Supabase connection string** as the
   web service. `sync: false` means the value must be set per service in the
   Render dashboard.
3. Keep the schedule at `0 */8 * * *` and the start command at
   `npm run db:ingest --workspace=@skillbridge/api all`.

Do not run both schedulers unless you want duplicate ingestion. The ingestion
code uses a Postgres advisory lock, so overlapping runs skip rather than
corrupt data, but duplicate runs still waste build minutes.

## Manual run

From the repository root, with the production `DATABASE_URL` available:

```bash
npm run build --workspace=@skillbridge/api
npm run db:ingest --workspace=@skillbridge/api all
```

On Windows PowerShell, use `npm.cmd` if script execution is disabled:

```powershell
npm.cmd run db:ingest --workspace=@skillbridge/api all
```

An admin can also trigger a run through `POST /api/ingest/run` after signing in.

## Verify

```sql
SELECT COUNT(*) FROM jobs;
SELECT COUNT(*) FROM job_sources;
SELECT source, status, fetched, classified, inserted, updated, total_jobs,
       started_at, finished_at
FROM job_ingest_runs
ORDER BY started_at DESC
LIMIT 5;
```

Then check:

```text
GET /api/stats           -> jobPostings > 0, validationPercent > 0
GET /api/market/demand   -> totalJobs > 0, lastIngestedAt is not null
GET /api/ingest/sources  -> one entry per source
GET /api/health/ingest   -> status = "ok", recent lastSuccessAt
```

## Description cleanup

Job-board descriptions arrive as a mix of plain text, HTML and double-encoded
HTML. Ingestion converts them to readable plain text before writing, and the API
sanitizes again on read so old rows cannot leak markup into the UI.

To repair rows that were ingested before this cleanup was added:

```bash
npm run db:sanitize-jobs
```

The command is idempotent and only updates rows whose text actually changed.

## Retention

`job_ingest_runs` and `job_sources` are the audit trail. Jobs are refreshed on
each run; the retention sweep expires postings after `JOB_EXPIRE_DAYS` (default
7) and hard-deletes them after `JOB_RETENTION_DAYS` (default 14). A missed run
therefore starts removing stale listings after a week.

## Known limitations

- Role assignment is keyword-based: explicit frontend/back-end/full-stack
  titles win, otherwise the role with the closest skill overlap is used.
- Technical pre-sales titles (solutions engineer, sales engineer, solution
  architect) are rejected even when their descriptions mention dev skills.
- BdJobs has a low classification yield because its list response is sparse and
  only engineering-titled rows are enriched with details.
- The classifier is keyword-based, not an LLM or a formal role taxonomy.

Improving classifier yield and expanding the skill taxonomy are the next steps
for broader market coverage. The homepage demand snapshot is driven by
`GET /api/market/demand` and updates after every ingestion run.

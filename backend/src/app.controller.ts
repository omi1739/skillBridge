import { Controller, Get } from '@nestjs/common';
import { query, testConnection } from './db/client';

@Controller()
export class AppController {
  @Get('health')
  getHealth() {
    // Deliberately DB-free: Render polls this endpoint continuously, and a DB
    // probe on every ping keeps the Neon compute awake 24/7, exhausting the
    // free-tier compute-hour quota purely from monitoring. Use /api/health/db
    // for an explicit database probe instead.
    return {
      status: 'ok',
      service: 'skillbridge-api',
      framework: 'nestjs',
      version: '2.0.0',
      timestamp: new Date().toISOString()
    };
  }

  @Get('health/db')
  async getDbHealth() {
    const dbOk = await testConnection().catch(() => false);
    const dbStatus = dbOk ? 'connected' : 'unreachable';
    return {
      status: dbOk ? 'ok' : 'error',
      service: 'skillbridge-api',
      framework: 'nestjs',
      version: '2.0.0',
      database: dbStatus,
      timestamp: new Date().toISOString()
    };
  }

  @Get('health/ingest')
  async getIngestHealth() {
    const staleAfterHours = Math.max(1, Number(process.env.INGEST_STALE_HOURS || 12));
    try {
      const [last] = await query<{ last_success: string | null }>(
        `SELECT MAX(finished_at)::text AS last_success
           FROM job_ingest_runs
          WHERE status = 'success'`
      );
      const [counts] = await query<{ jobs: string }>('SELECT COUNT(*)::text AS jobs FROM jobs');
      const lastSuccessAt = last.last_success;
      const ageHours = lastSuccessAt
        ? (Date.now() - new Date(lastSuccessAt).getTime()) / 3_600_000
        : null;
      const stale = ageHours === null || ageHours > staleAfterHours;

      return {
        status: stale ? 'stale' : 'ok',
        jobs: Number(counts.jobs),
        lastSuccessAt,
        ageHours: ageHours === null ? null : Number(ageHours.toFixed(1)),
        staleAfterHours,
        timestamp: new Date().toISOString()
      };
    } catch (err) {
      return {
        status: 'error',
        jobs: 0,
        lastSuccessAt: null,
        error: (err as Error).message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

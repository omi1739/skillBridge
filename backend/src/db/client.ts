import * as path from 'path';
import { Pool, PoolClient } from 'pg';

// Load .env from the API workspace directory (Node 22+)
try {
  const envPath = path.resolve(__dirname, '../../.env');
  (process as any).loadEnvFile?.(envPath);
} catch {
  // .env not present - rely on process env
}

function resolveDatabaseUrl(): string {
  const fromEnv = process.env.DATABASE_URL;
  if (fromEnv) {
    return fromEnv;
  }
  // Fallback local default (matches .env.example)
  return 'postgresql://postgres:postgrespassword@localhost:5432/skillbridge';
}

function resolveSslConfig(databaseUrl: string): boolean | { rejectUnauthorized: true } {
  const sslMode = (databaseUrl.match(/[?&]sslmode=([^&]+)/) || [])[1] || '';
  const wantsSsl = ['require', 'verify-ca', 'verify-full', 'prefer'].includes(sslMode) || databaseUrl.includes('neon.tech');
  if (!wantsSsl) {
    return false;
  }
  // Never disable certificate verification. 'sslmode=require' is satisfied
  // with encrypted transport while still validating the server certificate
  // against the system trust store (node-postgres default behavior).
  return { rejectUnauthorized: true };
}

function makePool(connectionString: string): Pool {
  return new Pool({
    connectionString,
    ssl: resolveSslConfig(connectionString),
    // Neon (and serverless Postgres generally) enforces hard connection caps per
    // project; a bloated default pool (10) can trip them when the API service and
    // the scheduled ingestion cron boot together. Keep it modest, give up on a
    // client quickly instead of stacking blocked connections, and recycle idle
    // ones so the slot is released back to the project.
    max: 5,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000
  });
}

/**
 * Infra-level database outage. Anything that means "this project is not
 * reachable right now" (Neon pauses a project when its monthly compute-hour
 * quota is exhausted, which the driver surfaces as error 53000 / "exceeded
 * the quota"), or a transport failure. Ordinary SQL errors (duplicate key,
 * constraint violations, bad casts) are NOT outages and must not trigger a
 * failover.
 */
const DOWN_CODES = new Set([
  '53000', // Neon "exceeded the quota for compute hours" / project paused
  '57P01', // admin_shutdown
  '57P02', // crash_shutdown
  '57P03', // cannot_connect_now (restarting/starting up)
  '58000', // system_error
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'EPIPE',
  'PROTOCOL_CONNECTION_LOST'
]);
const DOWN_MESSAGE = /quota|exceeded|paused|suspend|too many connections|connection refused|name not resolved|no response make sure|temporarily unavailable/i;

export function isDbDownError(err: unknown): boolean {
  const e = err as { code?: string; message?: string } | null;
  if (!e) return false;
  if (e.code && DOWN_CODES.has(e.code)) return true;
  if (typeof e.message === 'string' && DOWN_MESSAGE.test(e.message)) return true;
  return false;
}

// Primary database. Every deployment must have one. Optional second database
// (DATABASE_URL_FALLBACK) is a full failover target: when the primary reports
// a down error the router retries once on the fallback, and a periodic probe
// restores the primary as soon as it is reachable again.
export const pool = makePool(resolveDatabaseUrl());
const fallbackUrl = process.env.DATABASE_URL_FALLBACK;
export const fallbackPool: Pool | null = fallbackUrl ? makePool(fallbackUrl) : null;

pool.on('error', (err: Error) => {
  console.error('[SkillBridge DB][primary] Unexpected error on idle client', err);
});
fallbackPool?.on('error', (err: Error) => {
  console.error('[SkillBridge DB][fallback] Unexpected error on idle client', err);
});

let activeIsPrimary = true;

export function getConfiguredPools(): Pool[] {
  return fallbackPool ? [pool, fallbackPool] : [pool];
}

function activePool(): Pool {
  return activeIsPrimary ? pool : (fallbackPool ?? pool);
}

async function runWithRetry<T>(fn: (p: Pool) => Promise<T>): Promise<T> {
  const target = activePool();
  try {
    return await fn(target);
  } catch (err) {
    if (isDbDownError(err) && fallbackPool && activeIsPrimary) {
      activeIsPrimary = false;
      console.warn('[SkillBridge DB] Primary database unavailable; failed over to fallback.', err as Error);
      return await fn(fallbackPool);
    }
    throw err;
  }
}

export async function queryOn<T = any>(
  target: Pool,
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const res = await target.query(text, params);
  return res.rows as T[];
}

export async function withTransactionOn<T>(
  target: Pool,
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await target.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function query<T = any>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  return runWithRetry(p => queryOn(p, text, params));
}

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  return runWithRetry(p => withTransactionOn(p, fn));
}

export async function testConnection(): Promise<boolean> {
  try {
    await query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

const PROBE_INTERVAL_MS = Number(process.env.DB_FAILOVER_PROBE_INTERVAL_MS) || 60_000;
let probeTimer: ReturnType<typeof setInterval> | null = null;

async function probeDatabases(): Promise<void> {
  let primaryUp = false;
  try {
    await pool.query('SELECT 1');
    primaryUp = true;
  } catch {
    // primary unreachable
  }

  if (primaryUp) {
    if (!activeIsPrimary) {
      activeIsPrimary = true;
      console.log('[SkillBridge DB] Primary database recovered; switched back to primary.');
    }
    return;
  }

  if (fallbackPool && activeIsPrimary) {
    try {
      await fallbackPool.query('SELECT 1');
      activeIsPrimary = false;
      console.warn('[SkillBridge DB] Primary unavailable; switched to fallback database.');
    } catch {
      // both unreachable - keep primary selected so failures surface normally
    }
  }
}

export function startFailoverProbe(): void {
  if (probeTimer) return;
  void probeDatabases();
  probeTimer = setInterval(probeDatabases, PROBE_INTERVAL_MS);
  probeTimer.unref?.();
}

export function stopFailoverProbe(): void {
  if (probeTimer) {
    clearInterval(probeTimer);
    probeTimer = null;
  }
}

export async function endAllPools(): Promise<void> {
  stopFailoverProbe();
  await Promise.all(getConfiguredPools().map(p => p.end().catch(() => undefined)));
}

export { PoolClient };
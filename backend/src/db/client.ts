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

export const pool = new Pool({
  connectionString: resolveDatabaseUrl(),
  ssl: resolveSslConfig(resolveDatabaseUrl())
});

pool.on('error', err => {
  console.error('[SkillBridge DB] Unexpected error on idle client', err);
});

export async function query<T = any>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const res = await pool.query(text, params);
  return res.rows as T[];
}

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
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

export async function testConnection(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (err) {
    return false;
  }
}

export { PoolClient };

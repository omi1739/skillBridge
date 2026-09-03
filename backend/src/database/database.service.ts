import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PoolClient } from 'pg';
import { pool, query, withTransaction, testConnection } from '../db/client';
import { applySchema, seedAll } from '../db/seed';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);

  async onModuleInit() {
    const ok = await testConnection();
    if (!ok) {
      this.logger.warn('Initial database ping check failed. Check DATABASE_URL in .env.');
      return;
    }
    this.logger.log('Connected to Neon PostgreSQL database.');

    // Self-initialize on boot so a fresh deploy comes up without a manual
    // db:setup. Both are idempotent (CREATE TABLE IF NOT EXISTS + UPSERTs).
    // Disable with AUTO_INIT_DB=false (e.g. when a migration tool owns the schema).
    if ((process.env.AUTO_INIT_DB ?? 'true') !== 'false') {
      try {
        await applySchema();
        await seedAll();
        this.logger.log('Database schema + seed applied on boot (idempotent).');
      } catch (err) {
        this.logger.error(`Auto database initialization failed: ${(err as Error).message}`);
        throw err;
      }
    }
  }

  async onModuleDestroy() {
    await pool.end();
  }

  query<T = any>(text: string, params?: unknown[]): Promise<T[]> {
    return query<T>(text, params);
  }

  withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    return withTransaction<T>(fn);
  }
}

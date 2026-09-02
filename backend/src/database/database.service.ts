import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PoolClient } from 'pg';
import { pool, query, withTransaction, testConnection } from '../db/client';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);

  async onModuleInit() {
    const ok = await testConnection();
    if (ok) {
      this.logger.log('Connected to Neon PostgreSQL database.');
    } else {
      this.logger.warn('Initial database ping check failed. Check DATABASE_URL in .env.');
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

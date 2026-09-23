import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PoolClient } from 'pg';
import {
  query,
  withTransaction,
  testConnection,
  getConfiguredPools,
  startFailoverProbe,
  stopFailoverProbe,
  endAllPools
} from '../db/client';
import { applySchema, seedAll } from '../db/seed';
import { store } from '../store';
import { restoreDynamicChallenges } from '../services/challenge-generator.service';

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
        this.logger.warn(`Auto database initialization skipped/warn: ${(err as Error).message}`);
      }
    }

    // Warm up any secondary database configured via DATABASE_URL_FALLBACK so a
    // failover finds a ready schema + seed instead of an empty project. If the
    // primary was already down, the routed applySchema/seedAll above ran against
    // the fallback and this loop targets the (unreachable) primary, which fails
    // gracefully below.
    const pools = getConfiguredPools();
    if (pools.length > 1) {
      for (const target of pools.slice(1)) {
        try {
          await applySchema(target);
          await seedAll(target);
          this.logger.log('Standby database schema + seed applied (failover ready).');
        } catch (err) {
          this.logger.warn(`Standby database warm-up skipped: ${(err as Error).message}`);
        }
      }
    }

    startFailoverProbe();

    // Rehydrate sandbox challenges persisted in a previous run so generated
    // challenges stay runnable across restarts. Also best-effort: a DB failure
    // here just means this boot starts with only the in-memory + offline bank.
    try {
      const persisted = await store.getSandboxChallenges();
      const restored = restoreDynamicChallenges(persisted);
      if (restored > 0) {
        this.logger.log(`Rehydrated ${restored} persisted sandbox challenge(s).`);
      }
    } catch (err) {
      this.logger.warn(`Sandbox challenge rehydration skipped: ${(err as Error).message}`);
    }
  }

  async onModuleDestroy() {
    await endAllPools();
  }

  query<T = any>(text: string, params?: unknown[]): Promise<T[]> {
    return query<T>(text, params);
  }

  withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    return withTransaction<T>(fn);
  }
}

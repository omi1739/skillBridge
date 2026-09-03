import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

interface MemoryEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Optional cache abstraction used to put a Redis caching layer in front of
 * the most-read endpoints (e.g. landing stats). If REDIS_URL is not configured
 * it transparently falls back to a short-lived in-memory cache so local/dev
 * (and the test suite) still work without a Redis server.
 */
@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly client: Redis | null = null;
  private readonly memory = new Map<string, MemoryEntry<unknown>>();
  private readonly DEFAULT_TTL = 60;

  constructor() {
    const url = process.env.REDIS_URL;
    if (url) {
      try {
        this.client = new Redis(url, {
          lazyConnect: true,
          enableOfflineQueue: false,
          maxRetriesPerRequest: 1
        });
        this.client.on('error', (err) =>
          this.logger.warn(`Redis unavailable, using in-memory cache: ${err.message}`)
        );
      } catch (err) {
        this.logger.warn(`Failed to initialise Redis (${(err as Error).message}); using in-memory cache.`);
      }
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.client) {
      try {
        const raw = await this.client.get(key);
        return raw == null ? null : (JSON.parse(raw) as T);
      } catch {
        return null;
      }
    }
    const entry = this.memory.get(key) as MemoryEntry<T> | undefined;
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.memory.delete(key);
      return null;
    }
    return entry.value;
  }

  async set<T>(key: string, value: T, ttlSeconds: number = this.DEFAULT_TTL): Promise<void> {
    if (this.client) {
      try {
        await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
      } catch {
        // fall back to memory below
        this.writeMemory(key, value, ttlSeconds);
      }
      return;
    }
    this.writeMemory(key, value, ttlSeconds);
  }

  async del(key: string): Promise<void> {
    if (this.client) {
      try {
        await this.client.del(key);
      } catch {
        /* no-op */
      }
    }
    this.memory.delete(key);
  }

  private writeMemory<T>(key: string, value: T, ttlSeconds: number): void {
    this.memory.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  async onModuleDestroy() {
    if (this.client) {
      try {
        await this.client.quit();
      } catch {
        /* no-op */
      }
    }
  }
}

import { CacheService } from './cache.service';

describe('CacheService (in-memory fallback, no REDIS_URL)', () => {
  let cache: CacheService;

  beforeEach(() => {
    delete process.env.REDIS_URL;
    cache = new CacheService();
  });

  it('returns null for a missing key', async () => {
    await expect(cache.get('nope')).resolves.toBeNull();
  });

  it('stores and returns a value', async () => {
    await cache.set('k', { jobPostings: 5 });
    await expect(cache.get('k')).resolves.toEqual({ jobPostings: 5 });
  });

  it('expires a value at or after its TTL', async () => {
    await cache.set('k', 42, 0);
    await expect(cache.get('k')).resolves.toBeNull();
  });

  it('deletes a value', async () => {
    await cache.set('k', 42);
    await cache.del('k');
    await expect(cache.get('k')).resolves.toBeNull();
  });
});

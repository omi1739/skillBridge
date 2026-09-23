// Failover router tests for db/client. 'pg' is fully mocked so no real
// connection is attempted; the module under test is required lazily (after the
// environment is seeded) because Pool instances are created at import time and
// hold module-level failover state, so each scenario reloads a fresh copy.
jest.mock('pg', () => {
  const MockPool = jest.fn().mockImplementation(() => ({
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn(async () => undefined),
    on: jest.fn()
  }));
  return { Pool: MockPool };
});

describe('db/client failover', () => {
  let client: any;

  const quotaError = Object.assign(new Error('quota exceeded for compute hours'), {
    code: '53000'
  });
  const sqlError = Object.assign(new Error('duplicate key value'), { code: '23505' });
  const connectionError = Object.assign(new Error('connect ECONNREFUSED'), {
    code: 'ECONNREFUSED'
  });

  const loadClient = () => {
    let loaded: any;
    jest.isolateModules(() => {
      loaded = require('./client');
    });
    return loaded;
  };
  const waitNextTick = () => new Promise(resolve => setImmediate(resolve));

  beforeAll(() => {
    process.env.DATABASE_URL = 'postgresql://user:pw@primary-test/db';
    process.env.DATABASE_URL_FALLBACK = 'postgresql://user:pw@fallback-test/db';
    delete process.env.DB_FAILOVER_PROBE_INTERVAL_MS;
    client = loadClient();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterAll(() => {
    (console.log as jest.Mock).mockRestore();
    (console.warn as jest.Mock).mockRestore();
    (console.error as jest.Mock).mockRestore();
  });

  afterEach(() => {
    client.stopFailoverProbe();
  });

  describe('isDbDownError', () => {
    it('flags Neon quota/pause and transport errors', () => {
      expect(client.isDbDownError(quotaError)).toBe(true);
      expect(client.isDbDownError(connectionError)).toBe(true);
      expect(
        client.isDbDownError(new Error('project has been paused, resume it at https://console.neon.tech'))
      ).toBe(true);
    });

    it('ignores ordinary SQL errors', () => {
      expect(client.isDbDownError(sqlError)).toBe(false);
      expect(client.isDbDownError(new Error('syntax error at or near "x"'))).toBe(false);
      expect(client.isDbDownError(null)).toBe(false);
      expect(client.isDbDownError(undefined)).toBe(false);
    });
  });

  it('retries a query on the fallback once when the primary reports an outage', async () => {
    client = loadClient();
    client.pool.query.mockRejectedValueOnce(quotaError);
    client.fallbackPool.query.mockResolvedValueOnce({ rows: [{ ok: true }] });

    const rows = await client.query('SELECT value FROM config');

    expect(rows).toEqual([{ ok: true }]);
    expect(client.pool.query).toHaveBeenCalledTimes(1);
    expect(client.fallbackPool.query).toHaveBeenCalledTimes(1);
  });

  it('keeps serving from the fallback until the primary recovers', async () => {
    client = loadClient();
    client.pool.query.mockRejectedValueOnce(quotaError);
    client.fallbackPool.query.mockResolvedValueOnce({ rows: [{ a: 1 }] });
    await client.query('SELECT 1');

    client.fallbackPool.query.mockResolvedValueOnce({ rows: [{ b: 2 }] });
    const second = await client.query('SELECT 2');

    expect(second).toEqual([{ b: 2 }]);
    expect(client.pool.query).toHaveBeenCalledTimes(1);
  });

  it('switches back to the primary when a probe succeeds', async () => {
    client = loadClient();
    client.pool.query.mockRejectedValueOnce(quotaError);
    client.fallbackPool.query.mockResolvedValueOnce({ rows: [{ ok: true }] });
    await client.query('SELECT 1');

    client.pool.query.mockResolvedValue({ rows: [{ '?column?': 1 }] });
    client.startFailoverProbe();
    await waitNextTick();
    client.stopFailoverProbe();

    client.pool.query.mockResolvedValueOnce({ rows: [{ primary: true }] });
    const rows = await client.query('SELECT who');

    expect(rows).toEqual([{ primary: true }]);
    expect(client.pool.query).toHaveBeenCalled();
  });

  it('throws instead of failing over on ordinary SQL errors', async () => {
    client = loadClient();
    client.pool.query.mockRejectedValue(sqlError);

    await expect(client.query('SELECT bad')).rejects.toBe(sqlError);
    expect(client.fallbackPool.query).not.toHaveBeenCalled();
  });

  it('surfaces the error when both databases are down', async () => {
    client = loadClient();
    client.pool.query.mockRejectedValue(quotaError);
    client.fallbackPool.query.mockRejectedValueOnce(quotaError);

    await expect(client.query('SELECT 1')).rejects.toBe(quotaError);
    expect(client.pool.query).toHaveBeenCalled();
    expect(client.fallbackPool.query).toHaveBeenCalled();
  });

  it('runs transactions on the fallback after a primary outage', async () => {
    client = loadClient();
    client.pool.connect.mockRejectedValueOnce(quotaError);
    client.fallbackPool.connect.mockImplementationOnce(async () => ({
      query: jest.fn(async () => ({ rows: [] })),
      release: jest.fn()
    }));

    const result = await client.withTransaction(async (c: any) => {
      await c.query('BEGIN; INSERT INTO x VALUES (1)');
      return 'done';
    });

    expect(result).toBe('done');
    expect(client.fallbackPool.connect).toHaveBeenCalledTimes(1);
  });

  it('endAllPools closes every configured pool', async () => {
    client = loadClient();
    await client.endAllPools();
    expect(client.pool.end).toHaveBeenCalled();
    expect(client.fallbackPool.end).toHaveBeenCalled();
  });
});
import { fetchWithRetry, fetchWithTimeout, isRetryableStatus } from './http';

const originalFetch = global.fetch;

function mockFetch(impl: (url: string, init?: RequestInit) => Promise<Response>): jest.Mock {
  const fn = jest.fn(impl);
  global.fetch = fn as any;
  return fn;
}

function res(status: number): Response {
  return { status, ok: status >= 200 && status < 300 } as any;
}

describe('common/http', () => {
  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  describe('isRetryableStatus', () => {
    it('retries transient statuses only', () => {
      expect(isRetryableStatus(429)).toBe(true);
      expect(isRetryableStatus(500)).toBe(true);
      expect(isRetryableStatus(503)).toBe(true);
      expect(isRetryableStatus(404)).toBe(false);
      expect(isRetryableStatus(403)).toBe(false);
      expect(isRetryableStatus(200)).toBe(false);
    });
  });

  describe('fetchWithRetry', () => {
    it('retries a transient 503 and resolves with the eventual success', async () => {
      const fn = mockFetch(async (_url, init) => {
        void init?.signal;
        return fn.mock.calls.length === 1 ? res(503) : res(200);
      });
      const out = await fetchWithRetry('https://example.test', {}, { retryDelaysMs: [0] });
      expect(out.status).toBe(200);
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('returns the final response instead of throwing when retries are exhausted', async () => {
      const fn = mockFetch(async () => res(503));
      const out = await fetchWithRetry('https://example.test', {}, { attempts: 3, retryDelaysMs: [0, 0] });
      expect(out.status).toBe(503);
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('does not retry a non-retryable status', async () => {
      const fn = mockFetch(async () => res(404));
      const out = await fetchWithRetry('https://example.test', {}, { retryDelaysMs: [0, 0] });
      expect(out.status).toBe(404);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('retries network errors and throws the last error when all attempts fail', async () => {
      let calls = 0;
      const fn = mockFetch(async () => {
        calls++;
        throw new Error(`network ${calls}`);
      });
      await expect(
        fetchWithRetry('https://example.test', {}, { attempts: 3, retryDelaysMs: [0, 0] })
      ).rejects.toThrow('network 3');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('aborts a request that exceeds the timeout', async () => {
      mockFetch((_url, init) => {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            const err: any = new Error('aborted');
            err.name = 'AbortError';
            reject(err);
          });
        });
      });
      await expect(
        fetchWithTimeout('https://example.test', { timeoutMs: 1000 })
      ).rejects.toMatchObject({ name: 'AbortError' });
    });
  });
});

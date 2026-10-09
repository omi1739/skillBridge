/**
 * Small HTTP helpers shared by backend integrations (job scrapers, GitHub
 * verifier, alert webhooks). Every outbound request in the API should go
 * through these so a single hung socket can never stall a request or a
 * scheduled ingestion run for minutes.
 */
export const DEFAULT_HTTP_TIMEOUT_MS = Number(process.env.HTTP_TIMEOUT_MS || 15000);

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** True when an HTTP status is transient and worth retrying with backoff. */
export function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

export interface FetchWithTimeoutInit extends Omit<RequestInit, 'signal'> {
  /** Hard abort deadline for this request. Defaults to DEFAULT_HTTP_TIMEOUT_MS. */
  timeoutMs?: number;
}

/**
 * `fetch()` wrapped in an AbortController deadline. The timeout guard is always
 * cleared, and an abort is surfaced as a clear `AbortError` so callers (and the
 * retry helper below) can treat it as a transient failure.
 */
export async function fetchWithTimeout(url: string, init: FetchWithTimeoutInit = {}): Promise<Response> {
  const { timeoutMs = DEFAULT_HTTP_TIMEOUT_MS, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(1000, timeoutMs));
  try {
    return await fetch(url, { ...rest, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export interface RetryOptions {
  /** Total attempts including the first. Default 3. */
  attempts?: number;
  /** Backoff between attempts (ms). The last value is reused. Default [500, 1500]. */
  retryDelaysMs?: number[];
  onRetry?: (attempt: number, status: number | undefined, error: unknown) => void;
}

/**
 * `fetch` with a hard timeout plus bounded retry/backoff for transient 429/5xx
 * statuses and network/timeout errors.
 *
 * Returns the final `Response` even when its status is an error, so callers can
 * inspect `res.ok` exactly as they would with raw `fetch`. It only throws when
 * every attempt failed at the transport level (network error or timeout) — an
 * HTTP response, however bad, is returned rather than thrown.
 */
export async function fetchWithRetry(
  url: string,
  init: FetchWithTimeoutInit = {},
  opts: RetryOptions = {}
): Promise<Response> {
  const attempts = Math.max(1, opts.attempts ?? 3);
  const delays = opts.retryDelaysMs ?? [500, 1500];
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const res = await fetchWithTimeout(url, init);
      const retryable = isRetryableStatus(res.status);
      if (res.ok || !retryable || attempt === attempts - 1) return res;
      opts.onRetry?.(attempt + 1, res.status, undefined);
    } catch (err) {
      lastError = err;
      opts.onRetry?.(attempt + 1, undefined, err);
      if (attempt === attempts - 1) break;
    }
    await sleep(delays[Math.min(attempt, delays.length - 1)]);
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError ?? 'fetch failed'));
}

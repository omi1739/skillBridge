/**
 * NestJS exception bodies are `{ statusCode, message, error }`. `error` holds
 * only the generic reason phrase ("Bad Request", "Unauthorized"), while the
 * actionable text the user needs lives in `message` — which may be a string or,
 * for class-validator failures, an array of strings. Always prefer `message`.
 */
export function apiErrorMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== 'object') return fallback;
  const b = body as { message?: unknown; error?: unknown };
  const message = Array.isArray(b.message)
    ? b.message
        .filter((m): m is string => typeof m === 'string' && m.trim().length > 0)
        .join(' ')
    : typeof b.message === 'string' && b.message.trim()
      ? b.message
      : undefined;
  return message || (typeof b.error === 'string' && b.error.trim() ? b.error : fallback);
}

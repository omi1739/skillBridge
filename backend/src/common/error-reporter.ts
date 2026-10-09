import { Logger } from '@nestjs/common';
import { fetchWithTimeout } from './http';

/**
 * Lightweight error/alert reporting. Errors are always logged; when
 * ALERT_WEBHOOK_URL is configured (a Slack/Discord/generic incoming webhook)
 * they are also POSTed there, best-effort and fire-and-forget so reporting can
 * never break a request.
 *
 * This is intentionally dependency-free. It is the equivalent of a Sentry
 * "capture" hook: set ALERT_WEBHOOK_URL for a no-code integration, or swap the
 * body for a Sentry SDK call later without touching call sites.
 */
const logger = new Logger('Alerting');
const ALERT_WEBHOOK_URL = (process.env.ALERT_WEBHOOK_URL || '').trim();

export interface AlertContext {
  [key: string]: unknown;
}

function webhookPayload(text: string, context?: AlertContext): Record<string, unknown> {
  // `text` is understood by Slack and most generic webhooks; Discord reads
  // `content`. Sending both keeps one URL usable across providers.
  return { text, content: text, context: context ?? {} };
}

async function postWebhook(text: string, context?: AlertContext): Promise<void> {
  if (!ALERT_WEBHOOK_URL) return;
  try {
    await fetchWithTimeout(
      ALERT_WEBHOOK_URL,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload(text, context)),
        timeoutMs: 5000
      }
    );
  } catch (err: any) {
    logger.warn(`Alert webhook POST failed: ${err?.message || err}`);
  }
}

/** Report an exception (logs + optional webhook). Never throws. */
export function reportError(error: unknown, context?: AlertContext): void {
  const message = error instanceof Error ? error.message : String(error);
  logger.error(message, error instanceof Error ? error.stack : undefined);
  void postWebhook(`[SkillBridge] Error: ${message}`, context);
}

/** Report a non-exception operational alert (logs + optional webhook). */
export function reportAlert(message: string, context?: AlertContext): void {
  logger.warn(message);
  void postWebhook(`[SkillBridge] Alert: ${message}`, context);
}

export function isAlertingConfigured(): boolean {
  return Boolean(ALERT_WEBHOOK_URL);
}

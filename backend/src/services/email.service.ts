import { Logger } from '@nestjs/common';
import { fetchWithTimeout } from '../common/http';

/**
 * Minimal transactional email sender.
 *
 * Uses Resend's HTTP API (https://resend.com) when RESEND_API_KEY is set — no
 * SDK dependency, just the shared timeout-guarded fetch. When no key is
 * configured the message is logged instead of sent, which keeps local
 * development (and CI) fully functional without an email provider. The reset
 * link is also surfaced to the caller in non-production so the flow is testable
 * end-to-end offline.
 */
export class EmailService {
  private readonly logger = new Logger('EmailService');

  get isConfigured(): boolean {
    return Boolean((process.env.RESEND_API_KEY || '').trim());
  }

  async sendPasswordReset(to: string, resetUrl: string): Promise<boolean> {
    const apiKey = (process.env.RESEND_API_KEY || '').trim();
    const from = (process.env.EMAIL_FROM || 'SkillBridge <onboarding@resend.dev>').trim();
    const subject = 'Reset your SkillBridge password';
    const text =
      `We received a request to reset the password for your SkillBridge account.\n\n` +
      `Reset it here (this link expires in 1 hour):\n${resetUrl}\n\n` +
      `If you did not request this, you can safely ignore this email — your password will not change.`;
    const html =
      `<p>We received a request to reset the password for your SkillBridge account.</p>` +
      `<p><a href="${resetUrl}">Reset your password</a> (this link expires in 1 hour).</p>` +
      `<p>If you did not request this, you can safely ignore this email — your password will not change.</p>`;

    if (!apiKey) {
      this.logger.warn(`RESEND_API_KEY not set; password reset email not sent. Reset link: ${resetUrl}`);
      return false;
    }

    try {
      const res = await fetchWithTimeout('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ from, to: [to], subject, text, html }),
        timeoutMs: 10000
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        this.logger.error(`Resend API returned ${res.status} sending password reset: ${body.slice(0, 300)}`);
        return false;
      }
      return true;
    } catch (err: any) {
      this.logger.error(`Failed to send password reset email: ${err?.message || err}`);
      return false;
    }
  }
}

export const emailService = new EmailService();

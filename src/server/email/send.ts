import { createLogger } from '@/server/logger';
import type { EmailContent } from './render';

/**
 * Delivery.
 *
 * No provider is configured, so this logs what would have been sent and
 * returns cleanly. That is deliberate: a mail failure must never fail the
 * action that triggered it — a member whose entry was approved should not see
 * an error because the mail queue was down.
 *
 * The recipient address is not logged. `to` identifies a real person, and a log
 * line outlives the request by months.
 */
export type SendResult = { delivered: boolean; reason?: string };

export async function send(to: string, content: EmailContent): Promise<SendResult> {
  const log = createLogger({ route: 'email' });

  if (!process.env.EMAIL_PROVIDER_API_KEY) {
    log.info('email not sent: no provider configured', {
      subject: content.subject,
      recipients: 1,
    });
    return { delivered: false, reason: 'no-provider' };
  }

  try {
    // A provider is wired here when one is chosen. The templates and the call
    // site are already in place, so it is one function body.
    log.warn('email provider configured but no transport implemented', {
      subject: content.subject,
    });
    return { delivered: false, reason: 'no-transport' };
  } catch (cause) {
    log.error('email delivery failed', {
      subject: content.subject,
      cause: cause instanceof Error ? cause.message : String(cause),
    });
    return { delivered: false, reason: 'error' };
  }
}

/** Never throws, never blocks the caller's result. */
export async function sendQuietly(to: string | null | undefined, content: EmailContent): Promise<void> {
  if (!to) return;
  await send(to, content).catch(() => {});
}

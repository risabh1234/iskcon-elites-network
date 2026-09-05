import { createLogger } from '@/server/logger';

/**
 * Error reporting.
 *
 * REBUILD_PLAN.md Phase 8 specifies Sentry. This is the seam for it, not a
 * substitute: `captureException` is where `Sentry.captureException` goes, and
 * the scrubbing below is what has to happen either way.
 *
 * It is a seam rather than the SDK because there is no DSN to send to, and a
 * half-wired reporting SDK is worse than an explicit gap — it looks like
 * observability while reporting nothing. See ADR-0036.
 *
 * What it does today: structured JSON to stderr, which Cloudflare Logpush
 * collects without further work.
 */
export type ErrorContext = {
  route?: string;
  actorId?: string;
  requestId?: string;
  digest?: string;
};

/** Anything that could carry a person's identity or a credential. */
const SENSITIVE = /(password|token|secret|api[-_]?key|authorization|cookie|session|email)/i;

/**
 * Errors carry messages, and messages carry whatever was interpolated into
 * them — a connection string, an email address, a token. Scrub before the line
 * is written, not before it is read.
 */
export function scrubMessage(message: string): string {
  return message
    .replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, 'postgresql://[redacted]')
    .replace(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, '[email]')
    .replace(/\b(?:eyJ|sk_|pk_|whsec_)[A-Za-z0-9._-]{8,}/g, '[token]');
}

function scrubContext(context: ErrorContext): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(context).filter(([key]) => !SENSITIVE.test(key)),
  );
}

export function captureException(error: unknown, context: ErrorContext = {}): void {
  const log = createLogger({ requestId: context.requestId, route: context.route });

  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  log.error('unhandled error', {
    message: scrubMessage(message),
    // The stack is the whole value of a report; scrub it, do not drop it.
    stack: stack ? scrubMessage(stack) : undefined,
    ...scrubContext(context),
  });
}

/** Web Vitals, reported from the browser. */
export function captureWebVital(metric: {
  name: string;
  value: number;
  rating: string;
  id: string;
}): void {
  createLogger({ route: 'web-vitals' }).info('web vital', {
    metric: metric.name,
    value: Math.round(metric.value),
    rating: metric.rating,
  });
}

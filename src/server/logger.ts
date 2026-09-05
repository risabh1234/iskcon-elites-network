import { randomUUID } from 'node:crypto';

type Level = 'debug' | 'info' | 'warn' | 'error';

/**
 * Structured JSON logs, request-scoped.
 *
 * Never log PII. Emails, names, bios and Clerk ids identify a real person, and
 * a log line outlives the request by months — `actorId` is enough to answer
 * "who did this" without putting the answer in plain text.
 */
export type LogContext = {
  requestId: string;
  route?: string;
  actorId?: string;
};

const REDACTED = '[redacted]';
const SENSITIVE = /^(email|password|token|secret|key|clerkid|bio|name|phone|address)$/i;

function scrub(value: unknown, depth = 0): unknown {
  if (depth > 4 || value == null) return value;
  if (Array.isArray(value)) return value.map((v) => scrub(v, depth + 1));
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) =>
        SENSITIVE.test(k) ? [k, REDACTED] : [k, scrub(v, depth + 1)],
      ),
    );
  }
  return value;
}

function emit(level: Level, context: LogContext, message: string, data?: Record<string, unknown>) {
  const line = JSON.stringify({
    level,
    time: new Date().toISOString(),
    message,
    ...context,
    ...(data ? { data: scrub(data) } : {}),
  });

  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export function createLogger(context: Partial<LogContext> = {}) {
  const scoped: LogContext = { requestId: context.requestId ?? randomUUID(), ...context };

  return {
    context: scoped,
    child: (extra: Partial<LogContext>) => createLogger({ ...scoped, ...extra }),
    debug: (m: string, d?: Record<string, unknown>) => emit('debug', scoped, m, d),
    info: (m: string, d?: Record<string, unknown>) => emit('info', scoped, m, d),
    warn: (m: string, d?: Record<string, unknown>) => emit('warn', scoped, m, d),
    error: (m: string, d?: Record<string, unknown>) => emit('error', scoped, m, d),
  };
}

export type Logger = ReturnType<typeof createLogger>;

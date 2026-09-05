import { rateLimited } from './errors';
import { err, ok, type Result } from './result';

/**
 * Fixed-window rate limiting.
 *
 * The in-memory store below is per-isolate, which on Cloudflare Workers means
 * per-region-ish and resets on redeploy — it raises the cost of a script
 * hammering an upload endpoint, but it is not a distributed limiter and should
 * not be described as one. Phase 8 replaces the store with a Durable Object or
 * Upstash; the call sites do not change.
 */
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitOptions = {
  /** Requests permitted per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
};

export const LIMITS = {
  upload: { limit: 20, windowMs: 60_000 },
  mutation: { limit: 60, windowMs: 60_000 },
  adminMutation: { limit: 120, windowMs: 60_000 },
} satisfies Record<string, RateLimitOptions>;

export function checkRateLimit(key: string, options: RateLimitOptions): Result<void> {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return ok(undefined);
  }

  if (bucket.count >= options.limit) {
    const seconds = Math.ceil((bucket.resetAt - now) / 1000);
    return err(rateLimited(`Too many requests. Try again in ${seconds}s.`));
  }

  bucket.count += 1;
  return ok(undefined);
}

/** Test seam. */
export function resetRateLimits() {
  buckets.clear();
}

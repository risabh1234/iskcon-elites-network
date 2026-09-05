import { NextResponse } from 'next/server';
import { statusFor, toResponseBody, type AppError } from './errors';
import type { Result } from './result';

/**
 * The adapter's whole job: turn a Result into a Response, once, so no handler
 * invents its own status codes or leaks an internal message.
 */
export function respond<T>(result: Result<T, AppError>, successStatus = 200) {
  if (!result.ok) {
    return NextResponse.json(toResponseBody(result.error), { status: statusFor(result.error) });
  }
  if (result.value === undefined || result.value === null) {
    return new NextResponse(null, { status: successStatus === 200 ? 204 : successStatus });
  }
  return NextResponse.json(result.value, { status: successStatus });
}

/** Best-effort caller identity for rate-limit keys. Never logged. */
export function clientKey(request: Request, actorId?: string): string {
  if (actorId) return `actor:${actorId}`;
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() ?? request.headers.get('cf-connecting-ip') ?? 'unknown';
  return `ip:${ip}`;
}

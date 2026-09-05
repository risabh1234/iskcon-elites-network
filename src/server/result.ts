import type { AppError } from './errors';

/**
 * Services return a Result rather than throwing.
 *
 * A thrown error crossing a service boundary loses its type: the caller catches
 * `unknown` and has to guess whether it was a validation failure, a missing row
 * or a dropped connection — which is how "500 Internal Server Error" ends up
 * being the answer to a bad postcode. A Result makes the failure part of the
 * signature, so the compiler makes the adapter handle it.
 */
export type Result<T, E = AppError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

export function isOk<T, E>(result: Result<T, E>): result is { ok: true; value: T } {
  return result.ok;
}

/** Map the success value, leaving a failure untouched. */
export function map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  return result.ok ? ok(fn(result.value)) : result;
}

/** Unwrap, or throw. Only for tests and scripts — never in a request path. */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (result.ok) return result.value;
  throw new Error(`unwrap() on an error result: ${JSON.stringify(result.error)}`);
}

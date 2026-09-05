/**
 * The error taxonomy. Each kind maps to an HTTP status and a message that is
 * safe to show a stranger, in exactly one place — so a new endpoint cannot
 * invent its own vocabulary, and an internal failure cannot leak a stack trace
 * or a SQL fragment into a response body.
 */
export type AppErrorKind =
  | 'Unauthenticated'
  | 'Forbidden'
  | 'NotFound'
  | 'Validation'
  | 'Conflict'
  | 'RateLimited'
  | 'Internal';

export type AppError = {
  kind: AppErrorKind;
  /** Safe to render to any caller. */
  message: string;
  /** Field-level detail for Validation errors. Safe: it describes the request. */
  fields?: Record<string, string[]>;
  /** Never serialised to the client. For logs only. */
  cause?: unknown;
};

const STATUS: Record<AppErrorKind, number> = {
  Unauthenticated: 401,
  Forbidden: 403,
  NotFound: 404,
  Validation: 400,
  Conflict: 409,
  RateLimited: 429,
  Internal: 500,
};

const DEFAULT_MESSAGE: Record<AppErrorKind, string> = {
  Unauthenticated: 'You need to be signed in to do that.',
  Forbidden: 'You do not have permission to do that.',
  NotFound: 'That could not be found.',
  Validation: 'Some of the details provided are not valid.',
  Conflict: 'That conflicts with something that already exists.',
  RateLimited: 'Too many requests. Try again shortly.',
  Internal: 'Something went wrong on our side.',
};

function make(kind: AppErrorKind) {
  return (message?: string, extra?: Omit<AppError, 'kind' | 'message'>): AppError => ({
    kind,
    message: message ?? DEFAULT_MESSAGE[kind],
    ...extra,
  });
}

export const unauthenticated = make('Unauthenticated');
export const forbidden = make('Forbidden');
export const notFound = make('NotFound');
export const validation = make('Validation');
export const conflict = make('Conflict');
export const rateLimited = make('RateLimited');
export const internal = make('Internal');

export function statusFor(error: AppError): number {
  return STATUS[error.kind];
}

/** The response body. `cause` is deliberately dropped. */
export function toResponseBody(error: AppError) {
  return {
    error: error.message,
    kind: error.kind,
    ...(error.fields ? { fields: error.fields } : {}),
  };
}

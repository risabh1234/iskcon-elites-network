import { beforeEach, describe, expect, it } from 'vitest';
import { err, isOk, map, ok, unwrap } from '@/server/result';
import { forbidden, internal, notFound, statusFor, toResponseBody, validation } from '@/server/errors';
import { checkRateLimit, resetRateLimits } from '@/server/rate-limit';
import { uploadSchema, MAX_UPLOAD_BYTES } from '@/domain/media/schema';

describe('Result', () => {
  it('carries a value or an error, never both', () => {
    expect(isOk(ok(1))).toBe(true);
    expect(isOk(err('x'))).toBe(false);
  });

  it('maps success and passes failure through untouched', () => {
    expect(unwrap(map(ok(2), (n) => n * 2))).toBe(4);
    const failure = err(notFound());
    expect(map(failure, () => 1)).toBe(failure);
  });
});

describe('error taxonomy', () => {
  it('maps each kind to its HTTP status', () => {
    expect(statusFor(notFound())).toBe(404);
    expect(statusFor(forbidden())).toBe(403);
    expect(statusFor(validation())).toBe(400);
    expect(statusFor(internal())).toBe(500);
  });

  it('never serialises the cause, which may hold a stack or a query', () => {
    const body = toResponseBody(internal('Saving failed.', { cause: new Error('relation "user" does not exist') }));
    expect(JSON.stringify(body)).not.toContain('relation');
    expect(body).toEqual({ error: 'Saving failed.', kind: 'Internal' });
  });

  it('keeps field detail on validation errors, which describes the request only', () => {
    const body = toResponseBody(validation('Check the fields.', { fields: { name: ['Required'] } }));
    expect(body.fields).toEqual({ name: ['Required'] });
  });
});

describe('rate limiting', () => {
  beforeEach(() => resetRateLimits());

  it('permits up to the limit then refuses', () => {
    const options = { limit: 3, windowMs: 60_000 };
    for (let i = 0; i < 3; i += 1) expect(checkRateLimit('k', options).ok).toBe(true);
    const blocked = checkRateLimit('k', options);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.error.kind).toBe('RateLimited');
  });

  it('counts each caller separately', () => {
    const options = { limit: 1, windowMs: 60_000 };
    expect(checkRateLimit('a', options).ok).toBe(true);
    expect(checkRateLimit('b', options).ok).toBe(true);
  });
});

describe('upload constraints', () => {
  it('accepts a small image of an allowed type', () => {
    expect(uploadSchema.safeParse({ filename: 'a.jpg', contentType: 'image/jpeg', size: 1000 }).success).toBe(true);
  });

  it('rejects a disallowed content type', () => {
    // The previous route took the client's word for the type and wrote the file
    // to a public bucket.
    expect(uploadSchema.safeParse({ filename: 'a.svg', contentType: 'image/svg+xml', size: 10 }).success).toBe(false);
    expect(uploadSchema.safeParse({ filename: 'a.html', contentType: 'text/html', size: 10 }).success).toBe(false);
  });

  it('rejects a file over the size limit', () => {
    expect(uploadSchema.safeParse({
      filename: 'big.png', contentType: 'image/png', size: MAX_UPLOAD_BYTES + 1,
    }).success).toBe(false);
  });
});

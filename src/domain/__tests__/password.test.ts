import { describe, expect, it } from 'vitest';
import { hashPassword, needsRehash, verifyPassword } from '@/server/auth/password';

describe('password hashing', () => {
  it('verifies a correct password and rejects a wrong one', async () => {
    const hash = await hashPassword('correct horse battery staple');
    expect(await verifyPassword('correct horse battery staple', hash)).toBe(true);
    expect(await verifyPassword('Correct horse battery staple', hash)).toBe(false);
    expect(await verifyPassword('', hash)).toBe(false);
  });

  it('salts, so the same password never produces the same hash', async () => {
    const a = await hashPassword('same password');
    const b = await hashPassword('same password');
    expect(a).not.toBe(b);
    expect(await verifyPassword('same password', a)).toBe(true);
    expect(await verifyPassword('same password', b)).toBe(true);
  });

  it('stores the algorithm and cost with the hash, not just the digest', async () => {
    const hash = await hashPassword('whatever it is');
    const [algorithm, digest, iterations] = hash.split('$');
    expect(algorithm).toBe('pbkdf2');
    expect(digest).toBe('sha256');
    expect(Number(iterations)).toBeGreaterThanOrEqual(600_000);
  });

  it('returns false for a null hash rather than throwing', async () => {
    // Social-only accounts have no password; signing in must fail, not error.
    expect(await verifyPassword('anything', null)).toBe(false);
  });

  it('rejects a malformed or truncated hash', async () => {
    expect(await verifyPassword('x', 'not-a-hash')).toBe(false);
    expect(await verifyPassword('x', 'pbkdf2$sha256$600000$onlyfourparts')).toBe(false);
    expect(await verifyPassword('x', 'bcrypt$sha256$600000$aaaa$bbbb')).toBe(false);
  });

  it('normalises unicode so the same typed password matches', async () => {
    // U+00E9 vs e + U+0301 look identical and can differ by keyboard.
    const composed = 'passwordé-long';
    const decomposed = 'passwordé-long';
    const hash = await hashPassword(composed);
    expect(await verifyPassword(decomposed, hash)).toBe(true);
  });

  it('flags hashes made with a lower cost for transparent upgrade', async () => {
    expect(needsRehash('pbkdf2$sha256$10000$aaaa$bbbb')).toBe(true);
    expect(needsRehash(await hashPassword('current'))).toBe(false);
    expect(needsRehash(null)).toBe(false);
  });
});

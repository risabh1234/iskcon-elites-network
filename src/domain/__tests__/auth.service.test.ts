import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/domain/auth/repository', () => ({
  findByEmail: vi.fn(), createUser: vi.fn(), setPasswordHash: vi.fn(),
  findLinkedAccount: vi.fn(), linkAccount: vi.fn(), markEmailVerified: vi.fn(),
  isFirstUser: vi.fn(), promoteToSuperadmin: vi.fn(),
}));
vi.mock('@/server/auth/session', () => ({
  createSession: vi.fn(async () => 'token'),
  setSessionCookie: vi.fn(),
  destroySession: vi.fn(),
  destroyAllSessions: vi.fn(),
}));

import * as repo from '@/domain/auth/repository';
import * as session from '@/server/auth/session';
import * as service from '@/domain/auth/service';
import { resetRateLimits } from '@/server/rate-limit';

const ctx = { rateKey: 'ip:test', userAgent: 'vitest' };
const user = (over = {}) => ({ id: 'u1', email: 'a@example.com', name: 'A', passwordHash: null, ...over });

beforeEach(() => {
  vi.clearAllMocks();
  resetRateLimits();
  vi.mocked(repo.isFirstUser).mockResolvedValue(false);
});

describe('signUp', () => {
  const valid = { name: 'A Person', email: 'New@Example.com', password: 'a-long-enough-pw' };

  it('lower-cases the address so casing cannot create a second account', async () => {
    vi.mocked(repo.findByEmail).mockResolvedValue(null);
    vi.mocked(repo.createUser).mockResolvedValue(user() as never);
    await service.signUp(valid, ctx);
    expect(repo.findByEmail).toHaveBeenCalledWith('new@example.com');
    expect(vi.mocked(repo.createUser).mock.calls[0]![0]!.email).toBe('new@example.com');
  });

  it('stores a hash, never the password', async () => {
    vi.mocked(repo.findByEmail).mockResolvedValue(null);
    vi.mocked(repo.createUser).mockResolvedValue(user() as never);
    await service.signUp(valid, ctx);
    const stored = vi.mocked(repo.createUser).mock.calls[0]![0]!.passwordHash!;
    expect(stored).not.toContain('a-long-enough-pw');
    expect(stored.startsWith('pbkdf2$')).toBe(true);
  });

  it('rejects a short password before hitting the database', async () => {
    const result = await service.signUp({ ...valid, password: 'short' }, ctx);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('Validation');
    expect(repo.createUser).not.toHaveBeenCalled();
  });

  it('does not confirm that an address is already registered', async () => {
    vi.mocked(repo.findByEmail).mockResolvedValue(user() as never);
    const result = await service.signUp(valid, ctx);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      // Naming the address would turn the form into an enumeration oracle.
      expect(result.error.message).not.toContain('New@Example.com');
      expect(result.error.message.toLowerCase()).not.toContain('already');
    }
  });

  it('seats the very first account as the administrator, and no later one', async () => {
    vi.mocked(repo.findByEmail).mockResolvedValue(null);
    vi.mocked(repo.createUser).mockResolvedValue(user() as never);

    vi.mocked(repo.isFirstUser).mockResolvedValue(true);
    await service.signUp(valid, ctx);
    expect(repo.promoteToSuperadmin).toHaveBeenCalledWith('u1');

    vi.clearAllMocks();
    vi.mocked(repo.isFirstUser).mockResolvedValue(false);
    vi.mocked(repo.findByEmail).mockResolvedValue(null);
    vi.mocked(repo.createUser).mockResolvedValue(user() as never);
    await service.signUp({ ...valid, email: 'second@example.com' }, ctx);
    expect(repo.promoteToSuperadmin).not.toHaveBeenCalled();
  });

  it('opens a session on success', async () => {
    vi.mocked(repo.findByEmail).mockResolvedValue(null);
    vi.mocked(repo.createUser).mockResolvedValue(user() as never);
    expect((await service.signUp(valid, ctx)).ok).toBe(true);
    expect(session.createSession).toHaveBeenCalledWith('u1', 'vitest');
    expect(session.setSessionCookie).toHaveBeenCalled();
  });
});

describe('signIn', () => {
  it('gives the same message for an unknown address and a wrong password', async () => {
    vi.mocked(repo.findByEmail).mockResolvedValue(null);
    const missing = await service.signIn({ email: 'nobody@example.com', password: 'whatever-x' }, ctx);

    resetRateLimits();
    const { hashPassword } = await import('@/server/auth/password');
    vi.mocked(repo.findByEmail).mockResolvedValue(
      user({ passwordHash: await hashPassword('the-real-password') }) as never,
    );
    const wrong = await service.signIn({ email: 'a@example.com', password: 'not-the-password' }, ctx);

    expect(missing.ok).toBe(false);
    expect(wrong.ok).toBe(false);
    if (!missing.ok && !wrong.ok) expect(missing.error.message).toBe(wrong.error.message);
  });

  it('signs in with the right password', async () => {
    const { hashPassword } = await import('@/server/auth/password');
    vi.mocked(repo.findByEmail).mockResolvedValue(
      user({ passwordHash: await hashPassword('the-real-password') }) as never,
    );
    expect((await service.signIn({ email: 'a@example.com', password: 'the-real-password' }, ctx)).ok).toBe(true);
    expect(session.createSession).toHaveBeenCalled();
  });

  it('refuses an account that has no password set', async () => {
    // Social-only account: a blank password must not become a way in.
    vi.mocked(repo.findByEmail).mockResolvedValue(user({ passwordHash: null }) as never);
    expect((await service.signIn({ email: 'a@example.com', password: 'anything' }, ctx)).ok).toBe(false);
  });

  it('rate-limits repeated attempts', async () => {
    vi.mocked(repo.findByEmail).mockResolvedValue(null);
    for (let i = 0; i < 10; i += 1) {
      await service.signIn({ email: 'a@example.com', password: 'guess-guess' }, ctx);
    }
    const blocked = await service.signIn({ email: 'a@example.com', password: 'guess-guess' }, ctx);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.error.kind).toBe('RateLimited');
  });
});

describe('signInWithGoogle', () => {
  const profile = { sub: 'g-123', email: 'g@example.com', emailVerified: true, name: 'G Person' };

  it('signs in an already-linked account', async () => {
    vi.mocked(repo.findLinkedAccount).mockResolvedValue({ userId: 'u9' } as never);
    vi.mocked(repo.findByEmail).mockResolvedValue(user({ id: 'u9' }) as never);
    expect((await service.signInWithGoogle(profile, {})).ok).toBe(true);
    expect(repo.linkAccount).not.toHaveBeenCalled();
  });

  it('links to an existing account when Google has verified the address', async () => {
    vi.mocked(repo.findLinkedAccount).mockResolvedValue(null);
    vi.mocked(repo.findByEmail).mockResolvedValue(user({ id: 'u5' }) as never);
    expect((await service.signInWithGoogle(profile, {})).ok).toBe(true);
    expect(repo.linkAccount).toHaveBeenCalledWith('u5', 'google', 'g-123');
  });

  it('refuses to link on an UNVERIFIED address', async () => {
    // Otherwise anyone able to create a Google account claiming someone else's
    // address could take over that account.
    vi.mocked(repo.findLinkedAccount).mockResolvedValue(null);
    vi.mocked(repo.findByEmail).mockResolvedValue(user({ id: 'u5' }) as never);
    const result = await service.signInWithGoogle({ ...profile, emailVerified: false }, {});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('Conflict');
    expect(repo.linkAccount).not.toHaveBeenCalled();
  });

  it('creates a passwordless account for a new address', async () => {
    vi.mocked(repo.findLinkedAccount).mockResolvedValue(null);
    vi.mocked(repo.findByEmail).mockResolvedValue(null);
    vi.mocked(repo.createUser).mockResolvedValue(user({ id: 'u7' }) as never);
    expect((await service.signInWithGoogle(profile, {})).ok).toBe(true);
    expect(vi.mocked(repo.createUser).mock.calls[0]![0]!.passwordHash).toBeNull();
    expect(repo.linkAccount).toHaveBeenCalledWith('u7', 'google', 'g-123');
  });
});

describe('setPassword', () => {
  it('signs every other device out, so a stolen session dies with the change', async () => {
    expect((await service.setPassword('u1', 'a-new-long-password')).ok).toBe(true);
    expect(session.destroyAllSessions).toHaveBeenCalledWith('u1');
  });

  it('rejects a short password', async () => {
    expect((await service.setPassword('u1', 'short')).ok).toBe(false);
    expect(repo.setPasswordHash).not.toHaveBeenCalled();
  });
});

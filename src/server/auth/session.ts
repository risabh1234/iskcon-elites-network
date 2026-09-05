import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

/**
 * Session cookies.
 *
 * The cookie holds 32 random bytes. The database holds only the SHA-256 of
 * that value, so a dump of the sessions table cannot be replayed as a login —
 * the same reason a password is never stored in the clear.
 */
export const SESSION_COOKIE = 'ien_session';
const TOKEN_BYTES = 32;
const SESSION_DAYS = 30;
/** Refresh the expiry only when a session is more than a day old, to avoid a write per request. */
const REFRESH_AFTER_MS = 24 * 60 * 60 * 1000;

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return toBase64Url(new Uint8Array(digest));
}

function expiryFromNow(): Date {
  return new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
}

/** Creates a session row and returns the raw token for the cookie. */
export async function createSession(userId: string, userAgent?: string | null): Promise<string> {
  const token = toBase64Url(crypto.getRandomValues(new Uint8Array(TOKEN_BYTES)));

  await prisma.session.create({
    data: {
      tokenHash: await hashToken(token),
      userId,
      expiresAt: expiryFromNow(),
      userAgent: userAgent?.slice(0, 300) ?? null,
    },
  });

  return token;
}

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
  role: string;
  canCreateEvents: boolean;
};

/**
 * Resolves the cookie to a user. Read-only: Next forbids setting cookies during
 * Server Component rendering, and `getActor()` is called from components, so
 * expiry refresh happens in `touchSession()` from actions and route handlers.
 */
export async function readSession(): Promise<{ user: SessionUser; sessionId: string; expiresAt: Date } | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: await hashToken(token) },
    select: {
      id: true,
      expiresAt: true,
      user: {
        select: {
          id: true, email: true, name: true, username: true,
          role: true, canCreateEvents: true,
        },
      },
    },
  });

  if (!session) return null;

  if (session.expiresAt.getTime() <= Date.now()) {
    // Expired rows are removed opportunistically; there is no cron yet.
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return { user: session.user as SessionUser, sessionId: session.id, expiresAt: session.expiresAt };
}

/** Slides the expiry forward. Safe to call only from an action or route handler. */
export async function touchSession(sessionId: string, expiresAt: Date): Promise<void> {
  const remaining = expiresAt.getTime() - Date.now();
  const full = SESSION_DAYS * 24 * 60 * 60 * 1000;
  if (full - remaining < REFRESH_AFTER_MS) return;

  await prisma.session
    .update({ where: { id: sessionId }, data: { expiresAt: expiryFromNow(), lastUsedAt: new Date() } })
    .catch(() => {});
}

export async function setSessionCookie(token: string): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    // Lax rather than Strict: Strict would drop the cookie on the return leg of
    // the Google redirect, so the user would land signed out.
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Signs out: deletes the row so the token is dead even if the cookie survives. */
export async function destroySession(): Promise<void> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: await hashToken(token) } }).catch(() => {});
  }
  await clearSessionCookie();
}

/** Signs out everywhere — used after a password change. */
export async function destroyAllSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}

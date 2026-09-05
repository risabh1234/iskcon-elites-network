import { auth as clerkAuth, currentUser } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import type { Actor, Role } from './policy';

/**
 * The single place Clerk is read.
 *
 * Before this existed, sixteen files called `auth()` and fifteen of them
 * followed it with their own `prisma.user.findUnique({ where: { clerkId } })`
 * and their own uppercase role comparison. One of them compared a *lowercase*
 * role from Clerk session metadata instead, which is why that endpoint had been
 * silently rejecting every caller — see docs/AUDIT.md §3.
 *
 * No file outside this module may import from '@clerk/nextjs/server'; an ESLint
 * boundary rule enforces it.
 */
export async function getActor(): Promise<Actor> {
  const { userId } = await clerkAuth();
  if (!userId) return { kind: 'anonymous' };

  const dbUser = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true, clerkId: true, email: true, role: true, canCreateEvents: true },
  });

  // Signed in to Clerk but with no local row yet. They are authenticated and
  // hold no privileges — which is exactly `anonymous` plus an identity, and
  // must never be promoted here. See ADR-0007.
  if (!dbUser) return { kind: 'anonymous' };

  return {
    kind: 'user',
    id: dbUser.id,
    clerkId: dbUser.clerkId,
    email: dbUser.email,
    role: dbUser.role as Role,
    canCreateEvents: dbUser.canCreateEvents,
  };
}

/**
 * Creates the local row for a signed-in Clerk user who does not have one.
 *
 * Always `USER`, never elevated — the previous code granted SUPERADMIN to
 * whoever called first when the table was empty, so emptying the table handed
 * the register to the next visitor.
 */
export async function ensureActor(): Promise<Actor> {
  const existing = await getActor();
  if (existing.kind === 'user') return existing;

  const { userId } = await clerkAuth();
  if (!userId) return { kind: 'anonymous' };

  const clerkUser = await currentUser();
  if (!clerkUser) return { kind: 'anonymous' };

  const email = clerkUser.emailAddresses[0]?.emailAddress ?? '';
  const username =
    clerkUser.username ??
    (clerkUser.firstName
      ? `${clerkUser.firstName} ${clerkUser.lastName ?? ''}`.trim()
      : email.split('@')[0]) ??
    null;

  const created = await prisma.user.upsert({
    where: { clerkId: userId },
    update: {},
    create: { clerkId: userId, email, username, role: 'USER', canCreateEvents: false },
    select: { id: true, clerkId: true, email: true, role: true, canCreateEvents: true },
  });

  return {
    kind: 'user',
    id: created.id,
    clerkId: created.clerkId,
    email: created.email,
    role: created.role as Role,
    canCreateEvents: created.canCreateEvents,
  };
}

/** Deletes a user from Clerk. Only the user service should call this. */
export async function deleteClerkUser(clerkId: string): Promise<void> {
  const { clerkClient } = await import('@clerk/nextjs/server');
  const client = await clerkClient();
  await client.users.deleteUser(clerkId);
}

/** Every Clerk user, for the admin reconciliation job. */
export async function listClerkUsers(limit = 500) {
  const { clerkClient } = await import('@clerk/nextjs/server');
  const client = await clerkClient();
  const page = await client.users.getUserList({ limit });
  return page.data.map((u) => ({
    clerkId: u.id,
    email: u.emailAddresses[0]?.emailAddress ?? '',
    username:
      u.username ??
      (u.firstName ? `${u.firstName} ${u.lastName ?? ''}`.trim() : u.emailAddresses[0]?.emailAddress?.split('@')[0]) ??
      null,
  }));
}

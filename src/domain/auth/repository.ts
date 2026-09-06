import prisma from '@/lib/prisma';

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string | null;
};

export async function findByEmail(email: string): Promise<AuthUser | null> {
  return prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, passwordHash: true },
  });
}

export async function createUser(data: {
  email: string;
  name: string;
  passwordHash: string | null;
  emailVerifiedAt: Date | null;
}): Promise<AuthUser> {
  return prisma.user.create({
    data: { ...data, username: data.name, role: 'USER', canCreateEvents: false },
    select: { id: true, email: true, name: true, passwordHash: true },
  });
}

export async function setPasswordHash(userId: string, passwordHash: string): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}

export async function findLinkedAccount(provider: string, providerAccountId: string) {
  return prisma.account.findUnique({
    where: { provider_providerAccountId: { provider, providerAccountId } },
    select: { userId: true },
  });
}

export async function linkAccount(
  userId: string,
  provider: string,
  providerAccountId: string,
): Promise<void> {
  await prisma.account.create({ data: { userId, provider, providerAccountId } });
}

export async function markEmailVerified(userId: string): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
}

/** True when nobody has registered yet — used to seat the first administrator. */
export async function isFirstUser(): Promise<boolean> {
  return (await prisma.user.count()) === 0;
}

/**
 * Restores a designated administrator's role, and writes nothing when it is
 * already correct — this runs on every one of their sign-ins.
 *
 * `updateMany` here is scoped by primary key. The unscoped `updateMany` the
 * Phase 0 audit found (docs/AUDIT.md §6) promoted every user in the database;
 * the `where` is the entire difference and is why this is not a bare `update`:
 * the role condition is what keeps it from writing on every request.
 */
export async function restoreSuperadmin(userId: string): Promise<boolean> {
  const { count } = await prisma.user.updateMany({
    where: { id: userId, NOT: { role: 'SUPERADMIN' } },
    data: { role: 'SUPERADMIN', canCreateEvents: true },
  });
  return count > 0;
}

export async function promoteToSuperadmin(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { role: 'SUPERADMIN', canCreateEvents: true },
  });
}

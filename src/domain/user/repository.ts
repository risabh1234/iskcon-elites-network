import prisma from '@/lib/prisma';
import type { UserRecord } from './dto';

const FIELDS = {
  id: true, clerkId: true, email: true, username: true,
  role: true, canCreateEvents: true, createdAt: true,
} as const;

export async function listUsers(): Promise<UserRecord[]> {
  return prisma.user.findMany({ select: FIELDS, orderBy: { createdAt: 'desc' } });
}

export async function findUserById(id: string): Promise<UserRecord | null> {
  return prisma.user.findUnique({ where: { id }, select: FIELDS });
}

export async function updateRole(id: string, role: string): Promise<void> {
  await prisma.user.update({ where: { id }, data: { role: role as never } });
}

export async function updatePermissions(id: string, canCreateEvents: boolean): Promise<void> {
  await prisma.user.update({ where: { id }, data: { canCreateEvents } });
}

export async function deleteUser(id: string): Promise<void> {
  await prisma.user.delete({ where: { id } });
}

/** Used to stop the last administrator being demoted or deleted. */
export async function countAdmins(): Promise<number> {
  return prisma.user.count({ where: { role: { in: ['ADMIN', 'SUPERADMIN'] } } });
}

export async function upsertFromClerk(users: {
  clerkId: string; email: string; username: string | null;
}[]): Promise<number> {
  let synced = 0;
  for (const u of users) {
    await prisma.user.upsert({
      where: { clerkId: u.clerkId },
      update: { email: u.email, username: u.username },
      // Never elevated on sync — see ADR-0007.
      create: { clerkId: u.clerkId, email: u.email, username: u.username, role: 'USER', canCreateEvents: false },
    });
    synced += 1;
  }
  return synced;
}

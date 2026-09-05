'use server';

import { revalidatePath } from 'next/cache';
import { getActor } from '@/server/auth';
import * as service from '@/domain/user/service';

export type UserActionState = { ok?: boolean; error?: string };

export async function setRoleAction(
  userId: string,
  role: 'USER' | 'ADMIN' | 'SUPERADMIN',
): Promise<UserActionState> {
  const result = await service.updateUserRole(await getActor(), userId, { role });
  if (!result.ok) return { error: result.error.message };

  revalidatePath('/admin/users');
  return { ok: true };
}

export async function setEventPermissionAction(
  userId: string,
  canCreateEvents: boolean,
): Promise<UserActionState> {
  const result = await service.updateUserPermissions(await getActor(), userId, { canCreateEvents });
  if (!result.ok) return { error: result.error.message };

  revalidatePath('/admin/users');
  return { ok: true };
}

export async function deleteUserAction(userId: string): Promise<UserActionState> {
  const result = await service.deleteUser(await getActor(), userId);
  if (!result.ok) return { error: result.error.message };

  revalidatePath('/admin/users');
  return { ok: true };
}

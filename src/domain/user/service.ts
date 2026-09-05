import { can, type Actor, type Role } from '@/server/policy';
import { forbidden, notFound, unauthenticated, validation, conflict, internal } from '@/server/errors';
import { err, ok, type Result } from '@/server/result';
import { invalidate, tags } from '@/server/cache';
import * as repo from './repository';
import { toUserDto, type SelfDto, type UserDto } from './dto';
import { updatePermissionsSchema, updateRoleSchema } from './schema';

function fieldErrors(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  const fields: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join('.') || '_';
    (fields[key] ??= []).push(issue.message);
  }
  return fields;
}

const isAdminRole = (role: Role) => role === 'ADMIN' || role === 'SUPERADMIN';

export function getSelf(actor: Actor): Result<SelfDto | null> {
  if (actor.kind !== 'user') return ok(null);
  return ok({ id: actor.id, role: actor.role, canCreateEvents: actor.canCreateEvents });
}

export async function listUsers(actor: Actor): Promise<Result<UserDto[]>> {
  if (!can(actor, 'user:read')) return err(forbidden());
  const rows = await repo.listUsers();
  return ok(rows.map(toUserDto));
}

export async function updateUserRole(
  actor: Actor,
  targetUserId: string,
  input: unknown,
): Promise<Result<void>> {
  if (actor.kind !== 'user') return err(unauthenticated());

  const target = await repo.findUserById(targetUserId);
  if (!target) return err(notFound('That user could not be found.'));

  if (
    !can(actor, 'user:update:role', {
      targetUserId: target.id,
      targetRole: target.role as Role,
    })
  ) {
    return err(forbidden('You cannot change that user’s role.'));
  }

  const parsed = updateRoleSchema.safeParse(input);
  if (!parsed.success) {
    return err(validation('That is not a valid role.', { fields: fieldErrors(parsed.error) }));
  }

  // Guard rail the previous code lacked: two admins could demote each other and
  // lock the institution out of its own console.
  const demoting = isAdminRole(target.role as Role) && !isAdminRole(parsed.data.role);
  if (demoting && (await repo.countAdmins()) <= 1) {
    return err(conflict('This is the last administrator. Promote someone else first.'));
  }

  try {
    await repo.updateRole(targetUserId, parsed.data.role);
    invalidate(tags.users());
    return ok(undefined);
  } catch (cause) {
    return err(internal('The role could not be changed.', { cause }));
  }
}

export async function updateUserPermissions(
  actor: Actor,
  targetUserId: string,
  input: unknown,
): Promise<Result<void>> {
  if (actor.kind !== 'user') return err(unauthenticated());
  if (!can(actor, 'user:update:permissions')) return err(forbidden());

  const target = await repo.findUserById(targetUserId);
  if (!target) return err(notFound('That user could not be found.'));

  const parsed = updatePermissionsSchema.safeParse(input);
  if (!parsed.success) {
    return err(validation('Expected a true or false value.', {
      fields: fieldErrors(parsed.error),
    }));
  }

  try {
    await repo.updatePermissions(targetUserId, parsed.data.canCreateEvents);
    invalidate(tags.users());
    return ok(undefined);
  } catch (cause) {
    return err(internal('The permission could not be changed.', { cause }));
  }
}

export async function deleteUser(actor: Actor, targetUserId: string): Promise<Result<void>> {
  if (actor.kind !== 'user') return err(unauthenticated());

  const target = await repo.findUserById(targetUserId);
  if (!target) return err(notFound('That user could not be found.'));

  if (
    !can(actor, 'user:delete', { targetUserId: target.id, targetRole: target.role as Role })
  ) {
    return err(forbidden('You cannot remove that user.'));
  }

  if (isAdminRole(target.role as Role) && (await repo.countAdmins()) <= 1) {
    return err(conflict('This is the last administrator. Promote someone else first.'));
  }

  try {
    // Sessions and linked social accounts cascade, so the user is signed out
    // everywhere by the same statement that removes them.
    await repo.deleteUser(targetUserId);
  } catch (cause) {
    return err(internal('The user could not be removed.', { cause }));
  }

  invalidate(tags.users());
  return ok(undefined);
}

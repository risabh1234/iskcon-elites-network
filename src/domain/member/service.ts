import { can, type Actor } from '@/server/policy';
import { forbidden, notFound, unauthenticated, validation, internal } from '@/server/errors';
import { err, ok, type Result } from '@/server/result';
import { invalidate, tags } from '@/server/cache';
import * as repo from './repository';
import { toMemberDto, type MemberDto } from './dto';
import {
  approveMemberSchema,
  createMemberSchema,
  updateMemberSchema,
  type MemberRoleType,
} from './schema';

/**
 * Business rules for the directory.
 *
 * Every method authorises before it acts, and every write invalidates its own
 * cache tags. Route handlers do neither — they parse, resolve the actor, and
 * map the Result. That is the whole contract.
 */

function fieldErrors(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  const fields: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join('.') || '_';
    (fields[key] ??= []).push(issue.message);
  }
  return fields;
}

export async function listMembers(
  actor: Actor,
  options: { roleType?: MemberRoleType; includeUnpublished?: boolean } = {},
): Promise<Result<MemberDto[]>> {
  // Unapproved entries are visible only to those allowed to review them. This
  // is the check whose absence served pending profiles to the public.
  const wantsUnpublished = options.includeUnpublished === true;
  if (wantsUnpublished && !can(actor, 'member:read:unpublished')) {
    return err(forbidden('Only reviewers can see unapproved entries.'));
  }

  const rows = await repo.listMembers({
    includeUnpublished: wantsUnpublished,
    roleType: options.roleType,
  });

  return ok(rows.map(({ record, roleType }) => toMemberDto(record, roleType, actor)));
}

export async function getMember(actor: Actor, id: string): Promise<Result<MemberDto>> {
  const found = await repo.findMemberById(id);
  if (!found) return err(notFound('That profile could not be found.'));

  const { record, roleType } = found;

  if (!can(actor, 'member:read', { isPublished: record.isApproved, ownerId: record.addedById })) {
    // Deliberately NotFound rather than Forbidden: telling a stranger that a
    // profile exists but is unpublished is itself a disclosure.
    return err(notFound('That profile could not be found.'));
  }

  return ok(toMemberDto(record, roleType, actor));
}

export async function createMember(actor: Actor, input: unknown): Promise<Result<MemberDto>> {
  if (!can(actor, 'member:create')) {
    return err(forbidden('You need to be signed in to submit an entry.'));
  }
  if (actor.kind !== 'user') return err(forbidden());

  const parsed = createMemberSchema.safeParse(input);
  if (!parsed.success) {
    return err(validation('Check the highlighted fields.', { fields: fieldErrors(parsed.error) }));
  }

  const data = parsed.data;
  // A reviewer's own submission is published immediately; everyone else's waits.
  const isApproved = can(actor, 'member:approve');

  const empty = (v?: string) => (v && v.length > 0 ? v : null);

  try {
    const created =
      data.category === 'Alumni'
        ? await repo.createAlumnus({
            name: data.fullName,
            category: data.category,
            cohort: data.cohort,
            bio: data.bio,
            story: empty(data.story),
            recommendation: empty(data.recommendation),
            email: empty(data.email),
            avatarUrl: empty(data.profileImage),
            addedById: actor.id,
            isApproved,
          })
        : await repo.createSpeaker({
            name: data.fullName,
            title: data.category === 'Featured Guest' ? 'Featured Guest' : (data.title ?? ''),
            bio: data.bio,
            email: empty(data.email),
            avatarUrl: empty(data.profileImage),
            addedById: actor.id,
            isApproved,
          });

    invalidate(tags.members(), tags.member(created.record.id));
    return ok(toMemberDto(created.record, created.roleType, actor));
  } catch (cause) {
    return err(internal('The entry could not be saved.', { cause }));
  }
}

export async function updateMember(
  actor: Actor,
  id: string,
  input: unknown,
): Promise<Result<MemberDto>> {
  // Ownership cannot be evaluated without reading the record, but an anonymous
  // caller can never own anything — answer before touching the database, so an
  // unauthenticated flood costs a comparison rather than a query.
  if (actor.kind !== 'user') return err(unauthenticated());

  const existing = await repo.findMemberById(id);
  if (!existing) return err(notFound('That profile could not be found.'));

  if (!can(actor, 'member:update', { ownerId: existing.record.addedById })) {
    return err(forbidden('You can only edit entries you submitted.'));
  }

  const parsed = updateMemberSchema.safeParse(input);
  if (!parsed.success) {
    return err(validation('Check the highlighted fields.', { fields: fieldErrors(parsed.error) }));
  }

  const data = parsed.data;
  const empty = (v?: string) => (v && v.length > 0 ? v : null);

  try {
    const updated =
      data.roleType === 'Alumni'
        ? await repo.updateAlumnus(id, {
            name: data.fullName,
            category: data.category ?? '',
            cohort: data.cohort ?? '',
            bio: data.bio,
            story: empty(data.story),
            recommendation: empty(data.recommendation),
            email: empty(data.email),
            avatarUrl: empty(data.profileImage),
          })
        : await repo.updateSpeaker(id, {
            name: data.fullName,
            title: data.title ?? '',
            bio: data.bio,
            email: empty(data.email),
            avatarUrl: empty(data.profileImage),
          });

    invalidate(tags.members(), tags.member(id));
    return ok(toMemberDto(updated.record, updated.roleType, actor));
  } catch (cause) {
    return err(internal('The entry could not be saved.', { cause }));
  }
}

export async function setMemberApproval(
  actor: Actor,
  id: string,
  input: unknown,
): Promise<Result<void>> {
  if (!can(actor, 'member:approve')) {
    return err(forbidden('Only reviewers can publish or unpublish an entry.'));
  }

  const parsed = approveMemberSchema.safeParse(input);
  if (!parsed.success) {
    return err(validation('A role type and approval state are required.', {
      fields: fieldErrors(parsed.error),
    }));
  }

  const existing = await repo.findMemberById(id);
  if (!existing) return err(notFound('That profile could not be found.'));

  try {
    await repo.setApproval(id, parsed.data.roleType, parsed.data.isApproved);
    invalidate(tags.members(), tags.member(id));
    return ok(undefined);
  } catch (cause) {
    return err(internal('The entry could not be updated.', { cause }));
  }
}

export async function deleteMember(actor: Actor, id: string): Promise<Result<void>> {
  if (actor.kind !== 'user') return err(unauthenticated());

  const existing = await repo.findMemberById(id);
  if (!existing) return err(notFound('That profile could not be found.'));

  // Deletion is reviewers only — never the submitter. The route this replaces
  // checked only that the caller was signed in, so any member could destroy any
  // profile in the register (docs/AUDIT.md §6).
  if (!can(actor, 'member:delete', { ownerId: existing.record.addedById })) {
    return err(forbidden('Only reviewers can remove an entry.'));
  }

  try {
    await repo.deleteMember(id, existing.roleType);
    invalidate(tags.members(), tags.member(id));
    return ok(undefined);
  } catch (cause) {
    return err(internal('The entry could not be removed.', { cause }));
  }
}

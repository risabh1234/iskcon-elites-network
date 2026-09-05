import { can, type Actor } from '@/server/policy';
import { forbidden, notFound, unauthenticated, validation, internal } from '@/server/errors';
import { err, ok, type Result } from '@/server/result';
import { invalidate, tags } from '@/server/cache';
import { uniqueSlug } from '@/lib/slug';
import { record as audit } from '@/domain/audit/service';
import { entryApprovedEmail, entryRejectedEmail } from '@/server/email/render';
import { sendQuietly } from '@/server/email/send';
import * as repo from './repository';
import { toMemberDto, toSearchDto, type MemberDto, type MemberSearchDto } from './dto';
import {
  approveMemberSchema,
  createMemberSchema,
  searchSchema,
  updateMemberSchema,
} from './schema';

function fieldErrors(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  const fields: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join('.') || '_';
    (fields[key] ??= []).push(issue.message);
  }
  return fields;
}

const empty = (v?: string | null) => (v && v.length > 0 ? v : null);

export type MemberPage = {
  members: MemberDto[];
  nextCursor: string | null;
};

export async function listMembers(
  actor: Actor,
  options: {
    kind?: 'ALUMNUS' | 'SPEAKER' | 'GUEST';
    expertiseSlug?: string;
    countryCode?: string;
    cursor?: string;
    limit?: number;
    sort?: 'name' | 'recent';
    includeUnpublished?: boolean;
  } = {},
): Promise<Result<MemberPage>> {
  const wantsUnpublished = options.includeUnpublished === true;
  if (wantsUnpublished && !can(actor, 'member:read:unpublished')) {
    return err(forbidden('Only reviewers can see unapproved entries.'));
  }

  const { rows, nextCursor } = await repo.listMembers({
    includeUnpublished: wantsUnpublished,
    kind: options.kind,
    expertiseSlug: options.expertiseSlug,
    countryCode: options.countryCode,
    cursor: options.cursor,
    limit: options.limit,
    sort: options.sort,
  });

  return ok({ members: rows.map((row) => toMemberDto(row, actor)), nextCursor });
}

/**
 * Ranked search, hydrated into the same shape the list returns.
 *
 * Two queries rather than one: the ranking query stays a narrow index scan, and
 * the hydration is a primary-key lookup over at most a page of ids. Selecting
 * every column inside the ranked query would make the GIN scan carry the whole
 * row through the sort for no benefit.
 */
export async function searchMembers(actor: Actor, input: unknown): Promise<Result<MemberPage>> {
  const parsed = searchSchema.safeParse(input);
  if (!parsed.success) {
    return err(validation('That search could not be run.', { fields: fieldErrors(parsed.error) }));
  }

  const includeUnpublished =
    parsed.data.includeUnpublished === true && can(actor, 'member:read:unpublished');

  const ranked = await repo.searchMembers({
    query: parsed.data.q,
    includeUnpublished,
    limit: parsed.data.limit,
  });

  const rows = await repo.findManyByIds(ranked.map((r) => r.id));

  // Ranked search is not cursor-paginated: relevance ordering is not stable
  // enough to resume from, so the result set is capped instead.
  return ok({ members: rows.map((row) => toMemberDto(row, actor)), nextCursor: null });
}

/** The light-weight ranked rows, for a type-ahead that needs no full record. */
export async function suggestMembers(
  actor: Actor,
  input: unknown,
): Promise<Result<MemberSearchDto[]>> {
  const parsed = searchSchema.safeParse(input);
  if (!parsed.success) {
    return err(validation('That search could not be run.', { fields: fieldErrors(parsed.error) }));
  }

  const rows = await repo.searchMembers({
    query: parsed.data.q,
    includeUnpublished: can(actor, 'member:read:unpublished'),
    limit: parsed.data.limit ?? 8,
  });

  return ok(rows.map(toSearchDto));
}

export async function getMember(actor: Actor, idOrSlug: string): Promise<Result<MemberDto>> {
  const record =
    (await repo.findMemberBySlug(idOrSlug)) ?? (await repo.findMemberById(idOrSlug));

  if (!record) return err(notFound('That profile could not be found.'));

  if (
    !can(actor, 'member:read', {
      isPublished: record.status === 'APPROVED',
      ownerId: record.submittedById,
    })
  ) {
    // NotFound rather than Forbidden: telling a stranger that a profile exists
    // but is unpublished is itself a disclosure.
    return err(notFound('That profile could not be found.'));
  }

  return ok(toMemberDto(record, actor));
}

export async function createMember(actor: Actor, input: unknown): Promise<Result<MemberDto>> {
  if (actor.kind !== 'user') return err(unauthenticated());
  if (!can(actor, 'member:create')) {
    return err(forbidden('You need to be signed in to submit an entry.'));
  }

  const parsed = createMemberSchema.safeParse(input);
  if (!parsed.success) {
    return err(validation('Check the highlighted fields.', { fields: fieldErrors(parsed.error) }));
  }

  const data = parsed.data;
  const isReviewer = can(actor, 'member:approve');

  try {
    const slug = await uniqueSlug(data.legalName, repo.slugExists);

    const created = await repo.createMember({
      slug,
      kind: data.kind,
      legalName: data.legalName,
      initiatedName: empty(data.initiatedName),
      headline: empty(data.headline),
      bio: data.bio,
      city: empty(data.city),
      countryCode: empty(data.countryCode),
      cohort: empty(data.cohort),
      email: empty(data.email),
      story: empty(data.story),
      recommendation: empty(data.recommendation),
      // A reviewer's own submission publishes immediately; everyone else waits.
      status: isReviewer ? 'APPROVED' : 'PENDING',
      approvedAt: isReviewer ? new Date() : null,
      approvedById: isReviewer ? actor.id : null,
      submittedById: actor.id,
    });

    if (isReviewer) {
      await audit({
        actorId: actor.id,
        action: 'member.create',
        entity: 'Member',
        entityId: created.id,
        after: { slug: created.slug, status: created.status },
      });
    }

    invalidate(tags.members(), tags.member(created.id));
    return ok(toMemberDto(created, actor));
  } catch (cause) {
    return err(internal('The entry could not be saved.', { cause }));
  }
}

export async function updateMember(
  actor: Actor,
  id: string,
  input: unknown,
): Promise<Result<MemberDto>> {
  if (actor.kind !== 'user') return err(unauthenticated());

  const existing = await repo.findMemberById(id);
  if (!existing) return err(notFound('That profile could not be found.'));

  if (!can(actor, 'member:update', { ownerId: existing.submittedById })) {
    return err(forbidden('You can only edit entries you submitted.'));
  }

  const parsed = updateMemberSchema.safeParse(input);
  if (!parsed.success) {
    return err(validation('Check the highlighted fields.', { fields: fieldErrors(parsed.error) }));
  }

  const data = parsed.data;

  try {
    const updated = await repo.updateMember(id, {
      ...(data.legalName !== undefined ? { legalName: data.legalName } : {}),
      ...(data.initiatedName !== undefined ? { initiatedName: empty(data.initiatedName) } : {}),
      ...(data.headline !== undefined ? { headline: empty(data.headline) } : {}),
      ...(data.bio !== undefined ? { bio: data.bio } : {}),
      ...(data.city !== undefined ? { city: empty(data.city) } : {}),
      ...(data.countryCode !== undefined ? { countryCode: empty(data.countryCode) } : {}),
      ...(data.cohort !== undefined ? { cohort: empty(data.cohort) } : {}),
      ...(data.email !== undefined ? { email: empty(data.email) } : {}),
      ...(data.story !== undefined ? { story: empty(data.story) } : {}),
      ...(data.recommendation !== undefined ? { recommendation: empty(data.recommendation) } : {}),
      ...(data.kind !== undefined ? { kind: data.kind } : {}),
    });

    if (can(actor, 'member:approve')) {
      await audit({
        actorId: actor.id,
        action: 'member.update',
        entity: 'Member',
        entityId: id,
        before: { legalName: existing.legalName, headline: existing.headline },
        after: { legalName: updated.legalName, headline: updated.headline },
      });
    }

    invalidate(tags.members(), tags.member(id));
    return ok(toMemberDto(updated, actor));
  } catch (cause) {
    return err(internal('The entry could not be saved.', { cause }));
  }
}

export async function setMemberApproval(
  actor: Actor,
  id: string,
  input: unknown,
): Promise<Result<void>> {
  if (actor.kind !== 'user') return err(unauthenticated());
  if (!can(actor, 'member:approve')) {
    return err(forbidden('Only reviewers can publish or unpublish an entry.'));
  }

  const parsed = approveMemberSchema.safeParse(input);
  if (!parsed.success) {
    return err(validation('An approval state is required.', { fields: fieldErrors(parsed.error) }));
  }

  const existing = await repo.findMemberById(id);
  if (!existing) return err(notFound('That profile could not be found.'));

  const nextStatus = parsed.data.isApproved ? 'APPROVED' : 'REJECTED';

  try {
    await repo.updateMember(id, {
      status: nextStatus,
      approvedAt: parsed.data.isApproved ? new Date() : null,
      approvedBy: parsed.data.isApproved ? { connect: { id: actor.id } } : { disconnect: true },
    });

    await audit({
      actorId: actor.id,
      action: parsed.data.isApproved ? 'member.approve' : 'member.reject',
      entity: 'Member',
      entityId: id,
      before: { status: existing.status },
      after: { status: nextStatus, reason: parsed.data.reason ?? null },
    });

    // Told, not left to notice. A rejection always carries its reason — a
    // decision the person cannot act on is not a decision they can answer.
    await sendQuietly(
      existing.email,
      parsed.data.isApproved
        ? entryApprovedEmail({ name: existing.legalName, slug: existing.slug })
        : entryRejectedEmail({
            name: existing.legalName,
            reason: parsed.data.reason ?? 'No reason was recorded.',
          }),
    );

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

  if (!can(actor, 'member:delete', { ownerId: existing.submittedById })) {
    return err(forbidden('Only reviewers can remove an entry.'));
  }

  try {
    // Archived, not destroyed: the register's history is part of the register.
    await repo.archiveMember(id);

    await audit({
      actorId: actor.id,
      action: 'member.archive',
      entity: 'Member',
      entityId: id,
      before: { status: existing.status, slug: existing.slug },
      after: { status: 'ARCHIVED' },
    });

    invalidate(tags.members(), tags.member(id));
    return ok(undefined);
  } catch (cause) {
    return err(internal('The entry could not be removed.', { cause }));
  }
}

/** Members adjacent to this one, for the profile page. */
export async function relatedMembers(
  actor: Actor,
  member: MemberDto,
  limit = 6,
): Promise<MemberDto[]> {
  const rows = await repo.findRelated(
    { id: member.id, city: member.city, expertiseSlugs: member.expertise.map((e) => e.slug) },
    limit,
  );
  return rows.map((row) => toMemberDto(row, actor));
}

export type Facets = {
  expertise: { slug: string; label: string; category: string | null; count: number }[];
  countries: { code: string; name: string; count: number }[];
};

/** The filter vocabulary, built from what the register actually contains. */
export async function listFacets(): Promise<Result<Facets>> {
  const [expertise, countries] = await Promise.all([repo.listExpertise(), repo.listCountries()]);

  const display = new Intl.DisplayNames(undefined, { type: 'region' });
  const named = countries.map((c) => {
    let name = c.countryCode;
    try {
      name = display.of(c.countryCode) ?? c.countryCode;
    } catch {
      // Leave the raw code; an unknown region is still a usable filter.
    }
    return { code: c.countryCode, name, count: c.count };
  });

  return ok({
    expertise: expertise.map((r) => ({
      slug: r.slug,
      label: r.label,
      category: r.category,
      count: r._count.members,
    })),
    countries: named.sort((a, b) => a.name.localeCompare(b.name)),
  });
}

export async function listExpertise(): Promise<Result<{ slug: string; label: string; category: string | null; count: number }[]>> {
  const rows = await repo.listExpertise();
  return ok(
    rows.map((r) => ({
      slug: r.slug,
      label: r.label,
      category: r.category,
      count: r._count.members,
    })),
  );
}

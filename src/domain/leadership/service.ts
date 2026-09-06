import { can, type Actor } from '@/server/policy';
import { forbidden, internal, notFound, unauthenticated, validation } from '@/server/errors';
import { err, ok, type Result } from '@/server/result';
import { invalidate, tags } from '@/server/cache';
import { uniqueSlug } from '@/lib/slug';
import { record as audit } from '@/domain/audit/service';
import * as repo from './repository';
import { toLeadershipDto, type LeadershipProfileDto } from './dto';
import {
  addLeadershipMediaSchema,
  setPortraitSchema,
  updateLeadershipSchema,
} from './schema';

function fieldErrors(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  const fields: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join('.') || '_';
    (fields[key] ??= []).push(issue.message);
  }
  return fields;
}

const empty = (value?: string | null) => (value && value.length > 0 ? value : null);

/**
 * The people who carry the initiative.
 *
 * Reads are open to anyone once published; every write is a reviewer action and
 * writes an audit row, because this is the one page on the site that speaks in
 * the institution's own voice — a silent edit here is the edit most worth being
 * able to trace.
 */
export async function listLeadership(actor: Actor): Promise<Result<LeadershipProfileDto[]>> {
  const includeUnpublished = can(actor, 'leadership:read:unpublished');
  const rows = await repo.listProfiles({ includeUnpublished });
  return ok(rows.map(toLeadershipDto));
}

export async function getLeadershipProfile(
  actor: Actor,
  idOrSlug: string,
): Promise<Result<LeadershipProfileDto>> {
  const record = (await repo.findBySlug(idOrSlug)) ?? (await repo.findById(idOrSlug));
  if (!record) return err(notFound('That profile could not be found.'));

  if (!can(actor, 'leadership:read', { isPublished: record.status === 'PUBLISHED' })) {
    // NotFound rather than Forbidden: confirming that an unpublished profile
    // exists is itself a disclosure.
    return err(notFound('That profile could not be found.'));
  }

  return ok(toLeadershipDto(record));
}

export async function createLeadershipProfile(
  actor: Actor,
  input: unknown,
): Promise<Result<LeadershipProfileDto>> {
  if (actor.kind !== 'user') return err(unauthenticated());
  if (!can(actor, 'leadership:update')) {
    return err(forbidden('Only reviewers can add a leadership profile.'));
  }

  const parsed = updateLeadershipSchema.safeParse(input);
  if (!parsed.success) {
    return err(validation('Check the highlighted fields.', { fields: fieldErrors(parsed.error) }));
  }

  const data = parsed.data;

  try {
    // The slug is derived once, at creation, and never again: the address of a
    // profile has to survive the person changing how their name is written.
    const slug = await uniqueSlug(data.name, repo.slugExists);

    const created = await repo.create({
      slug,
      name: data.name,
      bio: data.bio,
      honorific: empty(data.honorific),
      initiatedName: empty(data.initiatedName),
      role: empty(data.role),
      headline: empty(data.headline),
      focusAreas: empty(data.focusAreas),
      initiatives: empty(data.initiatives),
      status: data.status,
      orderIndex: data.orderIndex ?? 0,
      updatedById: actor.id,
    });

    await audit({
      actorId: actor.id,
      action: 'leadership.create',
      entity: 'LeadershipProfile',
      entityId: created.id,
      after: { slug: created.slug, name: created.name, status: created.status },
    });

    invalidate(tags.leadership());
    return ok(toLeadershipDto(created));
  } catch (cause) {
    return err(internal('The profile could not be saved.', { cause }));
  }
}

export async function updateLeadershipProfile(
  actor: Actor,
  id: string,
  input: unknown,
): Promise<Result<LeadershipProfileDto>> {
  if (actor.kind !== 'user') return err(unauthenticated());
  if (!can(actor, 'leadership:update')) {
    return err(forbidden('Only reviewers can edit a leadership profile.'));
  }

  const existing = await repo.findById(id);
  if (!existing) return err(notFound('That profile could not be found.'));

  const parsed = updateLeadershipSchema.safeParse(input);
  if (!parsed.success) {
    return err(validation('Check the highlighted fields.', { fields: fieldErrors(parsed.error) }));
  }

  const data = parsed.data;

  try {
    const updated = await repo.update(id, {
      honorific: empty(data.honorific),
      name: data.name,
      initiatedName: empty(data.initiatedName),
      role: empty(data.role),
      headline: empty(data.headline),
      bio: data.bio,
      focusAreas: empty(data.focusAreas),
      initiatives: empty(data.initiatives),
      status: data.status,
      ...(data.orderIndex !== undefined ? { orderIndex: data.orderIndex } : {}),
      updatedById: actor.id,
    });

    await audit({
      actorId: actor.id,
      action: 'leadership.update',
      entity: 'LeadershipProfile',
      entityId: id,
      // The whole bio is not recorded: the audit trail answers who changed what
      // and when, and a diff of 20,000 characters per edit answers neither.
      before: { name: existing.name, status: existing.status, bioLength: existing.bio.length },
      after: { name: updated.name, status: updated.status, bioLength: updated.bio.length },
    });

    invalidate(tags.leadership());
    return ok(toLeadershipDto(updated));
  } catch (cause) {
    return err(internal('The profile could not be saved.', { cause }));
  }
}

export async function setLeadershipPortrait(
  actor: Actor,
  id: string,
  input: unknown,
): Promise<Result<LeadershipProfileDto>> {
  if (actor.kind !== 'user') return err(unauthenticated());
  if (!can(actor, 'leadership:media:manage')) {
    return err(forbidden('Only reviewers can change a portrait.'));
  }

  const existing = await repo.findById(id);
  if (!existing) return err(notFound('That profile could not be found.'));

  const parsed = setPortraitSchema.safeParse(input);
  if (!parsed.success) {
    return err(validation('The portrait could not be set.', { fields: fieldErrors(parsed.error) }));
  }

  try {
    const updated = await repo.setPortrait(
      id,
      parsed.data.assetId,
      parsed.data.assetId ? (parsed.data.alt ?? null) : null,
    );

    await audit({
      actorId: actor.id,
      action: parsed.data.assetId ? 'leadership.portrait.set' : 'leadership.portrait.clear',
      entity: 'LeadershipProfile',
      entityId: id,
      before: { portraitAssetId: existing.portraitAsset?.id ?? null },
      after: { portraitAssetId: parsed.data.assetId },
    });

    invalidate(tags.leadership());
    return ok(toLeadershipDto(updated));
  } catch (cause) {
    return err(internal('The portrait could not be saved.', { cause }));
  }
}

export async function addLeadershipMedia(
  actor: Actor,
  profileId: string,
  assetId: string,
  input: unknown,
): Promise<Result<{ id: string }>> {
  if (actor.kind !== 'user') return err(unauthenticated());
  if (!can(actor, 'leadership:media:manage')) {
    return err(forbidden('Only reviewers can publish files here.'));
  }

  const profile = await repo.findById(profileId);
  if (!profile) return err(notFound('That profile could not be found.'));

  const parsed = addLeadershipMediaSchema.safeParse(input);
  if (!parsed.success) {
    return err(validation('Check the highlighted fields.', { fields: fieldErrors(parsed.error) }));
  }

  try {
    const created = await repo.addMedia({
      profileId,
      assetId,
      kind: parsed.data.kind,
      title: parsed.data.title,
      description: empty(parsed.data.description),
      orderIndex: parsed.data.orderIndex ?? 0,
    });

    await audit({
      actorId: actor.id,
      action: 'leadership.media.add',
      entity: 'LeadershipMedia',
      entityId: created.id,
      after: { profileId, kind: parsed.data.kind, title: parsed.data.title },
    });

    invalidate(tags.leadership());
    return ok(created);
  } catch (cause) {
    return err(internal('The file could not be published.', { cause }));
  }
}

export async function removeLeadershipMedia(
  actor: Actor,
  mediaId: string,
): Promise<Result<void>> {
  if (actor.kind !== 'user') return err(unauthenticated());
  if (!can(actor, 'leadership:media:manage')) {
    return err(forbidden('Only reviewers can remove a published file.'));
  }

  const existing = await repo.findMedia(mediaId);
  if (!existing) return err(notFound('That file could not be found.'));

  try {
    // Archived, not destroyed. The stored object is deliberately left in place:
    // an admin who removes the wrong file should be one database edit from
    // having it back, not dependent on someone still holding a copy.
    await repo.archiveMedia(mediaId);

    await audit({
      actorId: actor.id,
      action: 'leadership.media.remove',
      entity: 'LeadershipMedia',
      entityId: mediaId,
      before: { profileId: existing.profileId, kind: existing.kind, title: existing.title },
    });

    invalidate(tags.leadership());
    return ok(undefined);
  } catch (cause) {
    return err(internal('The file could not be removed.', { cause }));
  }
}

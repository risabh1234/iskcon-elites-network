import { can, type Actor } from '@/server/policy';
import { conflict, forbidden, notFound, unauthenticated, validation, internal } from '@/server/errors';
import { err, ok, type Result } from '@/server/result';
import { invalidate, tags } from '@/server/cache';
import { uniqueSlug } from '@/lib/slug';
import { record as audit } from '@/domain/audit/service';
import * as repo from './repository';
import { toEventDto, type EventDto } from './dto';
import { createEventSchema, updateEventSchema } from './schema';

function fieldErrors(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  const fields: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join('.') || '_';
    (fields[key] ??= []).push(issue.message);
  }
  return fields;
}

const empty = (v?: string | null) => (v && v.length > 0 ? v : null);

export async function listEvents(
  actor: Actor,
  options: { when?: 'upcoming' | 'past' } = {},
): Promise<Result<EventDto[]>> {
  const rows = await repo.listEvents({
    includeUnpublished: can(actor, 'event:read:unpublished'),
    when: options.when,
  });
  return ok(rows.map(toEventDto));
}

/** Counts for the console, so no component has to read the clock. */
export async function countEvents(actor: Actor): Promise<Result<{ total: number; upcoming: number }>> {
  const rows = await repo.listEvents({ includeUnpublished: can(actor, 'event:read:unpublished') });
  const now = Date.now();
  return ok({
    total: rows.length,
    upcoming: rows.filter((row) => row.startsAt.getTime() >= now).length,
  });
}

export async function getEvent(actor: Actor, idOrSlug: string): Promise<Result<EventDto>> {
  const record = (await repo.findEventBySlug(idOrSlug)) ?? (await repo.findEventById(idOrSlug));
  if (!record) return err(notFound('That event could not be found.'));

  if (!can(actor, 'event:read', { isPublished: record.status === 'PUBLISHED' })) {
    return err(notFound('That event could not be found.'));
  }

  return ok(toEventDto(record));
}

export async function createEvent(actor: Actor, input: unknown): Promise<Result<EventDto>> {
  if (actor.kind !== 'user') return err(unauthenticated());
  if (!can(actor, 'event:create')) {
    return err(forbidden('You do not have permission to create events.'));
  }

  const parsed = createEventSchema.safeParse(input);
  if (!parsed.success) {
    return err(validation('Check the highlighted fields.', { fields: fieldErrors(parsed.error) }));
  }

  const data = parsed.data;

  try {
    const created = await repo.createEvent({
      slug: await uniqueSlug(data.title, repo.slugExists),
      title: data.title,
      description: empty(data.description),
      startsAt: data.startsAt,
      endsAt: data.endsAt ?? null,
      timezone: data.timezone,
      mode: data.mode,
      venue: empty(data.venue),
      city: empty(data.city),
      countryCode: empty(data.countryCode),
      onlineUrl: empty(data.onlineUrl),
      capacity: data.capacity ?? null,
      isHighlighted: data.isHighlighted,
      createdById: actor.id,
    });

    if (data.isHighlighted) await repo.clearHighlightsExcept(created.id);

    await audit({
      actorId: actor.id,
      action: 'event.create',
      entity: 'Event',
      entityId: created.id,
      after: { slug: created.slug, startsAt: created.startsAt.toISOString(), timezone: created.timezone },
    });

    invalidate(tags.events(), tags.event(created.id));
    return ok(toEventDto(created));
  } catch (cause) {
    return err(internal('The event could not be saved.', { cause }));
  }
}

export async function updateEvent(
  actor: Actor,
  id: string,
  input: unknown,
): Promise<Result<EventDto>> {
  if (actor.kind !== 'user') return err(unauthenticated());

  const existing = await repo.findEventById(id);
  if (!existing) return err(notFound('That event could not be found.'));

  // `canCreateEvents` grants authorship, not authority over other people's
  // events — the pre-Phase-3 handler let it edit and delete anything.
  if (!can(actor, 'event:update', { ownerId: existing.createdById })) {
    return err(forbidden('You can only edit events you created.'));
  }

  const parsed = updateEventSchema.safeParse(input);
  if (!parsed.success) {
    return err(validation('Check the highlighted fields.', { fields: fieldErrors(parsed.error) }));
  }

  const data = parsed.data;

  try {
    if (data.isHighlighted) await repo.clearHighlightsExcept(id);

    const updated = await repo.updateEvent(id, {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.description !== undefined ? { description: empty(data.description) } : {}),
      ...(data.startsAt !== undefined ? { startsAt: data.startsAt } : {}),
      ...(data.endsAt !== undefined ? { endsAt: data.endsAt ?? null } : {}),
      ...(data.timezone !== undefined ? { timezone: data.timezone } : {}),
      ...(data.mode !== undefined ? { mode: data.mode } : {}),
      ...(data.venue !== undefined ? { venue: empty(data.venue) } : {}),
      ...(data.city !== undefined ? { city: empty(data.city) } : {}),
      ...(data.countryCode !== undefined ? { countryCode: empty(data.countryCode) } : {}),
      ...(data.onlineUrl !== undefined ? { onlineUrl: empty(data.onlineUrl) } : {}),
      ...(data.capacity !== undefined ? { capacity: data.capacity ?? null } : {}),
      ...(data.isHighlighted !== undefined ? { isHighlighted: data.isHighlighted } : {}),
    });

    await audit({
      actorId: actor.id,
      action: 'event.update',
      entity: 'Event',
      entityId: id,
      before: { startsAt: existing.startsAt.toISOString(), timezone: existing.timezone },
      after: { startsAt: updated.startsAt.toISOString(), timezone: updated.timezone },
    });

    invalidate(tags.events(), tags.event(id));
    return ok(toEventDto(updated));
  } catch (cause) {
    return err(internal('The event could not be saved.', { cause }));
  }
}

export async function deleteEvent(actor: Actor, id: string): Promise<Result<void>> {
  if (actor.kind !== 'user') return err(unauthenticated());

  const existing = await repo.findEventById(id);
  if (!existing) return err(notFound('That event could not be found.'));

  if (!can(actor, 'event:delete', { ownerId: existing.createdById })) {
    return err(forbidden('You can only remove events you created.'));
  }

  try {
    await repo.archiveEvent(id);

    await audit({
      actorId: actor.id,
      action: 'event.cancel',
      entity: 'Event',
      entityId: id,
      before: { status: existing.status, title: existing.title },
      after: { status: 'CANCELLED' },
    });

    invalidate(tags.events(), tags.event(id));
    return ok(undefined);
  } catch (cause) {
    return err(internal('The event could not be removed.', { cause }));
  }
}

export type RegistrationOutcome = { status: 'REGISTERED' | 'WAITLISTED' };

export async function registerForEvent(actor: Actor, id: string): Promise<Result<RegistrationOutcome>> {
  if (actor.kind !== 'user') return err(unauthenticated('Sign in to register.'));

  const event = await repo.findEventById(id);
  if (!event) return err(notFound('That event could not be found.'));

  if (!can(actor, 'event:read', { isPublished: event.status === 'PUBLISHED' })) {
    return err(notFound('That event could not be found.'));
  }
  if (event.status !== 'PUBLISHED') {
    return err(conflict('That event is not open for registration.'));
  }
  if (event.startsAt.getTime() < Date.now()) {
    return err(conflict('That event has already taken place.'));
  }

  try {
    const outcome = await repo.register(id, actor.id);
    if (outcome === 'ALREADY') return err(conflict('You are already registered.'));

    invalidate(tags.event(id), tags.events());
    return ok({ status: outcome });
  } catch (cause) {
    return err(internal('The registration could not be recorded.', { cause }));
  }
}

export async function cancelRegistration(actor: Actor, id: string): Promise<Result<void>> {
  if (actor.kind !== 'user') return err(unauthenticated());

  try {
    await repo.cancelRegistration(id, actor.id);
    invalidate(tags.event(id), tags.events());
    return ok(undefined);
  } catch (cause) {
    return err(internal('The registration could not be cancelled.', { cause }));
  }
}

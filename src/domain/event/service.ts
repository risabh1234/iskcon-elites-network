import { can, type Actor } from '@/server/policy';
import { forbidden, notFound, unauthenticated, validation, internal } from '@/server/errors';
import { err, ok, type Result } from '@/server/result';
import { invalidate, tags } from '@/server/cache';
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

export async function listEvents(actor: Actor): Promise<Result<EventDto[]>> {
  const includeUnpublished = can(actor, 'event:read:unpublished');
  const rows = await repo.listEvents(includeUnpublished);
  return ok(rows.map(toEventDto));
}

export async function getEvent(actor: Actor, id: string): Promise<Result<EventDto>> {
  const record = await repo.findEventById(id);
  if (!record) return err(notFound('That event could not be found.'));

  if (!can(actor, 'event:read', { isPublished: record.isApproved })) {
    return err(notFound('That event could not be found.'));
  }

  return ok(toEventDto(record));
}

export async function createEvent(actor: Actor, input: unknown): Promise<Result<EventDto>> {
  if (!can(actor, 'event:create')) {
    return err(forbidden('You do not have permission to create events.'));
  }
  if (actor.kind !== 'user') return err(forbidden());

  const parsed = createEventSchema.safeParse(input);
  if (!parsed.success) {
    return err(validation('Check the highlighted fields.', { fields: fieldErrors(parsed.error) }));
  }

  const data = parsed.data;

  try {
    const created = await repo.createEvent({
      title: data.title,
      location: data.location,
      date: data.date,
      time: data.time,
      description: data.description || null,
      imageUrl: data.imageUrl || null,
      isHighlighted: data.isHighlighted,
      addedById: actor.id,
      isApproved: true,
    });

    if (data.isHighlighted) await repo.clearHighlightsExcept(created.id);

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

  // Ownership matters here: `canCreateEvents` used to authorise editing and
  // deleting *anyone's* event, which is not what "may create events" means.
  if (!can(actor, 'event:update', { ownerId: existing.addedById })) {
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
      ...(data.location !== undefined ? { location: data.location } : {}),
      ...(data.date !== undefined ? { date: data.date } : {}),
      ...(data.time !== undefined ? { time: data.time } : {}),
      ...(data.description !== undefined ? { description: data.description || null } : {}),
      ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl || null } : {}),
      ...(data.isHighlighted !== undefined ? { isHighlighted: data.isHighlighted } : {}),
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

  if (!can(actor, 'event:delete', { ownerId: existing.addedById })) {
    return err(forbidden('You can only remove events you created.'));
  }

  try {
    await repo.deleteEvent(id);
    invalidate(tags.events(), tags.event(id));
    return ok(undefined);
  } catch (cause) {
    return err(internal('The event could not be removed.', { cause }));
  }
}

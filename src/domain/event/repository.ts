import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import type { EventRecord } from './dto';

const SELECT = {
  id: true, slug: true, title: true, description: true, startsAt: true, endsAt: true,
  timezone: true, mode: true, venue: true, city: true, countryCode: true, onlineUrl: true,
  capacity: true, status: true, isHighlighted: true, createdAt: true, createdById: true,
  _count: { select: { registrations: { where: { status: { in: ['REGISTERED', 'ATTENDED'] } } } } },
} satisfies Prisma.EventSelect;

const LIVE = { deletedAt: null } satisfies Prisma.EventWhereInput;

export async function listEvents(options: {
  includeUnpublished: boolean;
  when?: 'upcoming' | 'past';
}): Promise<EventRecord[]> {
  const now = new Date();

  const rows = await prisma.event.findMany({
    where: {
      ...LIVE,
      ...(options.includeUnpublished ? {} : { status: 'PUBLISHED' }),
      ...(options.when === 'upcoming' ? { startsAt: { gte: now } } : {}),
      ...(options.when === 'past' ? { startsAt: { lt: now } } : {}),
    },
    select: SELECT,
    // Upcoming reads forward from now; past reads backward from now.
    orderBy: { startsAt: options.when === 'past' ? 'desc' : 'asc' },
  });

  return rows as unknown as EventRecord[];
}

export async function findEventById(id: string): Promise<EventRecord | null> {
  const row = await prisma.event.findFirst({ where: { id, ...LIVE }, select: SELECT });
  return row as unknown as EventRecord | null;
}

export async function findEventBySlug(slug: string): Promise<EventRecord | null> {
  const row = await prisma.event.findFirst({ where: { slug, ...LIVE }, select: SELECT });
  return row as unknown as EventRecord | null;
}

export async function createEvent(data: {
  slug: string;
  title: string;
  description: string | null;
  startsAt: Date;
  endsAt: Date | null;
  timezone: string;
  mode: 'IN_PERSON' | 'ONLINE' | 'HYBRID';
  venue: string | null;
  city: string | null;
  countryCode: string | null;
  onlineUrl: string | null;
  capacity: number | null;
  isHighlighted: boolean;
  createdById: string;
}): Promise<EventRecord> {
  const row = await prisma.event.create({
    data: { ...data, status: 'PUBLISHED' },
    select: SELECT,
  });
  return row as unknown as EventRecord;
}

export async function updateEvent(
  id: string,
  data: Prisma.EventUpdateInput,
): Promise<EventRecord> {
  const row = await prisma.event.update({ where: { id }, data, select: SELECT });
  return row as unknown as EventRecord;
}

/** Soft delete, consistent with members. */
export async function archiveEvent(id: string): Promise<void> {
  await prisma.event.update({ where: { id }, data: { deletedAt: new Date(), status: 'CANCELLED' } });
}

export async function clearHighlightsExcept(id: string | null): Promise<void> {
  await prisma.event.updateMany({
    where: id ? { id: { not: id } } : {},
    data: { isHighlighted: false },
  });
}

export async function slugExists(slug: string): Promise<boolean> {
  return (await prisma.event.count({ where: { slug } })) > 0;
}

/**
 * Registers a member, respecting capacity.
 *
 * Done in a transaction with the count taken inside it: reading the count and
 * then inserting leaves a window where two concurrent requests both see the
 * last free place. The unique index on (eventId, userId) is the other half —
 * it stops a double registration regardless of timing.
 */
export async function register(
  eventId: string,
  userId: string,
): Promise<'REGISTERED' | 'WAITLISTED' | 'ALREADY'> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.eventRegistration.findUnique({
      where: { eventId_userId: { eventId, userId } },
      select: { status: true },
    });
    if (existing && existing.status !== 'CANCELLED') return 'ALREADY';

    const event = await tx.event.findUnique({ where: { id: eventId }, select: { capacity: true } });
    const taken = await tx.eventRegistration.count({
      where: { eventId, status: { in: ['REGISTERED', 'ATTENDED'] } },
    });

    const status =
      event?.capacity != null && taken >= event.capacity ? 'WAITLISTED' : 'REGISTERED';

    await tx.eventRegistration.upsert({
      where: { eventId_userId: { eventId, userId } },
      update: { status, registeredAt: new Date() },
      create: { eventId, userId, status },
    });

    return status;
  });
}

export async function cancelRegistration(eventId: string, userId: string): Promise<void> {
  await prisma.eventRegistration.updateMany({
    where: { eventId, userId },
    data: { status: 'CANCELLED' },
  });
}

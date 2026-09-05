import prisma from '@/lib/prisma';
import type { EventRecord } from './dto';

const FIELDS = {
  id: true, title: true, location: true, date: true, time: true, description: true,
  imageUrl: true, isHighlighted: true, isApproved: true, createdAt: true, addedById: true,
} as const;

export async function listEvents(includeUnpublished: boolean): Promise<EventRecord[]> {
  return prisma.event.findMany({
    where: includeUnpublished ? {} : { isApproved: true },
    select: FIELDS,
    orderBy: { date: 'asc' },
  });
}

export async function findEventById(id: string): Promise<EventRecord | null> {
  return prisma.event.findUnique({ where: { id }, select: FIELDS });
}

export async function createEvent(data: {
  title: string; location: string; date: Date; time: string;
  description: string | null; imageUrl: string | null; isHighlighted: boolean;
  addedById: string; isApproved: boolean;
}): Promise<EventRecord> {
  return prisma.event.create({ data, select: FIELDS });
}

export async function updateEvent(
  id: string,
  data: Partial<{
    title: string; location: string; date: Date; time: string;
    description: string | null; imageUrl: string | null; isHighlighted: boolean;
  }>,
): Promise<EventRecord> {
  return prisma.event.update({ where: { id }, data, select: FIELDS });
}

export async function deleteEvent(id: string): Promise<void> {
  await prisma.event.delete({ where: { id } });
}

/** Only one event is highlighted at a time. */
export async function clearHighlightsExcept(id: string | null): Promise<void> {
  await prisma.event.updateMany({
    where: id ? { id: { not: id } } : {},
    data: { isHighlighted: false },
  });
}

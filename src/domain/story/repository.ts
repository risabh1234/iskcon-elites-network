import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';

const SELECT = {
  id: true, slug: true, title: true, excerpt: true, body: true,
  status: true, publishedAt: true, createdAt: true, authorId: true,
  author: { select: { name: true } },
  member: { select: { slug: true, legalName: true, initiatedName: true } },
} satisfies Prisma.SuccessStorySelect;

const LIVE = { deletedAt: null } satisfies Prisma.SuccessStoryWhereInput;

export type StoryRecord = Prisma.SuccessStoryGetPayload<{ select: typeof SELECT }>;

export async function listStories(includeUnpublished: boolean): Promise<StoryRecord[]> {
  return prisma.successStory.findMany({
    where: { ...LIVE, ...(includeUnpublished ? {} : { status: 'PUBLISHED' }) },
    select: SELECT,
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function findBySlug(slug: string): Promise<StoryRecord | null> {
  return prisma.successStory.findFirst({ where: { slug, ...LIVE }, select: SELECT });
}

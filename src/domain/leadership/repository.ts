import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import type { LeadershipMediaKind, LeadershipProfileRecord, LeadershipStatus } from './dto';

/**
 * The only file in the leadership domain that touches Prisma.
 *
 * Soft deletion is filtered here and nowhere else: `deletedAt: null` appears on
 * the profile query AND on the nested media query, because a removed photograph
 * hanging off a live profile would otherwise still render.
 */
const SELECT = {
  id: true,
  slug: true,
  honorific: true,
  name: true,
  initiatedName: true,
  role: true,
  headline: true,
  bio: true,
  focusAreas: true,
  initiatives: true,
  status: true,
  orderIndex: true,
  portraitAlt: true,
  updatedAt: true,
  portraitAsset: { select: { id: true, key: true, bucket: true } },
  media: {
    where: { deletedAt: null },
    orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      kind: true,
      title: true,
      description: true,
      orderIndex: true,
      createdAt: true,
      asset: { select: { id: true, key: true, bucket: true, mime: true, bytes: true } },
    },
  },
  // `satisfies` rather than `as const`: the literals still narrow to Prisma's
  // enums, but the arrays stay mutable, which is what the query builder wants.
} satisfies Prisma.LeadershipProfileSelect;

/** Ascending order, name breaking ties, so the page never reshuffles. */
const ORDER: Prisma.LeadershipProfileOrderByWithRelationInput[] = [
  { orderIndex: 'asc' },
  { name: 'asc' },
];

export async function listProfiles(options: {
  includeUnpublished: boolean;
}): Promise<LeadershipProfileRecord[]> {
  const rows = await prisma.leadershipProfile.findMany({
    where: {
      deletedAt: null,
      ...(options.includeUnpublished ? {} : { status: 'PUBLISHED' }),
    },
    orderBy: ORDER,
    select: SELECT,
  });

  return rows as unknown as LeadershipProfileRecord[];
}

export async function findById(id: string): Promise<LeadershipProfileRecord | null> {
  const row = await prisma.leadershipProfile.findFirst({
    where: { id, deletedAt: null },
    select: SELECT,
  });
  return row as unknown as LeadershipProfileRecord | null;
}

export async function findBySlug(slug: string): Promise<LeadershipProfileRecord | null> {
  const row = await prisma.leadershipProfile.findFirst({
    where: { slug, deletedAt: null },
    select: SELECT,
  });
  return row as unknown as LeadershipProfileRecord | null;
}

/** Slugs are never reused, so an archived profile still reserves its own. */
export async function slugExists(slug: string): Promise<boolean> {
  return (await prisma.leadershipProfile.count({ where: { slug } })) > 0;
}

export type NewProfile = {
  slug: string;
  name: string;
  bio: string;
  honorific: string | null;
  initiatedName: string | null;
  role: string | null;
  headline: string | null;
  focusAreas: string | null;
  initiatives: string | null;
  status: LeadershipStatus;
  orderIndex: number;
  updatedById: string;
};

export async function create(data: NewProfile): Promise<LeadershipProfileRecord> {
  const row = await prisma.leadershipProfile.create({ data, select: SELECT });
  return row as unknown as LeadershipProfileRecord;
}

export type ProfileUpdate = {
  honorific?: string | null;
  name?: string;
  initiatedName?: string | null;
  role?: string | null;
  headline?: string | null;
  bio?: string;
  focusAreas?: string | null;
  initiatives?: string | null;
  status?: LeadershipStatus;
  orderIndex?: number;
  updatedById?: string | null;
};

export async function update(
  id: string,
  data: ProfileUpdate,
): Promise<LeadershipProfileRecord> {
  const row = await prisma.leadershipProfile.update({
    where: { id },
    data,
    select: SELECT,
  });
  return row as unknown as LeadershipProfileRecord;
}

export async function setPortrait(
  id: string,
  assetId: string | null,
  alt: string | null,
): Promise<LeadershipProfileRecord> {
  const row = await prisma.leadershipProfile.update({
    where: { id },
    data: {
      portraitAsset: assetId ? { connect: { id: assetId } } : { disconnect: true },
      portraitAlt: alt,
    },
    select: SELECT,
  });
  return row as unknown as LeadershipProfileRecord;
}

export async function addMedia(input: {
  profileId: string;
  assetId: string;
  kind: LeadershipMediaKind;
  title: string;
  description: string | null;
  orderIndex: number;
}): Promise<{ id: string }> {
  return prisma.leadershipMedia.create({ data: input, select: { id: true } });
}

export async function findMedia(id: string) {
  return prisma.leadershipMedia.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      profileId: true,
      kind: true,
      title: true,
      asset: { select: { id: true, key: true } },
    },
  });
}

/** Archival, like every other removal here — the row stays, the page stops. */
export async function archiveMedia(id: string): Promise<void> {
  await prisma.leadershipMedia.update({ where: { id }, data: { deletedAt: new Date() } });
}

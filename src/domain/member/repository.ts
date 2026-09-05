import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import type { MemberRecord, MemberSearchRow } from './dto';

/**
 * The only module that talks to Prisma about members.
 *
 * `Alumnus` and `Speaker` are gone: one `Member` table with a `kind`, so
 * nothing above this file branches on a category string any more.
 */

const SELECT = {
  id: true, slug: true, kind: true, legalName: true, initiatedName: true,
  headline: true, bio: true, city: true, countryCode: true, cohort: true,
  email: true, story: true, recommendation: true, status: true, visibility: true,
  approvedAt: true, createdAt: true, submittedById: true, userId: true,
  avatarAsset: { select: { key: true, bucket: true, blurhash: true, width: true, height: true } },
  expertise: { select: { expertise: { select: { slug: true, label: true, category: true } } } },
  roles: {
    where: { isCurrent: true },
    select: { title: true, organization: { select: { name: true, slug: true } } },
  },
  links: { select: { kind: true, url: true, label: true } },
} satisfies Prisma.MemberSelect;

/** Soft-deleted rows are invisible to every query. */
const LIVE = { deletedAt: null } satisfies Prisma.MemberWhereInput;

export type ListOptions = {
  includeUnpublished: boolean;
  kind?: 'ALUMNUS' | 'SPEAKER' | 'GUEST';
  expertiseSlug?: string;
  countryCode?: string;
  /** Cursor pagination: the id of the last row of the previous page. */
  cursor?: string;
  limit?: number;
  sort?: 'name' | 'recent';
};

function whereFor(options: ListOptions): Prisma.MemberWhereInput {
  return {
    ...LIVE,
    ...(options.includeUnpublished ? {} : { status: 'APPROVED' }),
    ...(options.kind ? { kind: options.kind } : {}),
    ...(options.countryCode ? { countryCode: options.countryCode } : {}),
    ...(options.expertiseSlug
      ? { expertise: { some: { expertise: { slug: options.expertiseSlug } } } }
      : {}),
  };
}

export async function listMembers(
  options: ListOptions,
): Promise<{ rows: MemberRecord[]; nextCursor: string | null }> {
  const limit = Math.min(options.limit ?? 24, 100);

  const rows = await prisma.member.findMany({
    where: whereFor(options),
    select: SELECT,
    // Cursor pagination, not offset: offset degrades linearly and silently
    // duplicates or drops rows when the underlying set changes between pages.
    ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    take: limit + 1,
    orderBy:
      options.sort === 'recent'
        ? [{ createdAt: 'desc' }, { id: 'asc' }]
        : [{ legalName: 'asc' }, { id: 'asc' }],
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  return {
    rows: page as unknown as MemberRecord[],
    nextCursor: hasMore ? (page[page.length - 1]!.id ?? null) : null,
  };
}

export async function countMembers(options: ListOptions): Promise<number> {
  return prisma.member.count({ where: whereFor(options) });
}

export async function findMemberById(id: string): Promise<MemberRecord | null> {
  const row = await prisma.member.findFirst({ where: { id, ...LIVE }, select: SELECT });
  return row as unknown as MemberRecord | null;
}

export async function findMemberBySlug(slug: string): Promise<MemberRecord | null> {
  const row = await prisma.member.findFirst({ where: { slug, ...LIVE }, select: SELECT });
  return row as unknown as MemberRecord | null;
}

/**
 * Ranked search.
 *
 * Full-text first (`ts_rank_cd` over the weighted generated column), with a
 * trigram similarity fallback so a misspelling still finds the person —
 * `to_tsquery` returns nothing at all for "bhaktivedanata", which is exactly
 * the case a directory has to handle.
 *
 * Raw SQL because Prisma cannot express tsvector ranking. Every interpolation
 * is a parameter, never string concatenation.
 */
export async function searchMembers(options: {
  query: string;
  includeUnpublished: boolean;
  limit?: number;
}): Promise<MemberSearchRow[]> {
  const limit = Math.min(options.limit ?? 24, 100);
  const query = options.query.trim();
  if (!query) return [];

  // websearch_to_tsquery takes what a person actually types — quoted phrases,
  // OR, leading minus — and never throws on punctuation the way to_tsquery does.
  return prisma.$queryRaw<MemberSearchRow[]>`
    SELECT
      m."id",
      m."slug",
      m."kind"::text        AS "kind",
      m."legalName",
      m."initiatedName",
      m."headline",
      m."city",
      m."countryCode",
      m."status"::text      AS "status",
      GREATEST(
        ts_rank_cd(m."searchVector", websearch_to_tsquery('english', ${query}), 32),
        similarity(
          coalesce(m."legalName", '') || ' ' || coalesce(m."initiatedName", ''),
          ${query}
        )
      ) AS "rank"
    FROM "Member" m
    WHERE m."deletedAt" IS NULL
      AND (${options.includeUnpublished}::boolean OR m."status" = 'APPROVED')
      AND (
        m."searchVector" @@ websearch_to_tsquery('english', ${query})
        OR similarity(
             coalesce(m."legalName", '') || ' ' || coalesce(m."initiatedName", ''),
             ${query}
           ) > 0.25
      )
    ORDER BY "rank" DESC, m."legalName" ASC
    LIMIT ${limit}
  `;
}

export async function createMember(data: {
  slug: string;
  kind: 'ALUMNUS' | 'SPEAKER' | 'GUEST';
  legalName: string;
  initiatedName?: string | null;
  headline?: string | null;
  bio: string;
  city?: string | null;
  countryCode?: string | null;
  cohort?: string | null;
  email?: string | null;
  story?: string | null;
  recommendation?: string | null;
  status: 'PENDING' | 'APPROVED';
  approvedAt?: Date | null;
  approvedById?: string | null;
  submittedById: string;
}): Promise<MemberRecord> {
  const row = await prisma.member.create({ data, select: SELECT });
  return row as unknown as MemberRecord;
}

export async function updateMember(
  id: string,
  data: Prisma.MemberUpdateInput,
): Promise<MemberRecord> {
  const row = await prisma.member.update({ where: { id }, data, select: SELECT });
  return row as unknown as MemberRecord;
}

/** Soft delete. A profile is archived, never destroyed. */
export async function archiveMember(id: string): Promise<void> {
  await prisma.member.update({
    where: { id },
    data: { deletedAt: new Date(), status: 'ARCHIVED' },
  });
}

export async function restoreMember(id: string): Promise<void> {
  await prisma.member.update({ where: { id }, data: { deletedAt: null, status: 'PENDING' } });
}

/** True when the slug is free. Slugs are never reused, including by archived rows. */
export async function slugExists(slug: string): Promise<boolean> {
  return (await prisma.member.count({ where: { slug } })) > 0;
}

export async function listExpertise() {
  return prisma.expertise.findMany({
    select: { slug: true, label: true, category: true, _count: { select: { members: true } } },
    orderBy: [{ category: 'asc' }, { label: 'asc' }],
  });
}

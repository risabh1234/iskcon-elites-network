import type { Actor } from '@/server/policy';

export type MemberKind = 'ALUMNUS' | 'SPEAKER' | 'GUEST';
export type MemberStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'ARCHIVED';

/** The shape the repository returns. */
export type MemberRecord = {
  id: string;
  slug: string;
  kind: MemberKind;
  legalName: string;
  initiatedName: string | null;
  headline: string | null;
  bio: string;
  city: string | null;
  countryCode: string | null;
  cohort: string | null;
  email: string | null;
  story: string | null;
  recommendation: string | null;
  status: MemberStatus;
  visibility: 'PUBLIC' | 'NETWORK' | 'PRIVATE';
  approvedAt: Date | null;
  createdAt: Date;
  submittedById: string;
  userId: string | null;
  avatarAsset: {
    key: string;
    bucket: string;
    blurhash: string | null;
    width: number | null;
    height: number | null;
  } | null;
  expertise: { expertise: { slug: string; label: string; category: string | null } }[];
  roles: { title: string; organization: { name: string; slug: string } }[];
  links: { kind: string; url: string; label: string | null }[];
};

/** A row from the ranked search query. */
export type MemberSearchRow = {
  id: string;
  slug: string;
  kind: MemberKind;
  legalName: string;
  initiatedName: string | null;
  headline: string | null;
  city: string | null;
  countryCode: string | null;
  status: MemberStatus;
  rank: number;
};

export type MemberDto = {
  id: string;
  slug: string;
  kind: MemberKind;
  name: string;
  initiatedName: string | null;
  headline: string | null;
  bio: string;
  city: string | null;
  countryCode: string | null;
  location: string | null;
  cohort: string | null;
  story: string | null;
  recommendation: string | null;
  status: MemberStatus;
  avatarUrl: string | null;
  blurhash: string | null;
  expertise: { slug: string; label: string }[];
  organizations: { title: string; name: string; slug: string }[];
  links: { kind: string; url: string; label: string | null }[];
  createdAt: string;
  /** Present only for signed-in members. */
  email?: string | null;

  // ── Compatibility with the pre-Phase-5 UI ──────────────────────────────
  // DirectoryClient and the admin console still read these. They are derived,
  // never stored, and go when Phase 5 rewrites those surfaces.
  /** @deprecated use `kind` */
  roleType: 'Alumni' | 'Speaker';
  /** @deprecated use `cohort` or `headline` */
  primaryLabel: string;
  /** @deprecated use `headline` */
  secondaryLabel: string;
  /** @deprecated use `status` */
  isApproved: boolean;
  /** @deprecated use `headline` */
  title: string | null;
  /** @deprecated */
  category: string | null;
};

/**
 * Who may see a member's contact address (ADR-0016): any signed-in member, so
 * the network can reach itself, but never an anonymous visitor — a public page
 * listing addresses is a harvesting target.
 */
const canSeeContact = (actor: Actor) => actor.kind === 'user';

function publicUrl(asset: MemberRecord['avatarAsset']): string | null {
  if (!asset) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return base ? `${base}/storage/v1/object/public/${asset.bucket}/${asset.key}` : null;
}

function locationOf(record: { city: string | null; countryCode: string | null }): string | null {
  if (!record.city && !record.countryCode) return null;
  if (!record.countryCode) return record.city;

  // Country names are rendered in the reader's own language rather than stored,
  // so the register reads correctly wherever it is opened from.
  const display = new Intl.DisplayNames(undefined, { type: 'region' });
  let country: string | undefined;
  try {
    country = display.of(record.countryCode);
  } catch {
    country = record.countryCode;
  }

  return record.city ? `${record.city}, ${country}` : (country ?? null);
}

export function toMemberDto(record: MemberRecord, actor: Actor): MemberDto {
  const expertise = record.expertise.map((e) => ({
    slug: e.expertise.slug,
    label: e.expertise.label,
  }));

  const organizations = record.roles.map((r) => ({
    title: r.title,
    name: r.organization.name,
    slug: r.organization.slug,
  }));

  const headline =
    record.headline ?? (organizations[0] ? `${organizations[0].title}, ${organizations[0].name}` : null);

  const dto: MemberDto = {
    id: record.id,
    slug: record.slug,
    kind: record.kind,
    name: record.legalName,
    initiatedName: record.initiatedName,
    headline,
    bio: record.bio,
    city: record.city,
    countryCode: record.countryCode,
    location: locationOf(record),
    cohort: record.cohort,
    story: record.story,
    recommendation: record.recommendation,
    status: record.status,
    avatarUrl: publicUrl(record.avatarAsset),
    blurhash: record.avatarAsset?.blurhash ?? null,
    expertise,
    organizations,
    links: record.links,
    createdAt: record.createdAt.toISOString(),

    roleType: record.kind === 'ALUMNUS' ? 'Alumni' : 'Speaker',
    primaryLabel: record.kind === 'ALUMNUS' ? (record.cohort ?? '') : record.kind === 'GUEST' ? 'Guest' : 'Speaker',
    secondaryLabel: headline ?? '',
    isApproved: record.status === 'APPROVED',
    title: headline,
    category: expertise[0]?.label ?? null,
  };

  if (canSeeContact(actor)) dto.email = record.email;

  return dto;
}

/** The lighter shape returned by search, for result lists. */
export type MemberSearchDto = {
  id: string;
  slug: string;
  kind: MemberKind;
  name: string;
  initiatedName: string | null;
  headline: string | null;
  location: string | null;
  status: MemberStatus;
};

export function toSearchDto(row: MemberSearchRow): MemberSearchDto {
  return {
    id: row.id,
    slug: row.slug,
    kind: row.kind,
    name: row.legalName,
    initiatedName: row.initiatedName,
    headline: row.headline,
    location: locationOf(row),
    status: row.status,
  };
}

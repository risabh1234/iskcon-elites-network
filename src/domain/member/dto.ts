import type { Actor } from '@/server/policy';
import type { MemberRoleType } from './schema';

/**
 * What leaves the server.
 *
 * Never return a Prisma model directly: `addedById` and the submitter's contact
 * email are internal, and the previous handlers returned created rows verbatim.
 * The DTO is also where "who may see the email address" is decided, once.
 */
export type MemberDto = {
  id: string;
  roleType: MemberRoleType;
  name: string;
  avatarUrl: string | null;
  primaryLabel: string;
  secondaryLabel: string;
  bio: string;
  story: string | null;
  recommendation: string | null;
  category: string | null;
  cohort: string | null;
  title: string | null;
  isApproved: boolean;
  createdAt: string;
  /** Present only for admins and the owner. */
  email?: string | null;
};

export type MemberRecord = {
  id: string;
  name: string;
  avatarUrl: string | null;
  bio: string;
  email: string | null;
  isApproved: boolean;
  createdAt: Date;
  addedById: string;
  category?: string;
  cohort?: string;
  title?: string;
};

/**
 * Who may see a member's contact address.
 *
 * ADR-0008 left this open after the security hotfix, because it is a product
 * decision rather than a bug. The default encoded here is "the register is for
 * the network": any signed-in member can reach another member, and anonymous
 * visitors cannot harvest addresses from a public page. Narrowing it to
 * owner-and-admin, or opening it to everyone, is a one-line change here and
 * nowhere else — which is the point of having a DTO layer.
 */
const canSeeContact = (actor: Actor) => actor.kind === 'user';

export function toMemberDto(
  record: MemberRecord,
  roleType: MemberRoleType,
  actor: Actor,
): MemberDto {
  const dto: MemberDto = {
    id: record.id,
    roleType,
    name: record.name,
    avatarUrl: record.avatarUrl,
    primaryLabel:
      roleType === 'Alumni'
        ? (record.cohort ?? '')
        : record.title === 'Featured Guest'
          ? 'Guest'
          : 'Speaker',
    secondaryLabel: roleType === 'Alumni' ? (record.category ?? '') : (record.title ?? ''),
    bio: record.bio,
    story: (record as { story?: string | null }).story ?? null,
    recommendation: (record as { recommendation?: string | null }).recommendation ?? null,
    category: record.category ?? null,
    cohort: record.cohort ?? null,
    title: record.title ?? null,
    isApproved: record.isApproved,
    createdAt: record.createdAt.toISOString(),
  };

  // Contact details are not public.
  if (canSeeContact(actor)) {
    dto.email = record.email;
  }

  return dto;
}

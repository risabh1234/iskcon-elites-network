import prisma from '@/lib/prisma';
import type { MemberRoleType } from './schema';
import type { MemberRecord } from './dto';

/**
 * The only module that talks to Prisma about members.
 *
 * `Alumnus` and `Speaker` are the same entity split across two tables, which is
 * why every read here is doubled and every write branches. Phase 4 merges them
 * into one `Member` with a `kind`; when it does, this file changes and nothing
 * above it does.
 */
const ALUMNUS_FIELDS = {
  id: true, name: true, avatarUrl: true, bio: true, email: true, story: true,
  recommendation: true, category: true, cohort: true, isApproved: true,
  createdAt: true, addedById: true,
} as const;

const SPEAKER_FIELDS = {
  id: true, name: true, avatarUrl: true, bio: true, email: true, title: true,
  isApproved: true, createdAt: true, addedById: true,
} as const;

export type MemberWithType = { record: MemberRecord; roleType: MemberRoleType };

export async function listMembers(options: {
  includeUnpublished: boolean;
  roleType?: MemberRoleType;
}): Promise<MemberWithType[]> {
  const where = options.includeUnpublished ? {} : { isApproved: true };

  const [alumni, speakers] = await Promise.all([
    options.roleType === 'Speaker'
      ? Promise.resolve([])
      : prisma.alumnus.findMany({ where, select: ALUMNUS_FIELDS, orderBy: { name: 'asc' } }),
    options.roleType === 'Alumni'
      ? Promise.resolve([])
      : prisma.speaker.findMany({ where, select: SPEAKER_FIELDS, orderBy: { name: 'asc' } }),
  ]);

  return [
    ...alumni.map((record) => ({ record: record as MemberRecord, roleType: 'Alumni' as const })),
    ...speakers.map((record) => ({ record: record as MemberRecord, roleType: 'Speaker' as const })),
  ].sort((a, b) => a.record.name.localeCompare(b.record.name));
}

export async function findMemberById(id: string): Promise<MemberWithType | null> {
  const alumnus = await prisma.alumnus.findUnique({ where: { id }, select: ALUMNUS_FIELDS });
  if (alumnus) return { record: alumnus as MemberRecord, roleType: 'Alumni' };

  const speaker = await prisma.speaker.findUnique({ where: { id }, select: SPEAKER_FIELDS });
  if (speaker) return { record: speaker as MemberRecord, roleType: 'Speaker' };

  return null;
}

export async function createAlumnus(data: {
  name: string; category: string; cohort: string; bio: string;
  story: string | null; recommendation: string | null; email: string | null;
  avatarUrl: string | null; addedById: string; isApproved: boolean;
}): Promise<MemberWithType> {
  const record = await prisma.alumnus.create({ data, select: ALUMNUS_FIELDS });
  return { record: record as MemberRecord, roleType: 'Alumni' };
}

export async function createSpeaker(data: {
  name: string; title: string; bio: string; email: string | null;
  avatarUrl: string | null; addedById: string; isApproved: boolean;
}): Promise<MemberWithType> {
  const record = await prisma.speaker.create({ data, select: SPEAKER_FIELDS });
  return { record: record as MemberRecord, roleType: 'Speaker' };
}

export async function updateAlumnus(
  id: string,
  data: Partial<{
    name: string; category: string; cohort: string; bio: string;
    story: string | null; recommendation: string | null; email: string | null;
    avatarUrl: string | null;
  }>,
): Promise<MemberWithType> {
  const record = await prisma.alumnus.update({ where: { id }, data, select: ALUMNUS_FIELDS });
  return { record: record as MemberRecord, roleType: 'Alumni' };
}

export async function updateSpeaker(
  id: string,
  data: Partial<{ name: string; title: string; bio: string; email: string | null; avatarUrl: string | null }>,
): Promise<MemberWithType> {
  const record = await prisma.speaker.update({ where: { id }, data, select: SPEAKER_FIELDS });
  return { record: record as MemberRecord, roleType: 'Speaker' };
}

export async function setApproval(
  id: string,
  roleType: MemberRoleType,
  isApproved: boolean,
): Promise<void> {
  if (roleType === 'Alumni') await prisma.alumnus.update({ where: { id }, data: { isApproved } });
  else await prisma.speaker.update({ where: { id }, data: { isApproved } });
}

export async function deleteMember(id: string, roleType: MemberRoleType): Promise<void> {
  if (roleType === 'Alumni') await prisma.alumnus.delete({ where: { id } });
  else await prisma.speaker.delete({ where: { id } });
}

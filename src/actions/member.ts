'use server';

import { revalidatePath } from 'next/cache';
import { getActor } from '@/server/auth';
import * as service from '@/domain/member/service';

export type MemberFormState = {
  ok?: boolean;
  error?: string;
  fields?: Record<string, string[]>;
};

function payload(formData: FormData) {
  const value = (name: string) => {
    const raw = formData.get(name);
    return typeof raw === 'string' && raw.trim() !== '' ? raw : undefined;
  };

  return {
    kind: value('kind') ?? 'ALUMNUS',
    legalName: value('legalName'),
    initiatedName: value('initiatedName'),
    headline: value('headline'),
    bio: value('bio'),
    city: value('city'),
    countryCode: value('countryCode'),
    cohort: value('cohort'),
    email: value('email'),
    recommendation: value('recommendation'),
  };
}

export async function createMemberAction(
  _prev: MemberFormState,
  formData: FormData,
): Promise<MemberFormState> {
  const result = await service.createMember(await getActor(), payload(formData));
  if (!result.ok) return { error: result.error.message, fields: result.error.fields };

  revalidatePath('/directory');
  revalidatePath('/admin');
  return { ok: true };
}

export async function updateMemberAction(
  _prev: MemberFormState,
  formData: FormData,
): Promise<MemberFormState> {
  const id = formData.get('id');
  if (typeof id !== 'string') return { error: 'Nothing was selected to edit.' };

  const result = await service.updateMember(await getActor(), id, payload(formData));
  if (!result.ok) return { error: result.error.message, fields: result.error.fields };

  revalidatePath('/directory');
  revalidatePath(`/directory/${result.value.slug}`);
  revalidatePath('/admin');
  return { ok: true };
}

export async function setApprovalAction(
  id: string,
  isApproved: boolean,
  reason?: string,
): Promise<MemberFormState> {
  const result = await service.setMemberApproval(await getActor(), id, { isApproved, reason });
  if (!result.ok) return { error: result.error.message };

  revalidatePath('/directory');
  revalidatePath('/admin');
  return { ok: true };
}

export async function archiveMemberAction(id: string): Promise<MemberFormState> {
  const result = await service.deleteMember(await getActor(), id);
  if (!result.ok) return { error: result.error.message };

  revalidatePath('/directory');
  revalidatePath('/admin');
  return { ok: true };
}

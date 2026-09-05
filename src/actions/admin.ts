'use server';

import { revalidatePath } from 'next/cache';
import { getActor } from '@/server/auth';
import { createMember } from '@/domain/member/service';

export type ProfileData = {
  name: string;
  category: string;
  cohort?: string;
  title?: string;
  bio: string;
  avatarUrl?: string;
};

/**
 * Thin adapter, same as a route handler: resolve the actor, call the service,
 * map the Result. It previously wrote to Prisma directly, with no authorisation
 * beyond "is signed in" and no validation of any kind.
 */
export async function createDirectoryEntry(data: ProfileData) {
  const actor = await getActor();

  const result = await createMember(actor, {
    category: data.category,
    fullName: data.name,
    bio: data.bio,
    cohort: data.cohort,
    title: data.title,
    profileImage: data.avatarUrl,
  });

  if (!result.ok) return { success: false, error: result.error.message };

  revalidatePath('/directory');
  revalidatePath('/admin');
  return { success: true };
}

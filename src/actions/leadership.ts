'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getActor } from '@/server/auth';
import { uploadDocument, uploadImage } from '@/domain/media/service';
import * as service from '@/domain/leadership/service';

export type LeadershipFormState = {
  ok?: boolean;
  error?: string;
  fields?: Record<string, string[]>;
};

const value = (formData: FormData, name: string) => {
  const raw = formData.get(name);
  return typeof raw === 'string' && raw.trim() !== '' ? raw : undefined;
};

/** Adapters revalidate both surfaces: the public page and the console's own view. */
function revalidate() {
  revalidatePath('/leadership');
  revalidatePath('/admin/leadership');
}

/**
 * Rate-limit identity for the upload. The actor is always known here — every
 * one of these actions is refused for anyone but a reviewer — so the header is
 * only a fallback the code path never actually reaches.
 */
async function rateKey(actorId?: string): Promise<string> {
  if (actorId) return `actor:${actorId}`;
  const forwarded = (await headers()).get('x-forwarded-for');
  return `ip:${forwarded?.split(',')[0]?.trim() ?? 'unknown'}`;
}

function profilePayload(formData: FormData) {
  return {
    honorific: value(formData, 'honorific'),
    name: value(formData, 'name'),
    initiatedName: value(formData, 'initiatedName'),
    role: value(formData, 'role'),
    headline: value(formData, 'headline'),
    bio: value(formData, 'bio'),
    focusAreas: value(formData, 'focusAreas'),
    initiatives: value(formData, 'initiatives'),
    status: value(formData, 'status') ?? 'DRAFT',
    orderIndex: value(formData, 'orderIndex'),
  };
}

export async function createLeadershipAction(
  _prev: LeadershipFormState,
  formData: FormData,
): Promise<LeadershipFormState> {
  const result = await service.createLeadershipProfile(await getActor(), profilePayload(formData));
  if (!result.ok) return { error: result.error.message, fields: result.error.fields };

  revalidate();
  // Straight to the editor: a profile with no portrait and no files is not
  // finished, and leaving the reviewer on an empty create form implies it is.
  redirect(`/admin/leadership/${result.value.id}`);
}

export async function updateLeadershipAction(
  _prev: LeadershipFormState,
  formData: FormData,
): Promise<LeadershipFormState> {
  const id = formData.get('id');
  if (typeof id !== 'string') return { error: 'Nothing was selected to edit.' };

  const result = await service.updateLeadershipProfile(
    await getActor(),
    id,
    profilePayload(formData),
  );

  if (!result.ok) return { error: result.error.message, fields: result.error.fields };

  revalidate();
  return { ok: true };
}

/**
 * One action for all three kinds of file, because the difference between them
 * is one field and two branches — two near-identical actions is how the
 * AddEntryModal/EditEntryModal pair drifted.
 */
export async function uploadLeadershipFileAction(
  _prev: LeadershipFormState,
  formData: FormData,
): Promise<LeadershipFormState> {
  const profileId = formData.get('profileId');
  const target = formData.get('target');
  const file = formData.get('file');

  if (typeof profileId !== 'string') return { error: 'Nothing was selected to edit.' };
  if (!(file instanceof File) || file.size === 0) return { error: 'Choose a file to upload.' };
  if (target !== 'PORTRAIT' && target !== 'PHOTO' && target !== 'DOCUMENT') {
    return { error: 'That is not something this page can publish.' };
  }

  const actor = await getActor();
  const key = await rateKey(actor.kind === 'user' ? actor.id : undefined);

  const title = value(formData, 'title');
  // Checked before the upload rather than after: storing a file and then
  // refusing to record it leaves an orphan in the bucket for no reason.
  if (!title) {
    return {
      error: 'Give the file a title.',
      fields: { title: ['A title is what a reader sees instead of the filename.'] },
    };
  }

  const uploaded =
    target === 'DOCUMENT'
      ? await uploadDocument(actor, file, key)
      : await uploadImage(actor, file, key);

  if (!uploaded.ok) return { error: uploaded.error.message };

  const result =
    target === 'PORTRAIT'
      ? await service.setLeadershipPortrait(actor, profileId, {
          assetId: uploaded.value.assetId,
          alt: title,
        })
      : await service.addLeadershipMedia(actor, profileId, uploaded.value.assetId, {
          kind: target,
          title,
          description: value(formData, 'description'),
          orderIndex: value(formData, 'orderIndex'),
        });

  if (!result.ok) return { error: result.error.message, fields: result.error.fields };

  revalidate();
  return { ok: true };
}

export async function removeLeadershipMediaAction(id: string): Promise<LeadershipFormState> {
  const result = await service.removeLeadershipMedia(await getActor(), id);
  if (!result.ok) return { error: result.error.message };

  revalidate();
  return { ok: true };
}

export async function clearLeadershipPortraitAction(
  profileId: string,
): Promise<LeadershipFormState> {
  const result = await service.setLeadershipPortrait(await getActor(), profileId, {
    assetId: null,
  });
  if (!result.ok) return { error: result.error.message };

  revalidate();
  return { ok: true };
}

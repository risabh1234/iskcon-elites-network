'use server';

import { revalidatePath } from 'next/cache';
import { getActor } from '@/server/auth';
import * as service from '@/domain/event/service';

export type EventActionState = { ok?: boolean; error?: string; status?: 'REGISTERED' | 'WAITLISTED' };

export async function registerAction(eventId: string): Promise<EventActionState> {
  const result = await service.registerForEvent(await getActor(), eventId);
  if (!result.ok) return { error: result.error.message };

  revalidatePath('/events');
  return { ok: true, status: result.value.status };
}

export async function cancelRegistrationAction(eventId: string): Promise<EventActionState> {
  const result = await service.cancelRegistration(await getActor(), eventId);
  if (!result.ok) return { error: result.error.message };

  revalidatePath('/events');
  return { ok: true };
}

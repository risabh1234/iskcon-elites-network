'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import * as auth from '@/domain/auth/service';

export type AuthFormState = {
  error?: string;
  fields?: Record<string, string[]>;
};

/** Best-effort caller identity for the rate-limit key. Never stored. */
async function requestContext() {
  const h = await headers();
  const ip =
    h.get('cf-connecting-ip') ??
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown';
  return { rateKey: ip, userAgent: h.get('user-agent') };
}

function safeRedirect(target: FormDataEntryValue | null): string {
  const value = typeof target === 'string' ? target : '';
  // Only same-site paths. Accepting an absolute URL here turns the sign-in form
  // into an open redirect that phishing can point anywhere.
  return value.startsWith('/') && !value.startsWith('//') ? value : '/directory';
}

export async function signUpAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const result = await auth.signUp(
    {
      name: formData.get('name'),
      email: formData.get('email'),
      password: formData.get('password'),
    },
    await requestContext(),
  );

  if (!result.ok) return { error: result.error.message, fields: result.error.fields };

  revalidatePath('/', 'layout');
  redirect(safeRedirect(formData.get('redirectTo')));
}

export async function signInAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const result = await auth.signIn(
    { email: formData.get('email'), password: formData.get('password') },
    await requestContext(),
  );

  if (!result.ok) return { error: result.error.message, fields: result.error.fields };

  revalidatePath('/', 'layout');
  redirect(safeRedirect(formData.get('redirectTo')));
}

export async function signOutAction(): Promise<void> {
  await auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/');
}

import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  GOOGLE_STATE_COOKIE,
  GOOGLE_VERIFIER_COOKIE,
  exchangeCode,
  isGoogleConfigured,
} from '@/server/auth/google';
import { signInWithGoogle } from '@/domain/auth/service';

function fail(origin: string, reason: string) {
  return NextResponse.redirect(`${origin}/sign-in?error=${encodeURIComponent(reason)}`);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;

  if (!isGoogleConfigured()) return fail(origin, 'Google sign-in is not configured.');

  const jar = await cookies();
  const expectedState = jar.get(GOOGLE_STATE_COOKIE)?.value;
  const verifier = jar.get(GOOGLE_VERIFIER_COOKIE)?.value;

  // Consume both immediately: a state value is good for exactly one attempt.
  jar.delete(GOOGLE_STATE_COOKIE);
  jar.delete(GOOGLE_VERIFIER_COOKIE);

  if (url.searchParams.get('error')) return fail(origin, 'Google sign-in was cancelled.');

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  // Without this comparison an attacker can start a flow and replay their own
  // callback to bind their Google identity to somebody else's session.
  if (!code || !state || !expectedState || !verifier || state !== expectedState) {
    return fail(origin, 'That sign-in link was not valid. Try again.');
  }

  try {
    const profile = await exchangeCode({ code, verifier, origin });
    const result = await signInWithGoogle(profile, {
      userAgent: (await headers()).get('user-agent'),
    });

    if (!result.ok) return fail(origin, result.error.message);

    return NextResponse.redirect(`${origin}/directory`);
  } catch {
    return fail(origin, 'Google sign-in failed. Try again.');
  }
}

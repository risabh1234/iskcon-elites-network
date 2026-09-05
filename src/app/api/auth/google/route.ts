import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  GOOGLE_STATE_COOKIE,
  GOOGLE_VERIFIER_COOKIE,
  buildAuthorizeUrl,
  isGoogleConfigured,
  randomToken,
} from '@/server/auth/google';

/** Starts the Google flow: mint state and a PKCE verifier, then hand off. */
export async function GET(request: Request) {
  if (!isGoogleConfigured()) {
    return NextResponse.json({ error: 'Google sign-in is not configured.' }, { status: 404 });
  }

  const origin = new URL(request.url).origin;
  const state = randomToken();
  const verifier = randomToken(64);

  const jar = await cookies();
  const options = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 600,
  };
  jar.set(GOOGLE_STATE_COOKIE, state, options);
  jar.set(GOOGLE_VERIFIER_COOKIE, verifier, options);

  return NextResponse.redirect(await buildAuthorizeUrl({ origin, state, verifier }));
}

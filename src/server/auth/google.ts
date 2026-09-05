import { env } from '@/server/env';

/**
 * Google Sign-In, OAuth 2.0 authorization code flow with PKCE.
 *
 * Two protections that are not optional:
 *  - `state`, stored in a short-lived HttpOnly cookie and compared on return,
 *    stops an attacker starting a flow and pasting their own callback URL to
 *    bind their Google account to a victim's session.
 *  - PKCE (`code_verifier`) stops an intercepted authorization code being
 *    exchanged by anyone but the browser that began the flow.
 */
const AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

export const GOOGLE_STATE_COOKIE = 'ien_oauth_state';
export const GOOGLE_VERIFIER_COOKIE = 'ien_oauth_verifier';

/** Google sign-in appears in the UI only when both keys are configured. */
export function isGoogleConfigured(): boolean {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}

export function redirectUri(origin: string): string {
  return `${origin}/api/auth/google/callback`;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function randomToken(bytes = 32): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(bytes)));
}

async function challengeFor(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return toBase64Url(new Uint8Array(digest));
}

export async function buildAuthorizeUrl(options: {
  origin: string;
  state: string;
  verifier: string;
}): Promise<string> {
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(options.origin),
    response_type: 'code',
    scope: 'openid email profile',
    state: options.state,
    code_challenge: await challengeFor(options.verifier),
    code_challenge_method: 'S256',
    // Ask for an account chooser rather than silently reusing one.
    prompt: 'select_account',
  });

  return `${AUTHORIZE_URL}?${params.toString()}`;
}

export type GoogleProfile = {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
};

export async function exchangeCode(options: {
  code: string;
  verifier: string;
  origin: string;
}): Promise<GoogleProfile> {
  const tokenResponse = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID!,
      client_secret: env.GOOGLE_CLIENT_SECRET!,
      code: options.code,
      code_verifier: options.verifier,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri(options.origin),
    }),
  });

  if (!tokenResponse.ok) throw new Error('Token exchange rejected');

  const token = (await tokenResponse.json()) as { access_token?: string };
  if (!token.access_token) throw new Error('No access token returned');

  const profileResponse = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });

  if (!profileResponse.ok) throw new Error('Could not read the Google profile');

  const profile = (await profileResponse.json()) as {
    sub?: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
  };

  if (!profile.sub || !profile.email) throw new Error('Google profile was incomplete');

  return {
    sub: profile.sub,
    email: profile.email.toLowerCase(),
    emailVerified: profile.email_verified === true,
    name: profile.name ?? null,
  };
}

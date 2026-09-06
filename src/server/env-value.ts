/**
 * Normalises an environment variable as it was actually supplied, before
 * anything validates it.
 *
 * A `.env` file is parsed by dotenv, which strips surrounding quotes. A value
 * typed into a hosting provider's dashboard is not — paste
 * `NEXT_PUBLIC_SUPABASE_URL="https://x.supabase.co"` there with the quotes, as
 * it appears in .env.local, and the quotes become part of the string. It then
 * fails URL validation with the message "Invalid URL", which says nothing about
 * quotes and sends you looking at the URL instead of at the two characters
 * around it. That exact paste is what broke the Cloudflare build.
 *
 * Stripping one layer of matching quotes is unambiguous: no value this app
 * reads legitimately begins and ends with the same quote character. Blank after
 * trimming is treated as absent, so an env var left empty in a dashboard means
 * "not configured" rather than "configured as nothing".
 *
 * It lives apart from env.ts because env.ts validates on import and throws when
 * the environment is incomplete — a pure string helper must not be reachable
 * only through a module that can refuse to load.
 */
export function normaliseEnvValue(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const unquoted = value.trim().replace(/^(['"])([\s\S]*)\1$/, '$2').trim();
  return unquoted.length > 0 ? unquoted : undefined;
}

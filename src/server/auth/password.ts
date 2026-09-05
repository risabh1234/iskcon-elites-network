/**
 * Password hashing.
 *
 * PBKDF2-HMAC-SHA256 via Web Crypto, because this runs on Cloudflare Workers:
 * bcrypt and argon2 are native modules that are simply not available there, and
 * a hash the runtime cannot compute is worse than a slower algorithm. Web Crypto
 * exists identically in Node and in Workers, so one implementation covers both.
 *
 * Encoded as `pbkdf2$sha256$<iterations>$<salt>$<hash>` with base64url parts, so
 * the iteration count travels with the hash and can be raised later without
 * invalidating existing passwords.
 */

const ALGORITHM = 'pbkdf2';
const DIGEST = 'sha256';
// OWASP's 2023 floor for PBKDF2-HMAC-SHA256.
const ITERATIONS = 600_000;
const SALT_BYTES = 16;
const KEY_BITS = 256;

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, '='));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password.normalize('NFKC')),
    'PBKDF2',
    false,
    ['deriveBits'],
  );

  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    key,
    KEY_BITS,
  );

  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derive(password, salt, ITERATIONS);
  return `${ALGORITHM}$${DIGEST}$${ITERATIONS}$${toBase64Url(salt)}$${toBase64Url(hash)}`;
}

/** Length-independent, value-independent comparison. */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

export async function verifyPassword(password: string, encoded: string | null): Promise<boolean> {
  // A user with no password (social-only) must still cost the same as a wrong
  // one, or the response time tells an attacker which addresses are registered.
  if (!encoded) {
    await derive(password, new Uint8Array(SALT_BYTES), ITERATIONS);
    return false;
  }

  const parts = encoded.split('$');
  if (parts.length !== 5) return false;

  const [algorithm, digest, iterationsRaw, saltRaw, hashRaw] = parts;
  if (algorithm !== ALGORITHM || digest !== DIGEST) return false;

  const iterations = Number.parseInt(iterationsRaw!, 10);
  if (!Number.isFinite(iterations) || iterations < 1) return false;

  const expected = fromBase64Url(hashRaw!);
  const actual = await derive(password, fromBase64Url(saltRaw!), iterations);

  return timingSafeEqual(actual, expected);
}

/** True when a stored hash was made with settings we have since raised. */
export function needsRehash(encoded: string | null): boolean {
  if (!encoded) return false;
  const parts = encoded.split('$');
  if (parts.length !== 5) return true;
  const iterations = Number.parseInt(parts[2]!, 10);
  return !Number.isFinite(iterations) || iterations < ITERATIONS;
}

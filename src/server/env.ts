import { z } from 'zod';
import { normaliseEnvValue } from './env-value';

/**
 * Environment validation. Imported for its side effect by src/lib/prisma.ts, so
 * a missing or malformed variable fails the process at boot with a list of
 * exactly what is wrong — rather than surfacing as an undefined connection
 * string at 2am, three layers down, as a Prisma error nobody can read.
 *
 * Phase 3 moves the Prisma singleton to src/server/db.ts; this module stays.
 */

const url = z.string().url();


const optionalNonEmptyString = z
  .string()
  .trim()
  .optional()
  .or(z.literal(''))
  .transform((v) => (v ? v : undefined));

const serverSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // Postgres. DATABASE_URL is the pooled connection used at runtime;
  // DIRECT_URL is the unpooled one the Prisma CLI needs for migrations.
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_URL: optionalNonEmptyString,

  // Google Sign-In. Optional: the button is hidden until both are present, so
  // the app runs on email and password alone until the keys are added.
  GOOGLE_CLIENT_ID: optionalNonEmptyString,
  GOOGLE_CLIENT_SECRET: optionalNonEmptyString,

  // Supabase. The service-role key is the current upload path's credential and
  // must never reach the client — note the deliberate absence of NEXT_PUBLIC_.
  SUPABASE_SERVICE_ROLE_KEY: optionalNonEmptyString,

  // Parent domain to scope the session cookie to, e.g. ".example.org", so one
  // sign-in covers the site and the console subdomain. Left unset the cookie is
  // host-only, which is the safer default and the right one on a single host:
  // widening it shares the session with every subdomain that exists.
  SESSION_COOKIE_DOMAIN: optionalNonEmptyString,

  // Object storage. Optional today: the S3/R2 client is wired but unused, and
  // uploads go to Supabase Storage. See docs/AUDIT.md §8.
  S3_BUCKET_NAME: z.string().optional(),
  S3_ENDPOINT: url.optional().or(z.literal('')),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
});

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: url.optional().or(z.literal('')),
  /** Absolute origin, used to build the OAuth redirect URI in production. */
  NEXT_PUBLIC_SITE_URL: url.optional().or(z.literal('')),
  /**
   * Hostname the console is served on, e.g. "admin.example.org" — a host, not
   * a URL, because it is compared against the Host header. Unset means the
   * console stays at /admin on the main site, which is the correct
   * configuration until a domain exists.
   */
  NEXT_PUBLIC_ADMIN_HOST: z
    .string()
    .trim()
    .regex(/^[a-z0-9.-]+(:\d+)?$/i, 'NEXT_PUBLIC_ADMIN_HOST is a hostname, not a URL')
    .optional()
    .or(z.literal('')),
});

/**
 * Next inlines `process.env.NEXT_PUBLIC_*` at build time only where it appears
 * literally, so client keys are read by their full name rather than destructured.
 */
const rawClient = {
  NEXT_PUBLIC_SUPABASE_URL: normaliseEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL),
  NEXT_PUBLIC_SITE_URL: normaliseEnvValue(process.env.NEXT_PUBLIC_SITE_URL),
  NEXT_PUBLIC_ADMIN_HOST: normaliseEnvValue(process.env.NEXT_PUBLIC_ADMIN_HOST),
};

/** The same normalisation, over every variable the server schema declares. */
function rawServer(): Record<string, unknown> {
  const source = process.env as Record<string, string | undefined>;
  const out: Record<string, unknown> = { ...source };
  for (const key of Object.keys(serverSchema.shape)) {
    out[key] = normaliseEnvValue(source[key]);
  }
  return out;
}

function format(issues: z.core.$ZodIssue[]): string {
  return issues.map((i) => `  • ${i.path.join('.') || '(root)'}: ${i.message}`).join('\n');
}

function load() {
  // On the client, only the public schema is knowable — the server half is not
  // present in the bundle and validating it would always fail.
  const isServer = typeof window === 'undefined';

  const client = clientSchema.safeParse(rawClient);
  const server = isServer ? serverSchema.safeParse(rawServer()) : null;

  const issues = [
    ...(client.success ? [] : client.error.issues),
    ...(server && !server.success ? server.error.issues : []),
  ];

  if (issues.length > 0) {
    throw new Error(
      `Invalid environment configuration:\n${format(issues)}\n\n` +
        `A URL must include its scheme — https://x.supabase.co, not x.supabase.co.\n` +
        `Quotes and stray whitespace are stripped for you, so a value copied\n` +
        `straight out of .env.local into a dashboard field is safe to paste.\n\n` +
        `See .env.example for the full list of variables and where to obtain each one.`,
    );
  }

  return {
    ...(server?.success ? server.data : {}),
    ...(client.success ? client.data : {}),
  } as z.infer<typeof serverSchema> & z.infer<typeof clientSchema>;
}

export const env = load();

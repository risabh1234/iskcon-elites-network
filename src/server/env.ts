import { z } from 'zod';

/**
 * Environment validation. Imported for its side effect by src/lib/prisma.ts, so
 * a missing or malformed variable fails the process at boot with a list of
 * exactly what is wrong — rather than surfacing as an undefined connection
 * string at 2am, three layers down, as a Prisma error nobody can read.
 *
 * Phase 3 moves the Prisma singleton to src/server/db.ts; this module stays.
 */

const url = z.string().url();

const serverSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // Postgres. DATABASE_URL is the pooled connection used at runtime;
  // DIRECT_URL is the unpooled one the Prisma CLI needs for migrations.
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_URL: z.string().min(1).optional(),

  // Google Sign-In. Optional: the button is hidden until both are present, so
  // the app runs on email and password alone until the keys are added.
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),

  // Supabase. The service-role key is the current upload path's credential and
  // must never reach the client — note the deliberate absence of NEXT_PUBLIC_.
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),

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
});

/**
 * Next inlines `process.env.NEXT_PUBLIC_*` at build time only where it appears
 * literally, so client keys are read by their full name rather than destructured.
 */
const rawClient = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
};

function format(issues: z.core.$ZodIssue[]): string {
  return issues.map((i) => `  • ${i.path.join('.') || '(root)'}: ${i.message}`).join('\n');
}

function load() {
  // On the client, only the public schema is knowable — the server half is not
  // present in the bundle and validating it would always fail.
  const isServer = typeof window === 'undefined';

  const client = clientSchema.safeParse(rawClient);
  const server = isServer ? serverSchema.safeParse(process.env) : null;

  const issues = [
    ...(client.success ? [] : client.error.issues),
    ...(server && !server.success ? server.error.issues : []),
  ];

  if (issues.length > 0) {
    throw new Error(
      `Invalid environment configuration:\n${format(issues)}\n\n` +
        `See .env.example for the full list of variables and where to obtain each one.`,
    );
  }

  return {
    ...(server?.success ? server.data : {}),
    ...(client.success ? client.data : {}),
  } as z.infer<typeof serverSchema> & z.infer<typeof clientSchema>;
}

export const env = load();

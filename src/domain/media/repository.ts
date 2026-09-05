import { createClient } from '@supabase/supabase-js';
import { env } from '@/server/env';

/**
 * Object storage. Uploads currently go to a public Supabase bucket; the R2
 * client in src/lib/s3.ts is configured but unused (docs/AUDIT.md §8), and
 * Phase 7 migrates this to R2 + Cloudflare Images. Only this file changes.
 */
const BUCKET = 'profiles';

function client() {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Object storage is not configured');
  }
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function putObject(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<string> {
  const supabase = client();

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(key, body, { contentType, cacheControl: '31536000', upsert: false });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(key);
  return data.publicUrl;
}

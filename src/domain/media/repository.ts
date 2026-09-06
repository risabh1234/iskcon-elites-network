import { createClient } from '@supabase/supabase-js';
import { env } from '@/server/env';

/**
 * Object storage. Uploads currently go to a public Supabase bucket; the R2
 * client in src/lib/s3.ts is configured but unused (docs/AUDIT.md §8), and
 * Phase 7 migrates this to R2 + Cloudflare Images. Only this file changes.
 */
export const BUCKET = 'profiles';

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

/** Removes the stored object. Failure is the caller's to tolerate. */
export async function deleteObject(key: string): Promise<void> {
  const { error } = await client().storage.from(BUCKET).remove([key]);
  if (error) throw new Error(error.message);
}

export type NewAsset = {
  key: string;
  bucket: string;
  mime: string;
  bytes: number;
  uploadedById: string;
};

/**
 * The database record for a stored object.
 *
 * Until now nothing wrote this table, so the media console listed rows that
 * could never exist and an uploaded file had no owner, no size and no way to
 * be found again. Every upload records one.
 */
export async function createAsset(asset: NewAsset): Promise<{ id: string }> {
  const { default: prisma } = await import('@/lib/prisma');
  return prisma.mediaAsset.create({ data: asset, select: { id: true } });
}

/** Assets recorded in the database, for the admin media view. */
export async function listAssets(limit = 100) {
  const { default: prisma } = await import('@/lib/prisma');
  return prisma.mediaAsset.findMany({
    select: {
      id: true, key: true, bucket: true, mime: true, bytes: true,
      width: true, height: true, blurhash: true, createdAt: true,
      uploadedBy: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function countAssets(): Promise<number> {
  const { default: prisma } = await import('@/lib/prisma');
  return prisma.mediaAsset.count();
}

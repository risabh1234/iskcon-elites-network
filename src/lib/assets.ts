/**
 * The public address of a stored object.
 *
 * Rows store a bucket and a key, never a URL: a URL contains the storage host,
 * and moving buckets would otherwise mean rewriting every row that ever
 * referenced one. This is the single place that assembles the two.
 *
 * It lives in lib/ rather than in the media domain because building a URL needs
 * no credentials and no database — a DTO should be able to render an asset
 * without importing the module that holds the service-role key.
 */
export function assetUrl(asset: { bucket: string; key: string } | null | undefined): string | null {
  if (!asset) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return base ? `${base}/storage/v1/object/public/${asset.bucket}/${asset.key}` : null;
}

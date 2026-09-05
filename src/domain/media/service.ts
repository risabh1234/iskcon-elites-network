import { randomUUID } from 'node:crypto';
import { can, type Actor } from '@/server/policy';
import { forbidden, validation, internal } from '@/server/errors';
import { err, ok, type Result } from '@/server/result';
import { checkRateLimit, LIMITS } from '@/server/rate-limit';
import * as repo from './repository';
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES, uploadSchema } from './schema';

export type UploadResult = { url: string; key: string };

export async function uploadImage(
  actor: Actor,
  file: File,
  rateKey: string,
): Promise<Result<UploadResult>> {
  if (!can(actor, 'media:upload')) {
    return err(forbidden('You need to be signed in to upload.'));
  }

  const limited = checkRateLimit(`upload:${rateKey}`, LIMITS.upload);
  if (!limited.ok) return limited;

  const parsed = uploadSchema.safeParse({
    filename: file.name,
    contentType: file.type,
    size: file.size,
  });

  if (!parsed.success) {
    return err(
      validation(
        `Upload a ${ALLOWED_IMAGE_TYPES.map((t) => t.replace('image/', '')).join(', ')} image under ${
          MAX_UPLOAD_BYTES / (1024 * 1024)
        }MB.`,
      ),
    );
  }

  // The key is generated, never derived from the client's filename: a
  // timestamp prefix collides under concurrency, and user input in a storage
  // path is a traversal waiting to happen.
  const extension = parsed.data.contentType.replace('image/', '').replace('jpeg', 'jpg');
  const key = `profiles/${randomUUID()}.${extension}`;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await repo.putObject(key, buffer, parsed.data.contentType);
    return ok({ url, key });
  } catch (cause) {
    return err(internal('The upload failed.', { cause }));
  }
}

export type MediaAssetDto = {
  id: string;
  key: string;
  mime: string;
  bytes: number;
  width: number | null;
  height: number | null;
  hasBlurhash: boolean;
  uploadedBy: string | null;
  createdAt: string;
};

/** Admin-only listing of recorded assets. */
export async function listAssets(actor: Actor): Promise<Result<MediaAssetDto[]>> {
  if (!can(actor, 'admin:access')) return err(forbidden());

  const rows = await repo.listAssets();

  return ok(
    rows.map((row) => ({
      id: row.id,
      key: row.key,
      mime: row.mime,
      bytes: row.bytes,
      width: row.width,
      height: row.height,
      hasBlurhash: row.blurhash != null,
      uploadedBy: row.uploadedBy?.name ?? null,
      createdAt: row.createdAt.toISOString(),
    })),
  );
}

import { randomUUID } from 'node:crypto';
import { can, type Actor } from '@/server/policy';
import { forbidden, validation, internal } from '@/server/errors';
import { err, ok, type Result } from '@/server/result';
import { checkRateLimit, LIMITS } from '@/server/rate-limit';
import * as repo from './repository';
import {
  ALLOWED_IMAGE_TYPES,
  MAX_DOCUMENT_BYTES,
  MAX_UPLOAD_BYTES,
  documentUploadSchema,
  uploadSchema,
} from './schema';

export type UploadResult = {
  /** MediaAsset.id — what another domain stores to point at this file. */
  assetId: string;
  url: string;
  key: string;
  bucket: string;
  mime: string;
  bytes: number;
};

/**
 * The two kinds of upload differ only in what they accept and where they land,
 * so they share one implementation rather than two that drift. The `prefix` is
 * a constant per kind and never touches user input.
 */
type UploadKind = {
  prefix: string;
  /** Returns the accepted content type, or null when the file is refused. */
  parse: (input: unknown) => { contentType: string } | null;
  message: string;
  extensionFor: (contentType: string) => string;
};

const IMAGE: UploadKind = {
  prefix: 'profiles',
  parse: (input) => {
    const result = uploadSchema.safeParse(input);
    return result.success ? { contentType: result.data.contentType } : null;
  },
  message: `Upload a ${ALLOWED_IMAGE_TYPES.map((t) => t.replace('image/', '')).join(', ')} image under ${
    MAX_UPLOAD_BYTES / (1024 * 1024)
  }MB.`,
  extensionFor: (contentType) => contentType.replace('image/', '').replace('jpeg', 'jpg'),
};

const DOCUMENT: UploadKind = {
  prefix: 'documents',
  parse: (input) => {
    const result = documentUploadSchema.safeParse(input);
    return result.success ? { contentType: result.data.contentType } : null;
  },
  message: `Upload a PDF under ${MAX_DOCUMENT_BYTES / (1024 * 1024)}MB.`,
  extensionFor: () => 'pdf',
};

async function upload(
  actor: Actor,
  file: File,
  rateKey: string,
  kind: UploadKind,
): Promise<Result<UploadResult>> {
  // Short-circuit before any query: an anonymous caller cannot own an asset row.
  if (actor.kind !== 'user' || !can(actor, 'media:upload')) {
    return err(forbidden('You need to be signed in to upload.'));
  }

  const limited = checkRateLimit(`upload:${rateKey}`, LIMITS.upload);
  if (!limited.ok) return limited;

  const parsed = kind.parse({
    filename: file.name,
    contentType: file.type,
    size: file.size,
  });

  if (!parsed) return err(validation(kind.message));

  // The key is generated, never derived from the client's filename: a
  // timestamp prefix collides under concurrency, and user input in a storage
  // path is a traversal waiting to happen.
  const key = `${kind.prefix}/${randomUUID()}.${kind.extensionFor(parsed.contentType)}`;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await repo.putObject(key, buffer, parsed.contentType);

    const asset = await repo.createAsset({
      key,
      bucket: repo.BUCKET,
      mime: parsed.contentType,
      bytes: file.size,
      uploadedById: actor.id,
    });

    return ok({
      assetId: asset.id,
      url,
      key,
      bucket: repo.BUCKET,
      mime: parsed.contentType,
      bytes: file.size,
    });
  } catch (cause) {
    return err(internal('The upload failed.', { cause }));
  }
}

export function uploadImage(actor: Actor, file: File, rateKey: string) {
  return upload(actor, file, rateKey, IMAGE);
}

/** PDFs the institution publishes — programmes, handouts, seminar notes. */
export function uploadDocument(actor: Actor, file: File, rateKey: string) {
  return upload(actor, file, rateKey, DOCUMENT);
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

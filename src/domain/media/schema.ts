import { z } from 'zod';

/**
 * Upload constraints. The route this replaces accepted any file of any size
 * with a client-supplied content type and wrote it to a public bucket.
 */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
] as const;

export const uploadSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  contentType: z.enum(ALLOWED_IMAGE_TYPES),
  size: z.number().int().positive().max(MAX_UPLOAD_BYTES),
});

export type UploadInput = z.infer<typeof uploadSchema>;

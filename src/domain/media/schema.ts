import { z } from 'zod';

/**
 * Upload constraints. The route this replaces accepted any file of any size
 * with a client-supplied content type and wrote it to a public bucket.
 */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/**
 * Documents are allowed to be larger than images because a scanned programme
 * or a seminar handout legitimately is, but only one format is accepted. PDF
 * renders identically everywhere and carries no macro surface; Office formats
 * do neither, and a reader should never have to install something to read a
 * page the institution published.
 */
export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
] as const;

export const ALLOWED_DOCUMENT_TYPES = ['application/pdf'] as const;

export const uploadSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  contentType: z.enum(ALLOWED_IMAGE_TYPES),
  size: z.number().int().positive().max(MAX_UPLOAD_BYTES),
});

export const documentUploadSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  contentType: z.enum(ALLOWED_DOCUMENT_TYPES),
  size: z.number().int().positive().max(MAX_DOCUMENT_BYTES),
});

export type UploadInput = z.infer<typeof uploadSchema>;
export type DocumentUploadInput = z.infer<typeof documentUploadSchema>;

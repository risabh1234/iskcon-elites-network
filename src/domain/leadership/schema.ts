import { z } from 'zod';

export const LEADERSHIP_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;
export const LEADERSHIP_MEDIA_KINDS = ['PHOTO', 'DOCUMENT'] as const;

const text = (max: number) => z.string().trim().max(max);
const required = (max: number) => z.string().trim().min(1).max(max);

/**
 * Bounds, not formats. Every field here is prose written by a reviewer, so the
 * only thing worth validating is that it is present where the page depends on
 * it and that it cannot grow past what the layout can hold.
 */
export const updateLeadershipSchema = z.object({
  honorific: text(60).optional(),
  name: required(120),
  initiatedName: text(120).optional(),
  role: text(200).optional(),
  headline: text(240).optional(),
  bio: required(20_000),
  focusAreas: text(4_000).optional(),
  initiatives: text(4_000).optional(),
  status: z.enum(LEADERSHIP_STATUSES),
  orderIndex: z.coerce.number().int().min(0).max(999).optional(),
});

/**
 * Alt text is required whenever a portrait is set, and it is checked here
 * rather than in the form: a control the browser can be told to skip is not a
 * validation. Clearing the portrait clears the alt text with it.
 */
export const setPortraitSchema = z
  .object({
    assetId: z.string().uuid().nullable(),
    alt: text(300).optional(),
  })
  .refine((value) => value.assetId === null || (value.alt?.length ?? 0) > 0, {
    path: ['alt'],
    message: 'Describe the photograph for people who cannot see it.',
  });

export const addLeadershipMediaSchema = z.object({
  kind: z.enum(LEADERSHIP_MEDIA_KINDS),
  /** Link text for a document, alt text for a photograph — so never optional. */
  title: required(200),
  description: text(1_000).optional(),
  orderIndex: z.coerce.number().int().min(0).max(999).optional(),
});

export type UpdateLeadershipInput = z.infer<typeof updateLeadershipSchema>;
export type SetPortraitInput = z.infer<typeof setPortraitSchema>;
export type AddLeadershipMediaInput = z.infer<typeof addLeadershipMediaSchema>;

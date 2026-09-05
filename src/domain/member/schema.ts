import { z } from 'zod';

export const MEMBER_KINDS = ['ALUMNUS', 'SPEAKER', 'GUEST'] as const;
export type MemberKindInput = (typeof MEMBER_KINDS)[number];

const text = (max: number) => z.string().trim().max(max);
const required = (max: number) => z.string().trim().min(1).max(max);

/** ISO 3166-1 alpha-2, upper-cased so "in" and "IN" are the same country. */
const countryCode = z
  .string()
  .trim()
  .length(2)
  .transform((v) => v.toUpperCase())
  .optional()
  .or(z.literal(''));

export const createMemberSchema = z.object({
  kind: z.enum(MEMBER_KINDS).default('ALUMNUS'),
  legalName: required(120),
  initiatedName: text(120).optional(),
  headline: text(200).optional(),
  bio: required(5_000),
  city: text(120).optional(),
  countryCode,
  cohort: text(60).optional(),
  email: z.string().trim().email().max(200).optional().or(z.literal('')),
  story: text(20_000).optional(),
  recommendation: text(5_000).optional(),
});

export const updateMemberSchema = createMemberSchema.partial();

export const approveMemberSchema = z.object({
  isApproved: z.boolean(),
  /** Recorded in the audit trail; required by the UI when rejecting. */
  reason: text(500).optional(),
});

export const searchSchema = z.object({
  q: z.string().trim().min(1).max(200),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  includeUnpublished: z.boolean().optional(),
});

export const memberQuerySchema = z.object({
  kind: z.enum(MEMBER_KINDS).optional(),
  expertise: z.string().trim().max(80).optional(),
  country: z.string().trim().length(2).transform((v) => v.toUpperCase()).optional(),
  cursor: z.string().trim().max(80).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  sort: z.enum(['name', 'recent']).optional(),
});

export type CreateMemberInput = z.infer<typeof createMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
export type SearchInput = z.infer<typeof searchSchema>;

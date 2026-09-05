import { z } from 'zod';

/**
 * One schema, shared by the client form and the server. Validation happens at
 * the boundary, once — the previous code destructured `await req.json()` and
 * handed the fields straight to Prisma.
 */
export const ROLE_TYPES = ['Alumni', 'Speaker'] as const;
export type MemberRoleType = (typeof ROLE_TYPES)[number];

const trimmed = (max: number) => z.string().trim().min(1).max(max);

export const memberBaseSchema = z.object({
  fullName: trimmed(120),
  bio: z.string().trim().min(1).max(5_000),
  email: z.string().trim().email().max(200).optional().or(z.literal('')),
  profileImage: z.string().trim().url().max(2_000).optional().or(z.literal('')),
  story: z.string().trim().max(20_000).optional().or(z.literal('')),
  recommendation: z.string().trim().max(5_000).optional().or(z.literal('')),
});

export const createMemberSchema = z.discriminatedUnion('category', [
  memberBaseSchema.extend({
    category: z.literal('Alumni'),
    cohort: trimmed(60),
  }),
  memberBaseSchema.extend({
    category: z.literal('Speaker'),
    title: trimmed(160),
  }),
  memberBaseSchema.extend({
    category: z.literal('Featured Guest'),
    title: trimmed(160).optional(),
  }),
]);

export const updateMemberSchema = z.object({
  roleType: z.enum(ROLE_TYPES),
  fullName: trimmed(120),
  bio: z.string().trim().min(1).max(5_000),
  category: z.string().trim().max(80).optional(),
  cohort: z.string().trim().max(60).optional(),
  title: z.string().trim().max(160).optional(),
  email: z.string().trim().email().max(200).optional().or(z.literal('')),
  profileImage: z.string().trim().url().max(2_000).optional().or(z.literal('')),
  story: z.string().trim().max(20_000).optional().or(z.literal('')),
  recommendation: z.string().trim().max(5_000).optional().or(z.literal('')),
});

export const approveMemberSchema = z.object({
  roleType: z.enum(ROLE_TYPES),
  isApproved: z.boolean(),
});

export const memberQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  roleType: z.enum(ROLE_TYPES).optional(),
  includeUnpublished: z.boolean().optional(),
});

export type CreateMemberInput = z.infer<typeof createMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
export type ApproveMemberInput = z.infer<typeof approveMemberSchema>;
export type MemberQuery = z.infer<typeof memberQuerySchema>;

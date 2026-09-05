import { z } from 'zod';

/**
 * `date` and `time` are separate columns with no timezone anywhere, so an event
 * cannot currently be rendered correctly for a reader outside the organisers'
 * zone. Phase 4 replaces both with a UTC `startsAt` plus an IANA `timezone`;
 * this schema validates what the table can actually hold today.
 */
export const createEventSchema = z.object({
  title: z.string().trim().min(1).max(200),
  location: z.string().trim().min(1).max(200),
  date: z.coerce.date(),
  time: z.string().trim().min(1).max(40),
  description: z.string().trim().max(10_000).optional().or(z.literal('')),
  imageUrl: z.string().trim().url().max(2_000).optional().or(z.literal('')),
  isHighlighted: z.boolean().optional().default(false),
});

export const updateEventSchema = createEventSchema.partial();

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;

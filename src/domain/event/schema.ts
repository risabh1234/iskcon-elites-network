import { z } from 'zod';

export const EVENT_MODES = ['IN_PERSON', 'ONLINE', 'HYBRID'] as const;

/**
 * An event is an instant plus the zone it is held in.
 *
 * The previous schema stored a date column and a free-text time with no zone at
 * all, which cannot be rendered correctly for any reader outside the organisers'
 * own timezone — for an international network that is the difference between
 * attending and not.
 */
/**
 * An IANA zone identifier, e.g. "Asia/Kolkata" or "Europe/London". "UTC" is the
 * one accepted single-word name.
 *
 * Two checks, and both are needed:
 *
 *  - Shape. `Intl` happily accepts the abbreviations "IST" and "EST", which are
 *    ambiguous — IST is Indian, Irish and Israel Standard Time — so an
 *    identifier must carry a region, or be UTC.
 *  - Acceptance by `Intl`, so a well-shaped but non-existent zone is rejected.
 *
 * Membership in `Intl.supportedValuesOf('timeZone')` is deliberately NOT used:
 * that list is canonical-only, and on the ICU shipped with Node it contains
 * "Asia/Calcutta" but not "Asia/Kolkata" — the modern spelling most people type.
 */
const ianaTimezone = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .refine((tz) => tz === 'UTC' || /^[A-Za-z][A-Za-z0-9_+-]*(?:\/[A-Za-z0-9_+-]+)+$/.test(tz), {
    message: 'Use a full IANA timezone such as Asia/Kolkata, not an abbreviation.',
  })
  .refine(
    (tz) => {
      try {
        new Intl.DateTimeFormat('en', { timeZone: tz });
        return true;
      } catch {
        return false;
      }
    },
    { message: 'That is not a timezone this system recognises.' },
  );

// The cross-field checks live in `refineEvent` rather than on the object, so
// the update schema can reuse the same shape: Zod v4 refuses `.partial()` on a
// schema that already carries refinements.
const eventFields = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(10_000).optional().or(z.literal('')),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date().optional().nullable(),
    timezone: ianaTimezone,
    mode: z.enum(EVENT_MODES),
    venue: z.string().trim().max(200).optional().or(z.literal('')),
    city: z.string().trim().max(120).optional().or(z.literal('')),
    countryCode: z.string().trim().length(2).transform((v) => v.toUpperCase()).optional().or(z.literal('')),
    onlineUrl: z.string().trim().url().max(2_000).optional().or(z.literal('')),
    capacity: z.coerce.number().int().positive().max(100_000).optional().nullable(),
    isHighlighted: z.boolean(),
  });

type EventFields = Partial<z.infer<typeof eventFields>>;

const endsAfterStart = (v: EventFields) =>
  !v.endsAt || !v.startsAt || v.endsAt >= v.startsAt;

const onlineHasLink = (v: EventFields) =>
  v.mode === undefined || v.mode === 'IN_PERSON' || Boolean(v.onlineUrl);

/**
 * Defaults live on the CREATE schema only.
 *
 * `.partial()` does not strip a Zod default — an omitted field still arrives
 * filled in — so a partial schema built from a shape carrying defaults would
 * silently reset those columns. Renaming an event would have set its timezone
 * back to UTC, its mode to in-person, and cleared its highlight.
 */
export const createEventSchema = eventFields
  .extend({
    timezone: ianaTimezone.default('UTC'),
    mode: z.enum(EVENT_MODES).default('IN_PERSON'),
    isHighlighted: z.boolean().default(false),
    description: eventFields.shape.description.optional(),
    venue: eventFields.shape.venue.optional(),
    city: eventFields.shape.city.optional(),
    countryCode: eventFields.shape.countryCode.optional(),
    onlineUrl: eventFields.shape.onlineUrl.optional(),
    endsAt: eventFields.shape.endsAt.optional(),
    capacity: eventFields.shape.capacity.optional(),
  })
  .refine(endsAfterStart, {
    message: 'The end time cannot be before the start.',
    path: ['endsAt'],
  })
  .refine(onlineHasLink, {
    message: 'An online or hybrid event needs a joining link.',
    path: ['onlineUrl'],
  });

export const updateEventSchema = eventFields
  .partial()
  .refine(endsAfterStart, {
    message: 'The end time cannot be before the start.',
    path: ['endsAt'],
  })
  .refine(onlineHasLink, {
    message: 'An online or hybrid event needs a joining link.',
    path: ['onlineUrl'],
  });

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;

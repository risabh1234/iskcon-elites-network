export type EventMode = 'IN_PERSON' | 'ONLINE' | 'HYBRID';
export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED';

export type EventRecord = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  startsAt: Date;
  endsAt: Date | null;
  timezone: string;
  mode: EventMode;
  venue: string | null;
  city: string | null;
  countryCode: string | null;
  onlineUrl: string | null;
  capacity: number | null;
  status: EventStatus;
  isHighlighted: boolean;
  createdAt: Date;
  createdById: string;
  _count?: { registrations: number };
};

export type EventDto = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  /** UTC instant, ISO 8601. The client formats it in the viewer's own zone. */
  startsAt: string;
  endsAt: string | null;
  /** IANA zone the event is held in, shown alongside the viewer's. */
  timezone: string;
  mode: EventMode;
  venue: string | null;
  city: string | null;
  countryCode: string | null;
  onlineUrl: string | null;
  capacity: number | null;
  registeredCount: number;
  spacesLeft: number | null;
  status: EventStatus;
  isHighlighted: boolean;
  createdAt: string;

  // ── Compatibility with the pre-Phase-5.3 events page ───────────────────
  /** @deprecated use `startsAt` */
  date: string;
  /** @deprecated use `startsAt` and `timezone` */
  time: string;
  /** @deprecated use `venue` and `city` */
  location: string;
  /** @deprecated use `status` */
  isApproved: boolean;
  /** @deprecated */
  imageUrl: string | null;
};

/** `createdById` stays server-side. */
export function toEventDto(record: EventRecord): EventDto {
  const registeredCount = record._count?.registrations ?? 0;

  // Rendered in the event's own zone: this is the legacy `time` string, and the
  // viewer's own rendering happens on the client where the zone is known.
  const localTime = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: record.timezone,
  }).format(record.startsAt);

  return {
    id: record.id,
    slug: record.slug,
    title: record.title,
    description: record.description,
    startsAt: record.startsAt.toISOString(),
    endsAt: record.endsAt?.toISOString() ?? null,
    timezone: record.timezone,
    mode: record.mode,
    venue: record.venue,
    city: record.city,
    countryCode: record.countryCode,
    onlineUrl: record.onlineUrl,
    capacity: record.capacity,
    registeredCount,
    spacesLeft: record.capacity == null ? null : Math.max(0, record.capacity - registeredCount),
    status: record.status,
    isHighlighted: record.isHighlighted,
    createdAt: record.createdAt.toISOString(),

    date: record.startsAt.toISOString(),
    time: localTime,
    location: [record.venue, record.city].filter(Boolean).join(', ') || (record.onlineUrl ? 'Online' : ''),
    isApproved: record.status === 'PUBLISHED',
    imageUrl: null,
  };
}

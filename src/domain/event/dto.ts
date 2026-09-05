export type EventDto = {
  id: string;
  title: string;
  location: string;
  /** ISO 8601. The client formats it in the viewer's zone. */
  date: string;
  time: string;
  description: string | null;
  imageUrl: string | null;
  isHighlighted: boolean;
  isApproved: boolean;
  createdAt: string;
};

export type EventRecord = {
  id: string;
  title: string;
  location: string;
  date: Date;
  time: string;
  description: string | null;
  imageUrl: string | null;
  isHighlighted: boolean;
  isApproved: boolean;
  createdAt: Date;
  addedById: string;
};

/** `addedById` stays server-side. */
export function toEventDto(record: EventRecord): EventDto {
  return {
    id: record.id,
    title: record.title,
    location: record.location,
    date: record.date.toISOString(),
    time: record.time,
    description: record.description,
    imageUrl: record.imageUrl,
    isHighlighted: record.isHighlighted,
    isApproved: record.isApproved,
    createdAt: record.createdAt.toISOString(),
  };
}

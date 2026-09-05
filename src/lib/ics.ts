/**
 * A real .ics file, built by hand.
 *
 * "Add to calendar" links that open a Google URL only work for people who use
 * Google Calendar. A downloaded file works everywhere, including Outlook and
 * Apple Calendar, and needs no third party to see the event.
 */
export type CalendarEvent = {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  url?: string | null;
  startsAt: Date;
  endsAt?: Date | null;
};

/** RFC 5545 wants CRLF, escaped separators, and lines folded at 75 octets. */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [line.slice(0, 75)];
  let rest = line.slice(75);
  while (rest.length > 74) {
    parts.push(` ${rest.slice(0, 74)}`);
    rest = rest.slice(74);
  }
  if (rest.length > 0) parts.push(` ${rest}`);
  return parts.join('\r\n');
}

/** UTC, per RFC 5545's form: 20261114T130000Z */
function stamp(date: Date): string {
  return `${date.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
}

export function buildIcs(event: CalendarEvent, origin: string): string {
  // Default to an hour when no end is recorded, so the event does not land in
  // a calendar as an all-day block.
  const end = event.endsAt ?? new Date(event.startsAt.getTime() + 3_600_000);

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ISKCON Elites Network//Directory//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.id}@iskcon-elites-network`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(event.startsAt)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escapeText(event.title)}`,
    ...(event.description ? [`DESCRIPTION:${escapeText(event.description)}`] : []),
    ...(event.location ? [`LOCATION:${escapeText(event.location)}`] : []),
    ...(event.url ? [`URL:${escapeText(`${origin}${event.url}`)}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return lines.map(fold).join('\r\n');
}

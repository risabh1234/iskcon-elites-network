import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { Badge } from '@/components/primitives/Badge';
import { cn } from '@/lib/cn';

export interface EventCardProps {
  href: string;
  title: string;
  /** UTC instant. Rendered in the viewer's zone, with the event's zone named. */
  startsAt: Date;
  timeZone: string;
  venue?: string | null;
  mode?: 'IN_PERSON' | 'ONLINE' | 'HYBRID';
  past?: boolean;
  className?: string;
}

const modeLabel = {
  IN_PERSON: 'In person',
  ONLINE: 'Online',
  HYBRID: 'Hybrid',
} as const;

/**
 * Times render in the viewer's timezone with the event's own zone shown
 * alongside. For an international network that is not a nicety — it is the
 * difference between attending and not.
 */
export function EventCard({
  href,
  title,
  startsAt,
  timeZone,
  venue,
  mode,
  past = false,
  className,
}: EventCardProps) {
  const viewerTime = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(startsAt);

  // Explicit components, not `timeStyle`: the spec forbids combining a style
  // shorthand with individual fields such as timeZoneName, and doing so throws
  // a RangeError rather than degrading.
  const eventTime = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
    timeZoneName: 'short',
  }).format(startsAt);

  return (
    <Link
      href={href}
      className={cn(
        'flex flex-col no-underline',
        'rounded-sm border border-line bg-paper-raised p-[var(--spacing-4)]',
        'transition-colors duration-[var(--dur-fast)] ease-standard hover:border-line-strong',
        past && 'opacity-70',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-[var(--spacing-3)]">
        <time dateTime={startsAt.toISOString()} className="text-xs text-ink-subtle">
          {viewerTime}
        </time>
        {mode ? <Badge tone="outline">{modeLabel[mode]}</Badge> : null}
      </div>

      <p className="mt-[var(--spacing-3)] font-display text-lg text-ink">{title}</p>

      <p className="mt-[var(--spacing-1)] text-xs text-ink-subtle">
        {eventTime} local to the event
      </p>

      {venue ? (
        <p className="mt-[var(--spacing-3)] flex items-center gap-[var(--spacing-2)] text-sm text-ink-muted">
          <MapPin className="size-[var(--spacing-3)] shrink-0" aria-hidden />
          {venue}
        </p>
      ) : null}
    </Link>
  );
}

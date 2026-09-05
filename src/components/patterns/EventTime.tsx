'use client';

import { useSyncExternalStore } from 'react';

/**
 * The time in the reader's own timezone, with the event's zone alongside.
 *
 * The viewer's zone is external state the server cannot know, so it is read
 * through useSyncExternalStore with a null server snapshot: the server renders
 * the event's own zone — correct for everyone, just not personalised — and the
 * client swaps in the local reading without a hydration mismatch.
 *
 * For an international network this is not a nicety: it is the difference
 * between attending and not.
 */

/** The zone cannot change mid-session, so there is nothing to subscribe to. */
const NO_SUBSCRIBE = () => () => {};
const readViewerZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || null;
const noZoneOnServer = () => null;
export type EventTimeProps = {
  startsAt: string;
  timezone: string;
  showDate?: boolean;
};

function format(date: Date, timeZone: string | undefined, withDate: boolean) {
  return new Intl.DateTimeFormat(undefined, {
    ...(withDate ? { weekday: 'short', day: 'numeric', month: 'short' } : {}),
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
    ...(timeZone ? { timeZone } : {}),
  }).format(date);
}

export function EventTime({ startsAt, timezone, showDate = true }: EventTimeProps) {
  const date = new Date(startsAt);
  const localZone = useSyncExternalStore(NO_SUBSCRIBE, readViewerZone, noZoneOnServer);

  // Only personalise when it actually differs, or the line reads the same
  // thing twice.
  const viewerZone = localZone && localZone !== timezone ? localZone : null;

  const eventLocal = format(date, timezone, showDate);

  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-[var(--spacing-2)]">
      <time dateTime={startsAt} className="text-ink">
        {viewerZone ? format(date, viewerZone, showDate) : eventLocal}
      </time>
      {viewerZone ? (
        <span className="text-xs text-ink-subtle">({eventLocal} local to the event)</span>
      ) : null}
    </span>
  );
}

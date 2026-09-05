'use client';

import { useOptimistic, useState, useTransition } from 'react';
import Link from 'next/link';
import { CalendarPlus, MapPin, Video } from 'lucide-react';
import { Badge, Button, useToast } from '@/components/primitives';
import { EmptyState, EventTime } from '@/components/patterns';
import { registerAction } from '@/actions/event';
import type { EventDto } from '@/domain/event/dto';

const MODE_LABEL = { IN_PERSON: 'In person', ONLINE: 'Online', HYBRID: 'Hybrid' } as const;

export function EventList({
  events,
  canRegister,
  past = false,
}: {
  events: EventDto[];
  canRegister: boolean;
  past?: boolean;
}) {
  if (events.length === 0) {
    return (
      <EmptyState
        title={past ? 'Nothing here yet' : 'No gatherings scheduled'}
        description={
          past
            ? 'Past gatherings will appear here once the first one has happened.'
            : 'Nothing is on the calendar right now. New gatherings are announced here first.'
        }
        action={
          past ? undefined : (
            <Button asChild>
              <Link href="/directory">Browse the directory</Link>
            </Button>
          )
        }
      />
    );
  }

  return (
    <ul className="grid list-none grid-cols-1 gap-[var(--spacing-4)] p-0 lg:grid-cols-2">
      {events.map((event) => (
        <li key={event.id}>
          <EventRow event={event} canRegister={canRegister && !past} past={past} />
        </li>
      ))}
    </ul>
  );
}

function EventRow({
  event,
  canRegister,
  past,
}: {
  event: EventDto;
  canRegister: boolean;
  past: boolean;
}) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [registered, setRegistered] = useState(false);

  // Optimistic: the button flips the moment it is pressed, and is put back if
  // the server disagrees. Registering should not feel like submitting a form.
  const [optimistic, setOptimistic] = useOptimistic(registered);

  function register() {
    startTransition(async () => {
      setOptimistic(true);
      const result = await registerAction(event.id);

      if (result.error) {
        toast({ title: 'Could not register', description: result.error, tone: 'danger' });
        return;
      }

      setRegistered(true);
      toast({
        title: result.status === 'WAITLISTED' ? 'Added to the waiting list' : 'You are registered',
        description:
          result.status === 'WAITLISTED'
            ? 'The event is full. We will let you know if a place opens.'
            : event.title,
        tone: 'success',
      });
    });
  }

  const full = event.spacesLeft === 0;

  return (
    <article
      className={`flex h-full flex-col rounded-sm border border-line bg-paper-raised p-[var(--spacing-5)] ${past ? 'opacity-70' : ''}`}
    >
      <div className="flex items-start justify-between gap-[var(--spacing-3)]">
        <EventTime startsAt={event.startsAt} timezone={event.timezone} />
        <Badge tone="outline">{MODE_LABEL[event.mode]}</Badge>
      </div>

      <h3 className="mt-[var(--spacing-3)] text-xl">{event.title}</h3>

      {event.description ? (
        <p className="mt-[var(--spacing-2)] text-sm text-ink-muted line-clamp-3">
          {event.description}
        </p>
      ) : null}

      <div className="mt-[var(--spacing-4)] flex flex-wrap items-center gap-x-[var(--spacing-4)] gap-y-[var(--spacing-2)] text-sm text-ink-muted">
        {event.location ? (
          <span className="inline-flex items-center gap-[var(--spacing-2)]">
            <MapPin className="size-[var(--spacing-3)] shrink-0" aria-hidden />
            {event.location}
          </span>
        ) : null}
        {event.mode !== 'IN_PERSON' ? (
          <span className="inline-flex items-center gap-[var(--spacing-2)]">
            <Video className="size-[var(--spacing-3)] shrink-0" aria-hidden />
            Joining link on registration
          </span>
        ) : null}
        {event.capacity != null ? (
          <span data-numeric className={full ? 'text-warning' : undefined}>
            {full ? 'Full — waiting list open' : `${event.spacesLeft} of ${event.capacity} places left`}
          </span>
        ) : null}
      </div>

      <div className="mt-[var(--spacing-5)] flex flex-wrap items-center gap-[var(--spacing-3)] pt-[var(--spacing-4)] border-t border-line">
        {canRegister ? (
          <Button
            variant={optimistic ? 'secondary' : 'primary'}
            size="sm"
            loading={pending}
            disabled={optimistic}
            onClick={register}
          >
            {optimistic ? 'Registered' : full ? 'Join the waiting list' : 'Register'}
          </Button>
        ) : null}

        {/* A plain link, not a script-driven download: the file is generated
            server-side and the browser saves it. */}
        <Button asChild variant="ghost" size="sm">
          <a href={`/api/events/${event.id}/calendar`}>
            <CalendarPlus className="size-[var(--spacing-3)]" />
            Add to calendar
          </a>
        </Button>
      </div>
    </article>
  );
}

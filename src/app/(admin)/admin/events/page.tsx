import type { Metadata } from 'next';
import {
  Badge, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, TableWrapper,
} from '@/components/primitives';
import { EmptyState, PageHeader } from '@/components/patterns';
import { getActor } from '@/server/auth';
import { countEvents, listEvents } from '@/domain/event/service';
import { EventActions } from './EventActions';

export const metadata: Metadata = { title: 'Events' };

const MODE_LABEL = { IN_PERSON: 'In person', ONLINE: 'Online', HYBRID: 'Hybrid' } as const;

export default async function AdminEventsPage() {
  const actor = await getActor();
  const result = await listEvents(actor);
  if (!result.ok) throw new Error(result.error.message);

  const events = result.value;
  const counts = await countEvents(actor);
  const upcoming = counts.ok ? counts.value.upcoming : 0;

  return (
    <>
      <PageHeader
        title="Events"
        lede="Times are stored in UTC with the event's own timezone alongside."
        actions={<Badge tone="neutral">{upcoming} upcoming</Badge>}
      />

      <div className="mt-[var(--spacing-5)]">
        {events.length === 0 ? (
          <EmptyState
            title="No events yet"
            description="Gatherings appear here once someone with permission creates one."
          />
        ) : (
          <TableWrapper>
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>Starts</TableHeaderCell>
                  <TableHeaderCell>Title</TableHeaderCell>
                  <TableHeaderCell>Mode</TableHeaderCell>
                  <TableHeaderCell align="end">Registered</TableHeaderCell>
                  <TableHeaderCell align="end">Actions</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>
                      <time dateTime={event.startsAt} data-numeric>
                        {new Intl.DateTimeFormat(undefined, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                          timeZone: event.timezone,
                        }).format(new Date(event.startsAt))}
                      </time>
                      <span className="ml-[var(--spacing-2)] text-xs text-ink-subtle">
                        {event.timezone}
                      </span>
                    </TableCell>
                    <TableCell className="text-ink">
                      {event.title}
                      {event.isHighlighted ? (
                        <Badge tone="accent" className="ml-[var(--spacing-2)]">Featured</Badge>
                      ) : null}
                    </TableCell>
                    <TableCell>{MODE_LABEL[event.mode]}</TableCell>
                    <TableCell align="end" data-numeric>
                      {event.registeredCount}
                      {event.capacity != null ? ` / ${event.capacity}` : ''}
                    </TableCell>
                    <TableCell align="end">
                      <EventActions id={event.id} title={event.title} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableWrapper>
        )}
      </div>
    </>
  );
}

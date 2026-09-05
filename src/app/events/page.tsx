import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Skeleton, Tabs, TabsContent, TabsList, TabsTrigger, ToastProvider } from '@/components/primitives';
import { PageHeader, Section } from '@/components/patterns';
import { getActor } from '@/server/auth';
import { listEvents } from '@/domain/event/service';
import { EventList } from './EventList';

export const metadata: Metadata = {
  title: 'Gatherings',
  description:
    'Meetings of the ISKCON Elites Network, in person and online. Times are shown in your own timezone.',
};

export default async function EventsPage() {
  const actor = await getActor();

  return (
    <ToastProvider>
      <Section>
        <PageHeader
          eyebrow="Gatherings"
          title="Events"
          lede="In a dozen cities and online. Every time below is shown in your own timezone."
        />

        <div className="mt-[var(--spacing-6)]">
          <Tabs defaultValue="upcoming">
            <TabsList>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="past">Past</TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming">
              <Suspense fallback={<EventsSkeleton />}>
                <Upcoming canRegister={actor.kind === 'user'} />
              </Suspense>
            </TabsContent>

            <TabsContent value="past">
              <Suspense fallback={<EventsSkeleton />}>
                <Past />
              </Suspense>
            </TabsContent>
          </Tabs>
        </div>
      </Section>
    </ToastProvider>
  );
}

async function Upcoming({ canRegister }: { canRegister: boolean }) {
  const actor = await getActor();
  const result = await listEvents(actor, { when: 'upcoming' });
  if (!result.ok) throw new Error(result.error.message);

  return <EventList events={result.value} canRegister={canRegister} />;
}

async function Past() {
  const actor = await getActor();
  const result = await listEvents(actor, { when: 'past' });
  if (!result.ok) throw new Error(result.error.message);

  return <EventList events={result.value} canRegister={false} past />;
}

function EventsSkeleton() {
  return (
    <ul className="grid list-none grid-cols-1 gap-[var(--spacing-4)] p-0 lg:grid-cols-2" aria-hidden>
      {Array.from({ length: 4 }, (_, i) => (
        <li key={i} className="rounded-sm border border-line bg-paper-raised p-[var(--spacing-5)]">
          <div className="flex items-start justify-between">
            <Skeleton className="h-[var(--spacing-4)] w-[18ch]" />
            <Skeleton className="h-[var(--spacing-4)] w-[6ch] rounded-full" />
          </div>
          <Skeleton className="mt-[var(--spacing-3)] h-[var(--spacing-6)] w-[70%]" />
          <Skeleton className="mt-[var(--spacing-2)] h-[var(--spacing-4)] w-full" />
          <Skeleton className="mt-[var(--spacing-4)] h-[var(--spacing-4)] w-[40%]" />
          <div className="mt-[var(--spacing-5)] flex gap-[var(--spacing-3)] border-t border-line pt-[var(--spacing-4)]">
            <Skeleton className="h-[var(--spacing-6)] w-[8rem] rounded-sm" />
            <Skeleton className="h-[var(--spacing-6)] w-[9rem] rounded-sm" />
          </div>
        </li>
      ))}
    </ul>
  );
}

import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Skeleton } from '@/components/primitives';
import {
  EmptyState,
  LeaderProfile,
  MediaShelf,
  PageHeader,
  Section,
} from '@/components/patterns';
import { getActor } from '@/server/auth';
import { listLeadership } from '@/domain/leadership/service';

export const metadata: Metadata = {
  title: 'Leadership',
  description:
    'The people who carry the ISKCON Elites Network — who they are, what they teach, and the work the network is built on.',
};

/**
 * Who stands behind the register.
 *
 * One movement per person, and nothing else on the page: no call to action, no
 * donation panel, no "get in touch" form. A page that asks for something while
 * introducing someone reads as a pitch, and the point of this one is that the
 * institution has a name attached to it.
 */
export default function LeadershipPage() {
  return (
    <Section>
      <PageHeader
        eyebrow="Leadership"
        title="The people behind the network"
        lede="Who carries this work, what they teach, and where it is being done."
      />

      <div className="mt-[var(--spacing-9)]">
        <Suspense fallback={<LeadershipSkeleton />}>
          <Profiles />
        </Suspense>
      </div>
    </Section>
  );
}

async function Profiles() {
  const result = await listLeadership(await getActor());
  if (!result.ok) throw new Error(result.error.message);

  if (result.value.length === 0) {
    return (
      <EmptyState
        title="No profiles are published yet"
        description="This page names the people responsible for the network. It stays empty until there is someone real to name."
      />
    );
  }

  return (
    <div className="flex flex-col gap-[var(--section-y-large)]">
      {result.value.map((profile) => (
        <div key={profile.id}>
          <LeaderProfile
            displayName={profile.displayName}
            initiatedName={profile.initiatedName}
            role={profile.role}
            headline={profile.headline}
            paragraphs={profile.paragraphs}
            focusAreas={profile.focusAreas}
            initiatives={profile.initiatives}
            portraitUrl={profile.portraitUrl}
            portraitAlt={profile.portraitAlt}
          />

          <MediaShelf
            className="mt-[var(--spacing-9)]"
            photos={profile.photos}
            documents={profile.documents}
          />
        </div>
      ))}
    </div>
  );
}

/** The final layout's shape, so nothing moves when the content arrives. */
function LeadershipSkeleton() {
  return (
    <div className="grid gap-[var(--spacing-8)] lg:grid-cols-[18rem_1fr]" aria-hidden>
      <Skeleton className="aspect-[4/5] w-full" />
      <div className="flex flex-col gap-[var(--spacing-4)]">
        <Skeleton className="h-[var(--spacing-8)] w-[24ch]" />
        <Skeleton className="h-[var(--spacing-4)] w-[32ch]" />
        <Skeleton className="mt-[var(--spacing-4)] h-[var(--spacing-4)] w-full" />
        <Skeleton className="h-[var(--spacing-4)] w-full" />
        <Skeleton className="h-[var(--spacing-4)] w-[85%]" />
        <Skeleton className="mt-[var(--spacing-5)] h-[var(--spacing-4)] w-full" />
        <Skeleton className="h-[var(--spacing-4)] w-[70%]" />
      </div>
    </div>
  );
}

import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Skeleton } from '@/components/primitives';
import { EmptyState, PageHeader, Section, StoryCard } from '@/components/patterns';
import { getActor } from '@/server/auth';
import { listStories } from '@/domain/story/service';

export const metadata: Metadata = {
  title: 'Stories',
  description: 'How members of the ISKCON Elites Network came to the register, in their own words.',
};

export default function StoriesPage() {
  return (
    <Section>
      <PageHeader
        eyebrow="Stories"
        title="In their own words"
        lede="How members came to the network, and what they carried into their work."
      />
      <div className="mt-[var(--spacing-7)]">
        <Suspense fallback={<StoriesSkeleton />}>
          <StoryList />
        </Suspense>
      </div>
    </Section>
  );
}

async function StoryList() {
  const result = await listStories(await getActor());
  if (!result.ok) throw new Error(result.error.message);

  if (result.value.length === 0) {
    return (
      <EmptyState
        title="No stories yet"
        description="The first ones are being written. They will appear here as they are published."
      />
    );
  }

  return (
    <div className="max-w-[var(--measure-prose)]">
      {result.value.map((story) => (
        <StoryCard
          key={story.id}
          href={`/success-stories/${story.slug}`}
          title={story.title}
          excerpt={story.excerpt}
          author={story.author}
          publishedAt={story.publishedAt ? new Date(story.publishedAt) : null}
          className="mb-[var(--spacing-6)]"
        />
      ))}
    </div>
  );
}

function StoriesSkeleton() {
  return (
    <div className="max-w-[var(--measure-prose)]" aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="mb-[var(--spacing-6)] border-t border-line pt-[var(--spacing-4)]">
          <Skeleton className="h-[var(--spacing-6)] w-[70%]" />
          <Skeleton className="mt-[var(--spacing-3)] h-[var(--spacing-4)] w-full" />
          <Skeleton className="mt-[var(--spacing-2)] h-[var(--spacing-4)] w-[80%]" />
          <Skeleton className="mt-[var(--spacing-3)] h-[var(--spacing-3)] w-[24ch]" />
        </div>
      ))}
    </div>
  );
}

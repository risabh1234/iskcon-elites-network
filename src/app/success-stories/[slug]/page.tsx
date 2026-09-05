import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/primitives';
import { Prose, Section } from '@/components/patterns';
import { getActor } from '@/server/auth';
import { getStory } from '@/domain/story/service';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const result = await getStory({ kind: 'anonymous' }, slug);
  if (!result.ok) return { title: 'Story not found', robots: { index: false } };

  const story = result.value;
  return {
    title: story.title,
    description: story.excerpt ?? undefined,
    alternates: { canonical: `/success-stories/${story.slug}` },
    openGraph: { type: 'article', title: story.title, description: story.excerpt ?? undefined },
  };
}

export default async function StoryPage({ params }: Props) {
  const { slug } = await params;
  const result = await getStory(await getActor(), slug);
  if (!result.ok) notFound();

  const story = result.value;
  const published = story.publishedAt ? new Date(story.publishedAt) : null;

  return (
    <Section>
      <Button asChild variant="link" className="mb-[var(--spacing-6)]">
        <Link href="/success-stories">
          <ArrowLeft className="size-[var(--spacing-3)]" />
          All stories
        </Link>
      </Button>

      <article className="max-w-[var(--measure-prose)]">
        <h1 className="text-4xl">{story.title}</h1>

        {/* A real byline and a real date, or neither. */}
        {story.author || published ? (
          <p className="mt-[var(--spacing-4)] text-sm text-ink-subtle">
            {story.author}
            {story.author && published ? ' · ' : null}
            {published ? (
              <time dateTime={published.toISOString()}>
                {new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(published)}
              </time>
            ) : null}
          </p>
        ) : null}

        {story.excerpt ? (
          <p className="mt-[var(--spacing-6)] max-w-[var(--measure-lede)] text-lg text-ink-muted">
            {story.excerpt}
          </p>
        ) : null}

        <div className="mt-[var(--spacing-7)] border-t border-line pt-[var(--spacing-6)]">
          <Prose>
            {story.body.split(/\n{2,}/).map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </Prose>
        </div>

        {story.member ? (
          <p className="mt-[var(--spacing-8)] border-t border-line pt-[var(--spacing-5)] text-sm text-ink-muted">
            Read{' '}
            <Link href={`/directory/${story.member.slug}`}>{story.member.name}</Link>
            &rsquo;s entry in the directory.
          </p>
        ) : null}
      </article>
    </Section>
  );
}

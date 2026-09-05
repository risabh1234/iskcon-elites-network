import Link from 'next/link';
import { cn } from '@/lib/cn';

export interface StoryCardProps {
  href: string;
  title: string;
  excerpt?: string | null;
  author?: string | null;
  publishedAt?: Date | null;
  className?: string;
}

/** Editorial, not promotional: a real byline and a real date, or neither. */
export function StoryCard({
  href,
  title,
  excerpt,
  author,
  publishedAt,
  className,
}: StoryCardProps) {
  return (
    <article className={cn('border-t border-line pt-[var(--spacing-4)]', className)}>
      <Link href={href} className="group block no-underline">
        <h3 className="text-xl text-ink transition-colors duration-[var(--dur-instant)] ease-standard group-hover:text-accent">
          {title}
        </h3>

        {excerpt ? (
          <p className="mt-[var(--spacing-2)] max-w-[var(--measure-prose)] text-sm text-ink-muted line-clamp-3">
            {excerpt}
          </p>
        ) : null}

        {author || publishedAt ? (
          <p className="mt-[var(--spacing-3)] text-xs text-ink-subtle">
            {author}
            {author && publishedAt ? ' · ' : null}
            {publishedAt ? (
              <time dateTime={publishedAt.toISOString()}>
                {new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(publishedAt)}
              </time>
            ) : null}
          </p>
        ) : null}
      </Link>
    </article>
  );
}

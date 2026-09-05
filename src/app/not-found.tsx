import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/primitives';
import { Section } from '@/components/patterns';
import { NotFoundSearch } from '@/components/patterns/NotFoundSearch';

export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: false },
};

/**
 * A 404 here is almost always someone looking for a person — a stale link, a
 * renamed profile, a half-remembered name. So the page offers the search rather
 * than an apology.
 */
export default function NotFound() {
  return (
    <Section className="flex flex-1 flex-col justify-center">
      <div className="max-w-[var(--measure-lede)]">
        <p className="text-2xs uppercase tracking-wide text-ink-subtle">404</p>

        <h1 className="mt-[var(--spacing-4)] text-3xl">We couldn’t find that page</h1>

        <p className="mt-[var(--spacing-4)] text-ink-muted">
          The link may be out of date, or the profile it pointed to may not be published. If you
          were looking for someone, search the register — spelling is forgiven.
        </p>

        <div className="mt-[var(--spacing-6)]">
          <NotFoundSearch />
        </div>

        <div className="mt-[var(--spacing-6)] flex flex-wrap items-center gap-[var(--spacing-3)]">
          <Button asChild>
            <Link href="/directory">Browse the directory</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/">Return home</Link>
          </Button>
        </div>
      </div>
    </Section>
  );
}

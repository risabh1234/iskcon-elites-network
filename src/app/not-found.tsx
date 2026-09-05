import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/primitives';
import { Section } from '@/components/patterns';

export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: false },
};

/**
 * A 404 is usually someone looking for a person. Phase 5.1 replaces the links
 * below with a live directory search box; until search exists, pointing at the
 * directory is the honest version of that.
 */
export default function NotFound() {
  return (
    <Section className="flex flex-1 flex-col justify-center">
      <div className="max-w-[var(--measure-lede)]">
        <p className="text-2xs uppercase tracking-wide text-ink-subtle">404</p>

        <h1 className="mt-[var(--spacing-4)] text-3xl">We couldn’t find that page</h1>

        <p className="mt-[var(--spacing-4)] text-ink-muted">
          The link may be out of date, or the profile it pointed to may not be published. The
          directory is the best place to pick the trail back up.
        </p>

        <div className="mt-[var(--spacing-6)] flex flex-wrap items-center gap-[var(--spacing-3)]">
          <Button asChild variant="primary">
            <Link href="/directory">Browse the directory</Link>
          </Button>
          <Button asChild>
            <Link href="/">Return home</Link>
          </Button>
        </div>
      </div>
    </Section>
  );
}

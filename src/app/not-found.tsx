import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: false },
};

/**
 * A 404 is usually someone looking for a person. Phase 5.1 replaces the links
 * below with a live directory search box; until the search service exists,
 * pointing at the directory itself is the honest version of that.
 */
export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-[var(--container-max)] flex-1 flex-col justify-center px-[var(--container-pad)] py-[var(--section-y)]">
      <div className="max-w-[var(--measure-lede)]">
        <p className="text-[length:var(--text-xs)] uppercase tracking-[var(--tracking-wide)] text-[var(--color-ink-subtle)]">
          404
        </p>

        <h1 className="mt-[var(--space-4)] text-[length:var(--text-3xl)]">
          We couldn’t find that page
        </h1>

        <p className="mt-[var(--space-4)] text-[var(--color-ink-muted)]">
          The link may be out of date, or the profile it pointed to may not be published. The
          directory is the best place to pick the trail back up.
        </p>

        <div className="mt-[var(--space-6)] flex flex-wrap items-center gap-[var(--space-3)]">
          <Link
            href="/directory"
            className="rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-[var(--space-5)] py-[var(--space-3)] text-[length:var(--text-sm)] font-medium text-[var(--color-accent-ink)] no-underline transition-colors duration-[var(--dur-instant)] ease-[var(--ease-standard)] hover:bg-[var(--color-accent-hover)]"
          >
            Browse the directory
          </Link>

          <Link
            href="/"
            className="rounded-[var(--radius-sm)] border border-[var(--color-line-strong)] px-[var(--space-5)] py-[var(--space-3)] text-[length:var(--text-sm)] font-medium text-[var(--color-ink)] no-underline transition-colors duration-[var(--dur-instant)] ease-[var(--ease-standard)] hover:bg-[var(--color-paper-sunken)]"
          >
            Return home
          </Link>
        </div>
      </div>
    </div>
  );
}

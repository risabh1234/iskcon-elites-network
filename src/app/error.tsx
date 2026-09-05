'use client'; // Error boundaries must be Client Components.

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * Root error state. Next 16.2 passes `unstable_retry`, which re-fetches and
 * re-renders the boundary's children — unlike `reset`, which only clears the
 * error state. Retrying is what the reader actually wants here.
 *
 * The rule this page follows: name what failed, offer a way out, and surface the
 * digest so a support message can be matched to a server log.
 */
export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    // Phase 8 replaces this with Sentry. Until then the Worker log is what we have.
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-[var(--container-max)] flex-1 flex-col justify-center px-[var(--container-pad)] py-[var(--section-y)]">
      <div className="max-w-[var(--measure-lede)]">
        <p className="text-[length:var(--text-xs)] uppercase tracking-[var(--tracking-wide)] text-[var(--color-ink-subtle)]">
          Error
        </p>

        <h1 className="mt-[var(--space-4)] text-[length:var(--text-3xl)]">
          This page didn’t load
        </h1>

        <p className="mt-[var(--space-4)] text-[var(--color-ink-muted)]">
          Something on our side failed while preparing this page. Nothing you did caused it, and
          nothing you submitted has been lost. Trying again often works.
        </p>

        <div className="mt-[var(--space-6)] flex flex-wrap items-center gap-[var(--space-3)]">
          <button
            type="button"
            onClick={() => unstable_retry()}
            className="rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-[var(--space-5)] py-[var(--space-3)] text-[length:var(--text-sm)] font-medium text-[var(--color-accent-ink)] transition-colors duration-[var(--dur-instant)] ease-[var(--ease-standard)] hover:bg-[var(--color-accent-hover)]"
          >
            Try again
          </button>

          <Link
            href="/"
            className="rounded-[var(--radius-sm)] border border-[var(--color-line-strong)] px-[var(--space-5)] py-[var(--space-3)] text-[length:var(--text-sm)] font-medium text-[var(--color-ink)] no-underline transition-colors duration-[var(--dur-instant)] ease-[var(--ease-standard)] hover:bg-[var(--color-paper-sunken)]"
          >
            Return home
          </Link>
        </div>

        {error.digest ? (
          <p className="mt-[var(--space-7)] border-t border-[var(--color-line)] pt-[var(--space-4)] text-[length:var(--text-xs)] text-[var(--color-ink-subtle)]">
            If you need to report this, quote reference{' '}
            <code className="text-[var(--color-ink-muted)]" data-numeric>
              {error.digest}
            </code>
            .
          </p>
        ) : null}
      </div>
    </div>
  );
}

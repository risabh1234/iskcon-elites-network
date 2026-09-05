'use client'; // Error boundaries must be Client Components.

import { useEffect } from 'react';
import { ErrorState, Section } from '@/components/patterns';

/**
 * Root error state. Next 16.2 passes `unstable_retry`, which re-fetches and
 * re-renders the boundary's children — unlike `reset`, which only clears the
 * error state. Retrying is what the reader actually wants here.
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
    <Section className="flex flex-1 flex-col justify-center">
      <ErrorState
        title="This page didn’t load"
        description="Something on our side failed while preparing this page. Nothing you did caused it, and nothing you submitted has been lost."
        onRetry={() => unstable_retry()}
        reference={error.digest}
      />
    </Section>
  );
}

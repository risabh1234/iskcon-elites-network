'use client';

import { useEffect } from 'react';
import { ErrorState, Section } from '@/components/patterns';

export default function EventsError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <Section>
      <ErrorState
        title="The calendar didn’t load"
        description="The gatherings are still scheduled; we could not fetch them just now."
        onRetry={() => unstable_retry()}
        reference={error.digest}
      />
    </Section>
  );
}

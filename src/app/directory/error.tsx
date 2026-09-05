'use client';

import { useEffect } from 'react';
import { ErrorState, Section } from '@/components/patterns';

export default function DirectoryError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Section>
      <ErrorState
        title="The directory didn’t load"
        description="The register is there; we could not reach it just now. Your filters have been kept."
        onRetry={() => unstable_retry()}
        reference={error.digest}
      />
    </Section>
  );
}

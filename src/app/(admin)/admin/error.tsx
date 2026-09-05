'use client';

import { useEffect } from 'react';
import { ErrorState } from '@/components/patterns';

export default function AdminError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <ErrorState
      title="This section didn’t load"
      description="Nothing was changed. The console could not read from the database just now."
      onRetry={() => unstable_retry()}
      reference={error.digest}
    />
  );
}

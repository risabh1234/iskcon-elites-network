import { Section } from '@/components/patterns';
import { Skeleton } from '@/components/primitives';
import { DirectorySkeleton } from './DirectorySkeleton';

export default function Loading() {
  return (
    <Section role="status" aria-live="polite">
      <span className="sr-only">Loading the directory</span>
      <Skeleton className="h-[var(--spacing-8)] w-[14ch]" />
      <Skeleton className="mt-[var(--spacing-3)] h-[var(--spacing-4)] w-[40ch] max-w-full" />
      <div className="mt-[var(--spacing-7)]">
        <DirectorySkeleton />
      </div>
    </Section>
  );
}

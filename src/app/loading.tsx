import { Skeleton } from '@/components/primitives';
import { Section } from '@/components/patterns';

/**
 * Root loading state — the shape of a typical page header, so the swap to real
 * content does not shift layout. Route segments that know their own shape
 * should ship their own loading.tsx rather than inherit this one.
 */
export default function Loading() {
  return (
    <Section role="status" aria-live="polite">
      <span className="sr-only">Loading</span>

      <div className="flex max-w-[var(--measure-lede)] flex-col gap-[var(--spacing-4)]">
        <Skeleton className="h-[var(--spacing-3)] w-[8ch]" />
        <Skeleton className="h-[var(--spacing-7)] w-full" />
        <Skeleton className="h-[var(--spacing-7)] w-[70%]" />
        <Skeleton className="mt-[var(--spacing-2)] h-[var(--spacing-4)] w-[90%]" />
      </div>
    </Section>
  );
}

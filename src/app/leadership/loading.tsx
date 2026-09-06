import { Skeleton } from '@/components/primitives';
import { Section } from '@/components/patterns';

/**
 * The page's own shape rather than the root fallback: a portrait column beside
 * a text column. Inheriting the generic header skeleton would shift the whole
 * layout sideways the moment the real content arrived.
 */
export default function Loading() {
  return (
    <Section role="status" aria-live="polite">
      <span className="sr-only">Loading</span>

      <div className="flex max-w-[var(--measure-lede)] flex-col gap-[var(--spacing-4)] border-b border-line pb-[var(--spacing-5)]">
        <Skeleton className="h-[var(--spacing-3)] w-[10ch]" />
        <Skeleton className="h-[var(--spacing-7)] w-[26ch]" />
        <Skeleton className="h-[var(--spacing-4)] w-[40ch]" />
      </div>

      <div className="mt-[var(--spacing-9)] grid gap-[var(--spacing-8)] lg:grid-cols-[18rem_1fr]">
        <Skeleton className="aspect-[4/5] w-full" />
        <div className="flex flex-col gap-[var(--spacing-4)]">
          <Skeleton className="h-[var(--spacing-8)] w-[24ch]" />
          <Skeleton className="h-[var(--spacing-4)] w-[32ch]" />
          <Skeleton className="mt-[var(--spacing-4)] h-[var(--spacing-4)] w-full" />
          <Skeleton className="h-[var(--spacing-4)] w-full" />
          <Skeleton className="h-[var(--spacing-4)] w-[85%]" />
        </div>
      </div>
    </Section>
  );
}

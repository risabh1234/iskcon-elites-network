import { Skeleton } from '@/components/primitives';

export default function AdminLoading() {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Loading</span>
      <Skeleton className="h-[var(--spacing-7)] w-[16ch]" />
      <Skeleton className="mt-[var(--spacing-3)] h-[var(--spacing-4)] w-[40ch] max-w-full" />
      <div className="mt-[var(--spacing-6)] rounded-sm border border-line">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex gap-[var(--spacing-4)] border-b border-line p-[var(--spacing-4)] last:border-b-0">
            <Skeleton className="h-[var(--spacing-4)] w-[20%]" />
            <Skeleton className="h-[var(--spacing-4)] w-[30%]" />
            <Skeleton className="h-[var(--spacing-4)] w-[20%]" />
            <Skeleton className="h-[var(--spacing-4)] w-[15%]" />
          </div>
        ))}
      </div>
    </div>
  );
}

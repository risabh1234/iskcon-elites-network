import { Skeleton } from '@/components/primitives';

/**
 * Matches the gallery card's geometry exactly — avatar, two lines, two tags —
 * so the swap to real content shifts nothing. A skeleton that is merely
 * "roughly the right size" trades a blank frame for a layout shift, which is
 * the worse of the two.
 */
export function DirectorySkeleton({ count = 9 }: { count?: number }) {
  return (
    <ul
      className="grid list-none grid-cols-1 gap-[var(--spacing-4)] p-0 md:grid-cols-2 lg:grid-cols-3"
      aria-hidden
    >
      {Array.from({ length: count }, (_, i) => (
        <li
          key={i}
          className="rounded-sm border border-line bg-paper-raised p-[var(--spacing-4)]"
        >
          <div className="flex items-start gap-[var(--spacing-4)]">
            <Skeleton className="size-[var(--spacing-9)] shrink-0 rounded-sm" />
            <div className="flex-1">
              <Skeleton className="h-[var(--spacing-5)] w-[60%]" />
              <Skeleton className="mt-[var(--spacing-2)] h-[var(--spacing-4)] w-[85%]" />
              <Skeleton className="mt-[var(--spacing-3)] h-[var(--spacing-3)] w-[40%]" />
            </div>
          </div>
          <div className="mt-[var(--spacing-4)] flex gap-[var(--spacing-2)]">
            <Skeleton className="h-[var(--spacing-4)] w-[5rem] rounded-full" />
            <Skeleton className="h-[var(--spacing-4)] w-[4rem] rounded-full" />
          </div>
        </li>
      ))}
    </ul>
  );
}

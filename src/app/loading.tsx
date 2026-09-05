/**
 * Root loading state. Deliberately quiet: a page-level skeleton that matches the
 * shape of a typical page header, so the transition into real content does not
 * shift layout. Route segments that know their own shape should ship their own
 * loading.tsx rather than inherit this one.
 */
export default function Loading() {
  return (
    <div
      className="mx-auto w-full max-w-[var(--container-max)] px-[var(--container-pad)] py-[var(--section-y)]"
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">Loading</span>

      <div className="max-w-[var(--measure-lede)] space-y-[var(--space-4)]">
        <Bar className="h-[var(--space-3)] w-[8ch]" />
        <Bar className="h-[var(--space-7)] w-full" />
        <Bar className="h-[var(--space-7)] w-[70%]" />
        <div className="pt-[var(--space-2)]">
          <Bar className="h-[var(--space-4)] w-[90%]" />
        </div>
      </div>
    </div>
  );
}

function Bar({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-[var(--radius-xs)] bg-[var(--color-paper-sunken)] ${className ?? ''}`}
    />
  );
}

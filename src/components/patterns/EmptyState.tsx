import { cn } from '@/lib/cn';

export interface EmptyStateProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title: React.ReactNode;
  /** Say what would fill this space, not just that it is empty. */
  description?: React.ReactNode;
  icon?: React.ReactNode;
  /** A next action. An empty state without one is a dead end. */
  action?: React.ReactNode;
  /** Adjacent things worth trying — for zero-result searches especially. */
  suggestions?: React.ReactNode;
}

export function EmptyState({
  className,
  title,
  description,
  icon,
  action,
  suggestions,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        'rounded-sm border border-dashed border-line',
        'px-[var(--spacing-5)] py-[var(--spacing-9)]',
        className,
      )}
      {...props}
    >
      {icon ? <div className="mb-[var(--spacing-4)] text-ink-faint">{icon}</div> : null}

      <p className="font-display text-xl text-ink">{title}</p>

      {description ? (
        <p className="mt-[var(--spacing-2)] max-w-[var(--measure-lede)] text-sm text-ink-muted">
          {description}
        </p>
      ) : null}

      {action ? <div className="mt-[var(--spacing-5)]">{action}</div> : null}

      {suggestions ? (
        <div className="mt-[var(--spacing-5)] flex flex-wrap items-center justify-center gap-[var(--spacing-2)]">
          {suggestions}
        </div>
      ) : null}
    </div>
  );
}

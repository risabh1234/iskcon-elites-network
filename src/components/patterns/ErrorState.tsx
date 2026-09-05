'use client';

import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { cn } from '@/lib/cn';

export interface ErrorStateProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Name what failed. "Something went wrong" tells the reader nothing. */
  title?: React.ReactNode;
  description?: React.ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  /** Support reference, e.g. an error digest. */
  reference?: string;
}

export function ErrorState({
  className,
  title = 'This didn’t load',
  description = 'The request failed before it finished. Trying again often works.',
  onRetry,
  retryLabel = 'Try again',
  reference,
  ...props
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center text-center',
        'rounded-sm border border-line bg-danger-quiet/40',
        'px-[var(--spacing-5)] py-[var(--spacing-8)]',
        className,
      )}
      {...props}
    >
      <AlertTriangle className="mb-[var(--spacing-4)] size-[var(--spacing-6)] text-danger" aria-hidden />

      <p className="font-display text-xl text-ink">{title}</p>

      <p className="mt-[var(--spacing-2)] max-w-[var(--measure-lede)] text-sm text-ink-muted">
        {description}
      </p>

      {onRetry ? (
        <Button className="mt-[var(--spacing-5)]" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}

      {reference ? (
        <p className="mt-[var(--spacing-5)] text-xs text-ink-subtle">
          Reference <code data-numeric>{reference}</code>
        </p>
      ) : null}
    </div>
  );
}

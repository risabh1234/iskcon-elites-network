'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';
import { cn } from '@/lib/cn';

export interface PaginationProps extends React.HTMLAttributes<HTMLElement> {
  /** Cursor pagination has no page numbers, so the API is prev/next only. */
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  /** e.g. "1–24 of 212". Rendered in an aria-live region so paging is announced. */
  summary?: React.ReactNode;
}

export function Pagination({
  className,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
  summary,
  ...props
}: PaginationProps) {
  return (
    <nav
      aria-label="Pagination"
      className={cn(
        'flex flex-wrap items-center justify-between gap-[var(--spacing-3)]',
        'border-t border-line pt-[var(--spacing-4)]',
        className,
      )}
      {...props}
    >
      <p className="text-xs text-ink-subtle" aria-live="polite" data-numeric>
        {summary}
      </p>

      <div className="flex items-center gap-[var(--spacing-2)]">
        <Button size="sm" onClick={onPrevious} disabled={!hasPrevious}>
          <ChevronLeft className="size-[var(--spacing-3)]" />
          Previous
        </Button>
        <Button size="sm" onClick={onNext} disabled={!hasNext}>
          Next
          <ChevronRight className="size-[var(--spacing-3)]" />
        </Button>
      </div>
    </nav>
  );
}

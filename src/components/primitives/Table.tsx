'use client';

import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Dense and calm. Rows are separated by hairlines, never by fills; numbers are
 * tabular (set globally on `table` in base.css) so columns align.
 *
 * The wrapper scrolls horizontally on its own so a wide table never makes the
 * page scroll sideways.
 */
export function TableWrapper({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('w-full overflow-x-auto rounded-sm border border-line', className)}
      {...props}
    />
  );
}

export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return <table className={cn('w-full border-collapse text-sm', className)} {...props} />;
}

export function TableHead({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn('sticky top-0 z-10 bg-paper-sunken text-ink-subtle', className)}
      {...props}
    />
  );
}

export function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('divide-y divide-line', className)} {...props} />;
}

export function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        'transition-colors duration-[var(--dur-instant)] ease-standard hover:bg-paper-sunken/60',
        className,
      )}
      {...props}
    />
  );
}

export type SortDirection = 'asc' | 'desc' | null;

// `align` is shadowed: the deprecated HTML attribute takes left/right, we take
// logical start/end so the table works unchanged in a right-to-left locale.
export interface TableHeaderCellProps
  extends Omit<React.ThHTMLAttributes<HTMLTableCellElement>, 'align'> {
  /** Omit to render a plain, non-sortable header. */
  sort?: SortDirection;
  onSort?: () => void;
  align?: 'start' | 'end';
}

export function TableHeaderCell({
  className,
  children,
  sort,
  onSort,
  align = 'start',
  ...props
}: TableHeaderCellProps) {
  const sortable = typeof onSort === 'function';

  return (
    <th
      scope="col"
      // Communicates current sort to assistive tech, not just visually.
      aria-sort={sort === 'asc' ? 'ascending' : sort === 'desc' ? 'descending' : undefined}
      className={cn(
        'whitespace-nowrap border-b border-line px-[var(--spacing-4)] py-[var(--spacing-3)]',
        'text-2xs font-medium uppercase tracking-wide',
        align === 'end' ? 'text-right' : 'text-left',
        className,
      )}
      {...props}
    >
      {sortable ? (
        <button
          type="button"
          onClick={onSort}
          className={cn(
            'inline-flex items-center gap-[var(--spacing-1)] rounded-xs',
            'transition-colors duration-[var(--dur-instant)] ease-standard hover:text-ink',
          )}
        >
          {children}
          {sort === 'asc' ? (
            <ArrowUp className="size-[var(--spacing-3)]" />
          ) : sort === 'desc' ? (
            <ArrowDown className="size-[var(--spacing-3)]" />
          ) : (
            <ChevronsUpDown className="size-[var(--spacing-3)] opacity-50" />
          )}
        </button>
      ) : (
        children
      )}
    </th>
  );
}

export interface TableCellProps
  extends Omit<React.TdHTMLAttributes<HTMLTableCellElement>, 'align'> {
  align?: 'start' | 'end';
}

export function TableCell({ className, align = 'start', ...props }: TableCellProps) {
  return (
    <td
      className={cn(
        'px-[var(--spacing-4)] py-[var(--spacing-3)] text-ink-muted align-middle',
        align === 'end' ? 'text-right' : 'text-left',
        className,
      )}
      {...props}
    />
  );
}

export function TableCaption({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <caption
      className={cn('px-[var(--spacing-4)] py-[var(--spacing-3)] text-left text-xs text-ink-subtle', className)}
      {...props}
    />
  );
}

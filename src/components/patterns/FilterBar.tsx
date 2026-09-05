'use client';

import { Search, X } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { cn } from '@/lib/cn';

export interface FilterBarProps extends React.HTMLAttributes<HTMLDivElement> {
  query: string;
  onQueryChange: (value: string) => void;
  placeholder?: string;
  /** Selects, comboboxes and toggles that narrow the list. */
  filters?: React.ReactNode;
  /** Rendered at the end — view switches, sort, count. */
  trailing?: React.ReactNode;
  onClear?: () => void;
  activeFilterCount?: number;
}

export function FilterBar({
  className,
  query,
  onQueryChange,
  placeholder = 'Search',
  filters,
  trailing,
  onClear,
  activeFilterCount = 0,
  ...props
}: FilterBarProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-[var(--spacing-3)]',
        className,
      )}
      {...props}
    >
      <div className="relative min-w-[14rem] flex-1">
        <Search
          className="pointer-events-none absolute left-[var(--spacing-3)] top-1/2 size-[var(--spacing-4)] -translate-y-1/2 text-ink-subtle"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className={cn(
            'h-[var(--spacing-7)] w-full rounded-sm border border-line-strong bg-paper-raised',
            'pl-[var(--spacing-8)] pr-[var(--spacing-3)] text-sm text-ink',
            'transition-colors duration-[var(--dur-instant)] ease-standard',
            'hover:border-ink-faint placeholder:text-ink-subtle',
            // Safari draws its own clear affordance, which duplicates ours.
            '[&::-webkit-search-cancel-button]:appearance-none',
          )}
        />
      </div>

      {filters}

      {onClear && activeFilterCount > 0 ? (
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X className="size-[var(--spacing-3)]" />
          Clear
          <span className="sr-only">
            {activeFilterCount} active {activeFilterCount === 1 ? 'filter' : 'filters'}
          </span>
        </Button>
      ) : null}

      {trailing ? <div className="ml-auto flex items-center gap-[var(--spacing-2)]">{trailing}</div> : null}
    </div>
  );
}

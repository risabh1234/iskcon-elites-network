'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Button } from '@/components/primitives';
import { cn } from '@/lib/cn';

/** Hands the query to the directory, which already knows how to search. */
export function NotFoundSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        const q = query.trim();
        router.push(q ? `/directory?q=${encodeURIComponent(q)}` : '/directory');
      }}
      className="flex flex-wrap items-center gap-[var(--spacing-3)]"
    >
      <div className="relative min-w-[16rem] flex-1">
        <Search
          className="pointer-events-none absolute left-[var(--spacing-3)] top-1/2 size-[var(--spacing-4)] -translate-y-1/2 text-ink-subtle"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search the register"
          aria-label="Search the register"
          className={cn(
            'h-[var(--spacing-7)] w-full rounded-sm border border-line-strong bg-paper-raised',
            'pl-[var(--spacing-8)] pr-[var(--spacing-3)] text-sm text-ink',
            'transition-colors duration-[var(--dur-instant)] ease-standard',
            'hover:border-ink-faint placeholder:text-ink-subtle',
            '[&::-webkit-search-cancel-button]:appearance-none',
          )}
        />
      </div>
      <Button type="submit" variant="primary">Search</Button>
    </form>
  );
}

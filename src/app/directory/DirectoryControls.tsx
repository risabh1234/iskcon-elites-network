'use client';

import { useEffect, useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutGrid, Rows3, Search, X } from 'lucide-react';
import { Badge, Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/primitives';
import { cn } from '@/lib/cn';
import { toSearchString, type DirectoryQuery } from '@/lib/search-params';
import type { Facets } from '@/domain/member/service';

export type DirectoryControlsProps = {
  query: DirectoryQuery;
  facets: Facets;
  total: number;
};

/**
 * Every control writes to the URL and nothing else. The list is rendered on the
 * server from those same parameters, so what you see is always what the address
 * bar says — shareable, and correct after a back button.
 */
export function DirectoryControls({ query, facets, total }: DirectoryControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [text, setText] = useState(query.q);
  const [lastAppliedQ, setLastAppliedQ] = useState(query.q);

  // Keep the box in step when navigation changes the query — the back button,
  // or a cleared filter — without fighting the user while they type.
  //
  // Adjusted during render rather than in an effect: an effect would paint the
  // stale value first and then correct it, which is a visible flicker in a
  // search box. This is React's documented pattern for resetting state when a
  // prop changes.
  if (query.q !== lastAppliedQ) {
    setLastAppliedQ(query.q);
    setText(query.q);
  }

  function apply(next: Partial<DirectoryQuery>) {
    // Any change to the filters invalidates the cursor: page 3 of the old
    // result set is meaningless in the new one.
    const merged = { ...query, cursor: null, ...next };
    startTransition(() => router.push(`${pathname}${toSearchString(merged)}`, { scroll: false }));
  }

  // Debounced: 200ms is long enough to skip most intermediate keystrokes and
  // short enough that the list feels attached to the box.
  useEffect(() => {
    if (text === query.q) return;
    const timer = setTimeout(() => apply({ q: text }), 200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const filterCount = [query.kind, query.expertise, query.country].filter(Boolean).length;
  const hasAny = filterCount > 0 || query.q.length > 0;

  return (
    <div className="flex flex-col gap-[var(--spacing-4)]">
      <div className="flex flex-wrap items-center gap-[var(--spacing-3)]">
        <div className="relative min-w-[16rem] flex-1">
          <Search
            className="pointer-events-none absolute left-[var(--spacing-3)] top-1/2 size-[var(--spacing-4)] -translate-y-1/2 text-ink-subtle"
            aria-hidden
          />
          <input
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Search by name, role, or city"
            aria-label="Search the directory"
            className={cn(
              'h-[var(--spacing-7)] w-full rounded-sm border border-line-strong bg-paper-raised',
              'pl-[var(--spacing-8)] pr-[var(--spacing-3)] text-sm text-ink',
              'transition-colors duration-[var(--dur-instant)] ease-standard',
              'hover:border-ink-faint placeholder:text-ink-subtle',
              '[&::-webkit-search-cancel-button]:appearance-none',
            )}
          />
        </div>

        <Select value={query.kind ?? 'all'} onValueChange={(v) => apply({ kind: v === 'all' ? null : (v as DirectoryQuery['kind']) })}>
          <SelectTrigger className="w-[10rem]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Everyone</SelectItem>
            <SelectItem value="ALUMNUS">Alumni</SelectItem>
            <SelectItem value="SPEAKER">Speakers</SelectItem>
            <SelectItem value="GUEST">Guests</SelectItem>
          </SelectContent>
        </Select>

        <Select value={query.expertise ?? 'all'} onValueChange={(v) => apply({ expertise: v === 'all' ? null : v })}>
          <SelectTrigger className="w-[12rem]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any field</SelectItem>
            {facets.expertise.map((e) => (
              <SelectItem key={e.slug} value={e.slug}>{e.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={query.country ?? 'all'} onValueChange={(v) => apply({ country: v === 'all' ? null : v })}>
          <SelectTrigger className="w-[12rem]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Anywhere</SelectItem>
            {facets.countries.map((c) => (
              <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-[var(--spacing-3)]">
        <p className="text-xs text-ink-subtle" aria-live="polite" data-numeric>
          {pending ? 'Searching…' : `${total} ${total === 1 ? 'member' : 'members'}`}
          {hasAny ? ' matching' : ' in the register'}
        </p>

        <div className="flex items-center gap-[var(--spacing-2)]">
          {hasAny ? (
            <Button variant="ghost" size="sm" onClick={() => apply({ q: '', kind: null, expertise: null, country: null })}>
              <X className="size-[var(--spacing-3)]" />
              Clear
              {filterCount > 0 ? <Badge tone="neutral">{filterCount}</Badge> : null}
            </Button>
          ) : null}

          <Select value={query.sort} onValueChange={(v) => apply({ sort: v as DirectoryQuery['sort'] })}>
            <SelectTrigger className="w-[10rem]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="name">A–Z</SelectItem>
              <SelectItem value="recent">Recently added</SelectItem>
            </SelectContent>
          </Select>

          {/* Gallery for browsing, index for people who know who they want. */}
          <div className="flex rounded-sm border border-line-strong" role="group" aria-label="View">
            <ViewButton active={query.view === 'gallery'} onClick={() => apply({ view: 'gallery' })} label="Gallery view">
              <LayoutGrid className="size-[var(--spacing-4)]" />
            </ViewButton>
            <ViewButton active={query.view === 'index'} onClick={() => apply({ view: 'index' })} label="Index view">
              <Rows3 className="size-[var(--spacing-4)]" />
            </ViewButton>
          </div>
        </div>
      </div>
    </div>
  );
}

function ViewButton({
  active, onClick, label, children,
}: {
  active: boolean; onClick: () => void; label: string; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        'grid size-[var(--spacing-7)] place-items-center',
        'transition-colors duration-[var(--dur-instant)] ease-standard',
        active ? 'bg-paper-sunken text-ink' : 'text-ink-subtle hover:text-ink',
      )}
    >
      {children}
    </button>
  );
}

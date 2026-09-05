'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { Dialog as RxDialog } from 'radix-ui';
import { cn } from '@/lib/cn';
import { DialogOverlay } from './Dialog';

export type CommandItem = {
  id: string;
  label: string;
  /** Extra text matched against the query but not displayed. */
  keywords?: string;
  group?: string;
  icon?: React.ReactNode;
  shortcut?: string;
  disabled?: boolean;
  onSelect: () => void;
};

/**
 * A filterable command list with full keyboard control.
 *
 * Focus stays in the input and the active option is communicated with
 * aria-activedescendant. That is the pattern the combobox spec prescribes: it
 * keeps typing and navigating in one place, which roving tabindex cannot do.
 */
export function useListbox<T extends { id: string; disabled?: boolean }>(items: T[], onPick: (item: T) => void) {
  const [rawIndex, setActiveIndex] = useState(0);

  // Filtering can shorten the list under the marker. Clamp on read rather than
  // correcting in an effect: an effect would render once with an out-of-range
  // index, and aria-activedescendant would briefly point at nothing.
  const activeIndex = rawIndex > items.length - 1 ? 0 : rawIndex;

  const move = useCallback(
    (delta: number) => {
      if (items.length === 0) return;
      setActiveIndex((current) => {
        let next = current > items.length - 1 ? 0 : current;
        for (let step = 0; step < items.length; step += 1) {
          next = (next + delta + items.length) % items.length;
          if (!items[next]?.disabled) return next;
        }
        return current;
      });
    },
    [items],
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          move(1);
          break;
        case 'ArrowUp':
          event.preventDefault();
          move(-1);
          break;
        case 'Home':
          event.preventDefault();
          setActiveIndex(0);
          break;
        case 'End':
          event.preventDefault();
          setActiveIndex(Math.max(0, items.length - 1));
          break;
        case 'Enter': {
          const item = items[activeIndex];
          if (item && !item.disabled) {
            event.preventDefault();
            onPick(item);
          }
          break;
        }
        default:
          break;
      }
    },
    [activeIndex, items, move, onPick],
  );

  return { activeIndex, setActiveIndex, onKeyDown };
}

export function matches(query: string, ...fields: (string | undefined)[]) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some((f) => f?.toLowerCase().includes(q));
}

export interface CommandProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CommandItem[];
  placeholder?: string;
  emptyMessage?: string;
}

export function Command({
  open,
  onOpenChange,
  items,
  placeholder = 'Search…',
  emptyMessage = 'No matches',
}: CommandProps) {
  const [query, setQuery] = useState('');
  const listId = useId();
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(
    () => items.filter((item) => matches(query, item.label, item.keywords)),
    [items, query],
  );

  const pick = useCallback(
    (item: CommandItem) => {
      onOpenChange(false);
      setQuery('');
      item.onSelect();
    },
    [onOpenChange],
  );

  const { activeIndex, setActiveIndex, onKeyDown } = useListbox(filtered, pick);

  // Keep the active option in view while arrowing through a long list.
  useEffect(() => {
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const groups = useMemo(() => {
    const map = new Map<string, CommandItem[]>();
    for (const item of filtered) {
      const key = item.group ?? '';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return [...map.entries()];
  }, [filtered]);

  let index = -1;

  return (
    <RxDialog.Root open={open} onOpenChange={onOpenChange}>
      <RxDialog.Portal>
        <DialogOverlay />
        <RxDialog.Content
          className={cn(
            'fixed left-1/2 top-[12vh] z-[var(--z-overlay)] w-[min(36rem,calc(100%-var(--spacing-6)))]',
            '-translate-x-1/2 overflow-hidden',
            'rounded-md border border-line bg-paper-raised shadow-overlay',
            'data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out',
          )}
          aria-label="Command palette"
        >
          <RxDialog.Title className="sr-only">Command palette</RxDialog.Title>

          <div className="flex items-center gap-[var(--spacing-3)] border-b border-line px-[var(--spacing-4)]">
            <Search className="size-[var(--spacing-4)] shrink-0 text-ink-subtle" aria-hidden />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={onKeyDown}
              placeholder={placeholder}
              role="combobox"
              aria-expanded
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={
                filtered[activeIndex] ? `${listId}-${filtered[activeIndex]!.id}` : undefined
              }
              className={cn(
                'h-[var(--spacing-8)] w-full bg-transparent text-sm text-ink outline-none',
                'placeholder:text-ink-subtle',
              )}
            />
          </div>

          <div
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label="Results"
            className="max-h-[20rem] overflow-y-auto p-[var(--spacing-1)]"
          >
            {filtered.length === 0 ? (
              <p className="px-[var(--spacing-3)] py-[var(--spacing-5)] text-center text-sm text-ink-subtle">
                {emptyMessage}
              </p>
            ) : (
              groups.map(([group, groupItems]) => (
                <div key={group || 'ungrouped'}>
                  {group ? (
                    <p className="px-[var(--spacing-3)] pb-[var(--spacing-1)] pt-[var(--spacing-3)] text-2xs uppercase tracking-wide text-ink-subtle">
                      {group}
                    </p>
                  ) : null}

                  {groupItems.map((item) => {
                    index += 1;
                    const isActive = index === activeIndex;
                    return (
                      <div
                        key={item.id}
                        id={`${listId}-${item.id}`}
                        role="option"
                        aria-selected={isActive}
                        aria-disabled={item.disabled || undefined}
                        data-active={isActive}
                        onClick={() => !item.disabled && pick(item)}
                        onMouseMove={() => setActiveIndex(filtered.indexOf(item))}
                        className={cn(
                          'flex cursor-pointer items-center gap-[var(--spacing-3)]',
                          'rounded-xs px-[var(--spacing-3)] py-[var(--spacing-2)] text-sm text-ink',
                          isActive && 'bg-paper-sunken',
                          item.disabled && 'pointer-events-none text-ink-faint',
                        )}
                      >
                        {item.icon ? (
                          <span className="shrink-0 text-ink-subtle">{item.icon}</span>
                        ) : null}
                        <span className="flex-1">{item.label}</span>
                        {item.shortcut ? (
                          <kbd className="text-2xs text-ink-subtle">{item.shortcut}</kbd>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </RxDialog.Content>
      </RxDialog.Portal>
    </RxDialog.Root>
  );
}

/** Opens the palette on the platform's command/control + K. */
export function useCommandShortcut(onOpen: () => void) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        onOpen();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onOpen]);
}

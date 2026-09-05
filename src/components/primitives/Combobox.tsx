'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useFieldControl } from './Field';
import { useListbox, matches } from './Command';

export type ComboboxOption = {
  value: string;
  label: string;
  hint?: string;
  disabled?: boolean;
};

export interface ComboboxProps {
  options: ComboboxOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

/**
 * A single-select combobox: type to filter, arrow to choose.
 *
 * Radix has no combobox, and the alternative was a component kit — which would
 * import someone else's design opinions along with the behaviour. This follows
 * the WAI-ARIA combobox pattern directly: focus stays in the input, the active
 * option is named by aria-activedescendant, and Escape closes without changing
 * the value.
 */
export function Combobox({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  emptyMessage = 'No matches',
  disabled = false,
  className,
  id,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const generatedId = useId();
  const field = useFieldControl();
  const inputId = id ?? field.id ?? generatedId;
  const listId = `${inputId}-list`;

  const selected = options.find((o) => o.value === value) ?? null;

  const filtered = useMemo(
    () => options.filter((o) => matches(query, o.label, o.hint)),
    [options, query],
  );

  const items = useMemo(
    () => filtered.map((o) => ({ id: o.value, disabled: o.disabled })),
    [filtered],
  );

  const { activeIndex, setActiveIndex, onKeyDown: listKeyDown } = useListbox(items, (item) => {
    commit(item.id);
  });

  function commit(next: string) {
    onChange(next);
    setOpen(false);
    setQuery('');
    inputRef.current?.focus();
  }

  // Close on an outside click without swallowing the click itself.
  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (open) listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <div
        className={cn(
          'flex h-[var(--spacing-7)] items-center gap-[var(--spacing-2)]',
          'rounded-sm border border-line-strong bg-paper-raised px-[var(--spacing-3)]',
          'transition-colors duration-[var(--dur-instant)] ease-standard',
          'hover:border-ink-faint',
          'has-[input:disabled]:cursor-not-allowed has-[input:disabled]:bg-paper-sunken',
          field['aria-invalid'] && 'border-danger',
        )}
      >
        <input
          ref={inputRef}
          id={inputId}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-describedby={field['aria-describedby']}
          aria-invalid={field['aria-invalid']}
          aria-activedescendant={
            open && filtered[activeIndex] ? `${listId}-${filtered[activeIndex]!.value}` : undefined
          }
          disabled={disabled}
          value={open ? query : (selected?.label ?? '')}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setOpen(false);
              setQuery('');
              return;
            }
            if (!open && (event.key === 'ArrowDown' || event.key === 'Enter')) {
              event.preventDefault();
              setOpen(true);
              return;
            }
            if (open) listKeyDown(event);
          }}
          className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-subtle disabled:text-ink-faint"
        />

        <ChevronDown
          className={cn(
            'size-[var(--spacing-4)] shrink-0 text-ink-subtle',
            'transition-transform duration-[var(--dur-instant)] ease-standard',
            open && 'rotate-180',
          )}
          aria-hidden
        />
      </div>

      <ul
        ref={listRef}
        id={listId}
        role="listbox"
        hidden={!open}
        className={cn(
          'absolute inset-x-0 top-[calc(100%+var(--spacing-1))] z-[var(--z-overlay)]',
          'max-h-[16rem] overflow-y-auto',
          'rounded-sm border border-line bg-paper-raised p-[var(--spacing-1)] shadow-overlay',
        )}
      >
        {filtered.length === 0 ? (
          <li className="px-[var(--spacing-3)] py-[var(--spacing-4)] text-center text-sm text-ink-subtle">
            {emptyMessage}
          </li>
        ) : (
          filtered.map((option, i) => {
            const isActive = i === activeIndex;
            const isSelected = option.value === value;
            return (
              <li
                key={option.value}
                id={`${listId}-${option.value}`}
                role="option"
                aria-selected={isSelected}
                aria-disabled={option.disabled || undefined}
                data-active={isActive}
                onMouseMove={() => setActiveIndex(i)}
                onClick={() => !option.disabled && commit(option.value)}
                className={cn(
                  'flex cursor-pointer items-center justify-between gap-[var(--spacing-3)]',
                  'rounded-xs px-[var(--spacing-3)] py-[var(--spacing-2)] text-sm text-ink',
                  isActive && 'bg-paper-sunken',
                  option.disabled && 'pointer-events-none text-ink-faint',
                )}
              >
                <span className="flex flex-col">
                  {option.label}
                  {option.hint ? (
                    <span className="text-xs text-ink-subtle">{option.hint}</span>
                  ) : null}
                </span>
                {isSelected ? <Check className="size-[var(--spacing-4)] text-accent" /> : null}
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}

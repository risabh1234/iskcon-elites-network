'use client';

import { Select as RxSelect } from 'radix-ui';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useFieldControl } from './Field';

export const Select = RxSelect.Root;
export const SelectGroup = RxSelect.Group;
export const SelectValue = RxSelect.Value;

export function SelectTrigger({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof RxSelect.Trigger>) {
  const field = useFieldControl();
  return (
    <RxSelect.Trigger
      className={cn(
        'flex h-[var(--spacing-7)] w-full items-center justify-between gap-[var(--spacing-2)]',
        'rounded-sm border border-line-strong bg-paper-raised',
        'px-[var(--spacing-3)] text-sm text-ink text-left',
        'transition-colors duration-[var(--dur-instant)] ease-standard',
        'hover:border-ink-faint',
        'data-[placeholder]:text-ink-faint',
        'disabled:cursor-not-allowed disabled:bg-paper-sunken disabled:text-ink-faint',
        'aria-[invalid=true]:border-danger',
        className,
      )}
      {...field}
      {...props}
    >
      {children}
      <RxSelect.Icon asChild>
        <ChevronDown className="size-[var(--spacing-4)] shrink-0 text-ink-subtle" />
      </RxSelect.Icon>
    </RxSelect.Trigger>
  );
}

export function SelectContent({
  className,
  children,
  position = 'popper',
  ...props
}: React.ComponentPropsWithoutRef<typeof RxSelect.Content>) {
  return (
    <RxSelect.Portal>
      <RxSelect.Content
        position={position}
        className={cn(
          'relative z-[var(--z-overlay)] max-h-[min(24rem,var(--radix-select-content-available-height))]',
          'min-w-[var(--radix-select-trigger-width)] overflow-hidden',
          'rounded-sm border border-line bg-paper-raised shadow-overlay',
          'data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out',
          className,
        )}
        {...props}
      >
        <RxSelect.ScrollUpButton className="flex justify-center py-[var(--spacing-1)] text-ink-subtle">
          <ChevronUp className="size-[var(--spacing-4)]" />
        </RxSelect.ScrollUpButton>
        <RxSelect.Viewport className="p-[var(--spacing-1)]">{children}</RxSelect.Viewport>
        <RxSelect.ScrollDownButton className="flex justify-center py-[var(--spacing-1)] text-ink-subtle">
          <ChevronDown className="size-[var(--spacing-4)]" />
        </RxSelect.ScrollDownButton>
      </RxSelect.Content>
    </RxSelect.Portal>
  );
}

export function SelectItem({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof RxSelect.Item>) {
  return (
    <RxSelect.Item
      className={cn(
        'relative flex cursor-pointer select-none items-center justify-between gap-[var(--spacing-3)]',
        'rounded-xs px-[var(--spacing-2)] py-[var(--spacing-2)] text-sm text-ink outline-none',
        'data-[highlighted]:bg-paper-sunken',
        'data-[disabled]:pointer-events-none data-[disabled]:text-ink-faint',
        className,
      )}
      {...props}
    >
      <RxSelect.ItemText>{children}</RxSelect.ItemText>
      <RxSelect.ItemIndicator>
        <Check className="size-[var(--spacing-4)] text-accent" />
      </RxSelect.ItemIndicator>
    </RxSelect.Item>
  );
}

export function SelectLabel({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof RxSelect.Label>) {
  return (
    <RxSelect.Label
      className={cn(
        'px-[var(--spacing-2)] py-[var(--spacing-1)] text-2xs uppercase tracking-wide text-ink-subtle',
        className,
      )}
      {...props}
    />
  );
}

export function SelectSeparator({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof RxSelect.Separator>) {
  return (
    <RxSelect.Separator
      className={cn('my-[var(--spacing-1)] h-px bg-line', className)}
      {...props}
    />
  );
}

'use client';

import { Tabs as RxTabs } from 'radix-ui';
import { cn } from '@/lib/cn';

export const Tabs = RxTabs.Root;

export function TabsList({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof RxTabs.List>) {
  return (
    <RxTabs.List
      className={cn(
        'flex items-center gap-[var(--spacing-5)] border-b border-line',
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof RxTabs.Trigger>) {
  return (
    <RxTabs.Trigger
      className={cn(
        // The active marker is a hairline under the label, not a filled pill.
        'relative -mb-px border-b-2 border-transparent',
        'pb-[var(--spacing-3)] text-sm text-ink-subtle whitespace-nowrap',
        'transition-colors duration-[var(--dur-instant)] ease-standard',
        'hover:text-ink',
        'data-[state=active]:border-accent data-[state=active]:text-ink',
        'disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof RxTabs.Content>) {
  return <RxTabs.Content className={cn('pt-[var(--spacing-5)]', className)} {...props} />;
}

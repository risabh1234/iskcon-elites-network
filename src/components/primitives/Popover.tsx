'use client';

import { Popover as RxPopover } from 'radix-ui';
import { cn } from '@/lib/cn';

export const Popover = RxPopover.Root;
export const PopoverTrigger = RxPopover.Trigger;
export const PopoverAnchor = RxPopover.Anchor;
export const PopoverClose = RxPopover.Close;

export function PopoverContent({
  className,
  align = 'start',
  sideOffset = 6,
  ...props
}: React.ComponentPropsWithoutRef<typeof RxPopover.Content>) {
  return (
    <RxPopover.Portal>
      <RxPopover.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'z-[var(--z-overlay)] w-[min(20rem,calc(100vw-var(--spacing-6)))]',
          'rounded-sm border border-line bg-paper-raised p-[var(--spacing-4)] shadow-overlay',
          'data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out',
          className,
        )}
        {...props}
      />
    </RxPopover.Portal>
  );
}

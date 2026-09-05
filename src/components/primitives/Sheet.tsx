'use client';

import { Dialog as RxDialog } from 'radix-ui';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { DialogOverlay } from './Dialog';

/**
 * A Sheet is a Dialog anchored to an edge. Use it when the content is a
 * continuation of the page (filters, a nav drawer) rather than an interruption.
 */
export const Sheet = RxDialog.Root;
export const SheetTrigger = RxDialog.Trigger;
export const SheetClose = RxDialog.Close;

const sheet = cva(
  [
    'fixed z-[var(--z-overlay)] flex flex-col bg-paper-raised shadow-overlay',
    'transition-transform ease-emphasised',
  ],
  {
    variants: {
      side: {
        left: [
          'inset-y-0 left-0 h-full w-[min(24rem,calc(100%-var(--spacing-8)))] border-r border-line',
          'data-[state=open]:animate-slide-in-left data-[state=closed]:animate-slide-out-left',
        ],
        right: [
          'inset-y-0 right-0 h-full w-[min(24rem,calc(100%-var(--spacing-8)))] border-l border-line',
          'data-[state=open]:animate-slide-in-right data-[state=closed]:animate-slide-out-right',
        ],
        bottom: [
          'inset-x-0 bottom-0 max-h-[80dvh] w-full border-t border-line',
          'data-[state=open]:animate-slide-in-up data-[state=closed]:animate-slide-out-down',
        ],
      },
    },
    defaultVariants: { side: 'right' },
  },
);

export interface SheetContentProps
  extends Omit<React.ComponentPropsWithoutRef<typeof RxDialog.Content>, 'title'>,
    VariantProps<typeof sheet> {
  title: React.ReactNode;
  description?: React.ReactNode;
  titleHidden?: boolean;
}

export function SheetContent({
  className,
  children,
  side,
  title,
  description,
  titleHidden = false,
  ...props
}: SheetContentProps) {
  return (
    <RxDialog.Portal>
      <DialogOverlay />
      <RxDialog.Content className={cn(sheet({ side }), className)} {...props}>
        <div className="flex items-start justify-between gap-[var(--spacing-4)] border-b border-line p-[var(--spacing-5)]">
          <div className={cn('flex flex-col gap-[var(--spacing-1)]', titleHidden && 'sr-only')}>
            <RxDialog.Title className="text-lg">{title}</RxDialog.Title>
            {description ? (
              <RxDialog.Description className="text-sm text-ink-muted">
                {description}
              </RxDialog.Description>
            ) : null}
          </div>
          <RxDialog.Close
            className={cn(
              'grid size-[var(--spacing-6)] shrink-0 place-items-center rounded-sm text-ink-subtle',
              'transition-colors duration-[var(--dur-instant)] ease-standard',
              'hover:bg-paper-sunken hover:text-ink',
            )}
          >
            <X className="size-[var(--spacing-4)]" />
            <span className="sr-only">Close</span>
          </RxDialog.Close>
        </div>

        <div className="flex-1 overflow-y-auto p-[var(--spacing-5)]">{children}</div>
      </RxDialog.Content>
    </RxDialog.Portal>
  );
}

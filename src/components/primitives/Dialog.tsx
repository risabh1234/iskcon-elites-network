'use client';

import { Dialog as RxDialog } from 'radix-ui';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

export const Dialog = RxDialog.Root;
export const DialogTrigger = RxDialog.Trigger;
export const DialogClose = RxDialog.Close;

export function DialogOverlay({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof RxDialog.Overlay>) {
  return (
    <RxDialog.Overlay
      className={cn(
        'fixed inset-0 z-[var(--z-overlay)] bg-ink/20',
        'data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out',
        className,
      )}
      {...props}
    />
  );
}

export interface DialogContentProps
  // `title` is shadowed deliberately: the native attribute is a tooltip string,
  // whereas a dialog's title is its accessible name and may be rich content.
  extends Omit<React.ComponentPropsWithoutRef<typeof RxDialog.Content>, 'title'> {
  /** Required. Radix warns without one, and a dialog with no name is unusable
      to a screen reader. Pass `titleHidden` if it should not be seen. */
  title: React.ReactNode;
  description?: React.ReactNode;
  titleHidden?: boolean;
  showClose?: boolean;
}

export function DialogContent({
  className,
  children,
  title,
  description,
  titleHidden = false,
  showClose = true,
  ...props
}: DialogContentProps) {
  return (
    <RxDialog.Portal>
      <DialogOverlay />
      <RxDialog.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-[var(--z-overlay)] w-[calc(100%-var(--spacing-6))] max-w-[32rem]',
          '-translate-x-1/2 -translate-y-1/2',
          'max-h-[calc(100dvh-var(--spacing-8))] overflow-y-auto',
          'rounded-md border border-line bg-paper-raised p-[var(--spacing-6)] shadow-overlay',
          // Scales from the centre rather than sliding: the reader's attention
          // is already there, so the motion only has to say "this is new".
          'data-[state=open]:animate-scale-in data-[state=closed]:animate-scale-out',
          className,
        )}
        {...props}
      >
        <div className={cn('flex flex-col gap-[var(--spacing-1)]', titleHidden && 'sr-only')}>
          <RxDialog.Title className="text-xl">{title}</RxDialog.Title>
          {description ? (
            <RxDialog.Description className="text-sm text-ink-muted">
              {description}
            </RxDialog.Description>
          ) : null}
        </div>

        <div className={cn(!titleHidden && 'mt-[var(--spacing-5)]')}>{children}</div>

        {showClose ? (
          <RxDialog.Close
            className={cn(
              'absolute right-[var(--spacing-4)] top-[var(--spacing-4)]',
              'grid size-[var(--spacing-6)] place-items-center rounded-sm text-ink-subtle',
              'transition-colors duration-[var(--dur-instant)] ease-standard',
              'hover:bg-paper-sunken hover:text-ink',
            )}
          >
            <X className="size-[var(--spacing-4)]" />
            <span className="sr-only">Close</span>
          </RxDialog.Close>
        ) : null}
      </RxDialog.Content>
    </RxDialog.Portal>
  );
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'mt-[var(--spacing-6)] flex flex-wrap items-center justify-end gap-[var(--spacing-3)]',
        className,
      )}
      {...props}
    />
  );
}

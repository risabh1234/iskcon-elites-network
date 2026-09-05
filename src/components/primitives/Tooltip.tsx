'use client';

import { Tooltip as RxTooltip } from 'radix-ui';
import { cn } from '@/lib/cn';

export const TooltipProvider = RxTooltip.Provider;

export interface TooltipProps {
  /** The tooltip text. Never put essential information here — a tooltip is
      invisible to touch users and to anyone who does not hover. */
  content: React.ReactNode;
  children: React.ReactNode;
  side?: React.ComponentPropsWithoutRef<typeof RxTooltip.Content>['side'];
  delayDuration?: number;
}

export function Tooltip({ content, children, side = 'top', delayDuration = 200 }: TooltipProps) {
  return (
    <RxTooltip.Root delayDuration={delayDuration}>
      <RxTooltip.Trigger asChild>{children}</RxTooltip.Trigger>
      <RxTooltip.Portal>
        <RxTooltip.Content
          side={side}
          sideOffset={6}
          className={cn(
            'z-[var(--z-overlay)] max-w-[16rem]',
            'rounded-xs border border-line bg-ink px-[var(--spacing-2)] py-[var(--spacing-1)]',
            'text-xs text-paper shadow-overlay',
            'data-[state=delayed-open]:animate-fade-in data-[state=closed]:animate-fade-out',
          )}
        >
          {content}
          <RxTooltip.Arrow className="fill-ink" />
        </RxTooltip.Content>
      </RxTooltip.Portal>
    </RxTooltip.Root>
  );
}

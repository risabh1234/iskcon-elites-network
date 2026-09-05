'use client';

import { RadioGroup as RxRadioGroup } from 'radix-ui';
import { cn } from '@/lib/cn';

export type RadioGroupProps = React.ComponentPropsWithoutRef<typeof RxRadioGroup.Root>;

export function RadioGroup({ className, ...props }: RadioGroupProps) {
  return (
    <RxRadioGroup.Root
      className={cn('flex flex-col gap-[var(--spacing-3)]', className)}
      {...props}
    />
  );
}

export interface RadioProps
  extends React.ComponentPropsWithoutRef<typeof RxRadioGroup.Item> {
  label?: React.ReactNode;
  hint?: React.ReactNode;
}

export function Radio({ className, label, hint, id, ...props }: RadioProps) {
  const dot = (
    <RxRadioGroup.Item
      id={id}
      className={cn(
        'peer grid size-[var(--spacing-4)] shrink-0 place-items-center',
        'rounded-full border border-line-strong bg-paper-raised',
        'transition-colors duration-[var(--dur-instant)] ease-standard',
        'hover:border-ink-faint',
        'data-[state=checked]:border-accent',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <RxRadioGroup.Indicator className="size-[var(--spacing-2)] rounded-full bg-accent" />
    </RxRadioGroup.Item>
  );

  if (!label) return dot;

  return (
    <div className="flex items-start gap-[var(--spacing-2)]">
      {dot}
      <div className="flex flex-col gap-[var(--spacing-1)]">
        <label
          htmlFor={id}
          className="text-sm text-ink peer-disabled:text-ink-faint cursor-pointer"
        >
          {label}
        </label>
        {hint ? <span className="text-xs text-ink-subtle">{hint}</span> : null}
      </div>
    </div>
  );
}

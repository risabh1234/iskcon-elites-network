'use client';

import { Checkbox as RxCheckbox } from 'radix-ui';
import { Check, Minus } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface CheckboxProps
  extends React.ComponentPropsWithoutRef<typeof RxCheckbox.Root> {
  label?: React.ReactNode;
  hint?: React.ReactNode;
}

export function Checkbox({ className, label, hint, id, ...props }: CheckboxProps) {
  const box = (
    <RxCheckbox.Root
      id={id}
      className={cn(
        'peer grid size-[var(--spacing-4)] shrink-0 place-items-center',
        'rounded-xs border border-line-strong bg-paper-raised',
        'transition-colors duration-[var(--dur-instant)] ease-standard',
        'hover:border-ink-faint',
        'data-[state=checked]:border-accent data-[state=checked]:bg-accent',
        'data-[state=indeterminate]:border-accent data-[state=indeterminate]:bg-accent',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <RxCheckbox.Indicator className="text-accent-ink">
        {props.checked === 'indeterminate' ? (
          <Minus className="size-[var(--spacing-3)]" strokeWidth={3} />
        ) : (
          <Check className="size-[var(--spacing-3)]" strokeWidth={3} />
        )}
      </RxCheckbox.Indicator>
    </RxCheckbox.Root>
  );

  if (!label) return box;

  return (
    <div className="flex items-start gap-[var(--spacing-2)]">
      {box}
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

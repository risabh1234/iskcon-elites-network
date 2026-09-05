'use client';

import { Switch as RxSwitch } from 'radix-ui';
import { cn } from '@/lib/cn';

export interface SwitchProps extends React.ComponentPropsWithoutRef<typeof RxSwitch.Root> {
  label?: React.ReactNode;
}

export function Switch({ className, label, id, ...props }: SwitchProps) {
  const control = (
    <RxSwitch.Root
      id={id}
      className={cn(
        'relative inline-flex shrink-0 items-center',
        'h-[var(--switch-h)] w-[var(--switch-w)] p-[var(--switch-pad)]',
        'rounded-full border border-line-strong bg-paper-sunken',
        'transition-colors duration-[var(--dur-fast)] ease-standard',
        'data-[state=checked]:border-accent data-[state=checked]:bg-accent',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <RxSwitch.Thumb
        className={cn(
          'block size-[var(--switch-thumb)] rounded-full bg-paper-raised shadow-raised',
          'transition-transform duration-[var(--dur-fast)] ease-emphasised',
          'data-[state=checked]:translate-x-[var(--switch-travel)]',
        )}
      />
    </RxSwitch.Root>
  );

  if (!label) return control;

  return (
    <div className="flex items-center gap-[var(--spacing-3)]">
      {control}
      <label htmlFor={id} className="text-sm text-ink cursor-pointer">
        {label}
      </label>
    </div>
  );
}

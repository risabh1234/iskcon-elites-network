'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';
import { useFieldControl } from './Field';

export const control = cva(
  [
    'w-full bg-paper-raised text-ink',
    'border border-line-strong rounded-sm',
    'placeholder:text-ink-subtle',
    'transition-[border-color,background-color] duration-[var(--dur-instant)] ease-standard',
    'hover:border-ink-faint',
    'disabled:cursor-not-allowed disabled:bg-paper-sunken disabled:text-ink-faint',
    'aria-[invalid=true]:border-danger',
  ],
  {
    variants: {
      size: {
        sm: 'h-[var(--spacing-6)] px-[var(--spacing-2)] text-xs',
        md: 'h-[var(--spacing-7)] px-[var(--spacing-3)] text-sm',
        lg: 'h-[var(--spacing-8)] px-[var(--spacing-4)] text-base',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof control> {}

export function Input({ className, size, ...props }: InputProps) {
  const field = useFieldControl();
  return <input className={cn(control({ size }), className)} {...field} {...props} />;
}

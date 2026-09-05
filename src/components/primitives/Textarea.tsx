'use client';

import { cn } from '@/lib/cn';
import { useFieldControl } from './Field';

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className, rows = 4, ...props }: TextareaProps) {
  const field = useFieldControl();
  return (
    <textarea
      rows={rows}
      className={cn(
        'w-full resize-y bg-paper-raised text-ink',
        'border border-line-strong rounded-sm',
        'px-[var(--spacing-3)] py-[var(--spacing-2)] text-sm leading-body',
        'placeholder:text-ink-subtle',
        'transition-[border-color] duration-[var(--dur-instant)] ease-standard',
        'hover:border-ink-faint',
        'disabled:cursor-not-allowed disabled:bg-paper-sunken disabled:text-ink-faint',
        'aria-[invalid=true]:border-danger',
        className,
      )}
      {...field}
      {...props}
    />
  );
}

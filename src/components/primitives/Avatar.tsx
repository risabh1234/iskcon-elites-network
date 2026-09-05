'use client';

import { Avatar as RxAvatar } from 'radix-ui';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const avatar = cva('relative flex shrink-0 overflow-hidden bg-paper-sunken', {
  variants: {
    size: {
      xs: 'size-[var(--spacing-5)] text-2xs',
      sm: 'size-[var(--spacing-6)] text-xs',
      md: 'size-[var(--spacing-8)] text-sm',
      lg: 'size-[var(--spacing-9)] text-lg',
      xl: 'size-[var(--spacing-11)] text-2xl',
    },
    shape: {
      circle: 'rounded-full',
      /* Portraits in the directory are 4:5. A square crop of a 4:5 portrait
         beheads people, so the rounded variant keeps the frame. */
      square: 'rounded-sm',
    },
  },
  defaultVariants: { size: 'md', shape: 'circle' },
});

export interface AvatarProps
  extends React.ComponentPropsWithoutRef<typeof RxAvatar.Root>,
    VariantProps<typeof avatar> {
  src?: string | null;
  name: string;
}

/** Initials from the first and last word — never a generated face. */
function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function Avatar({ className, size, shape, src, name, ...props }: AvatarProps) {
  return (
    <RxAvatar.Root className={cn(avatar({ size, shape }), className)} {...props}>
      {src ? (
        <RxAvatar.Image
          src={src}
          alt={name}
          className="size-full object-cover"
        />
      ) : null}
      <RxAvatar.Fallback
        delayMs={src ? 300 : 0}
        className="flex size-full items-center justify-center font-display text-ink-subtle"
      >
        {initials(name)}
      </RxAvatar.Fallback>
    </RxAvatar.Root>
  );
}

import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

/**
 * Status, not decoration. Tones are tinted backgrounds with ink text rather
 * than saturated fills — a wall of solid colour chips is the fastest way to
 * make a dense table look cheap.
 */
const badge = cva(
  [
    'inline-flex items-center gap-[var(--spacing-1)] whitespace-nowrap',
    'rounded-full border px-[var(--spacing-2)] py-[var(--spacing-1)]',
    'text-2xs font-medium uppercase tracking-wide',
  ],
  {
    variants: {
      tone: {
        neutral: 'border-line bg-paper-sunken text-ink-muted',
        accent: 'border-accent-quiet bg-accent-quiet text-accent',
        success: 'border-transparent bg-paper-sunken text-success',
        warning: 'border-transparent bg-paper-sunken text-warning',
        danger: 'border-transparent bg-danger-quiet text-danger',
        outline: 'border-line-strong bg-transparent text-ink-muted',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badge> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badge({ tone }), className)} {...props} />;
}

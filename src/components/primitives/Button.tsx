'use client';

import { Slot } from 'radix-ui';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

/**
 * The accent is scarce by design: `primary` is the one control per viewport that
 * may carry it. If a screen needs two primary buttons, the screen is asking the
 * reader to make two decisions at once and the screen is wrong.
 */
const button = cva(
  [
    'inline-flex shrink-0 items-center justify-center gap-[var(--spacing-2)]',
    'font-medium whitespace-nowrap no-underline',
    'transition-[background-color,border-color,color,opacity]',
    'duration-[var(--dur-instant)] ease-standard',
    'disabled:pointer-events-none disabled:opacity-50',
    // Icons inside buttons should never be tab stops or pointer targets.
    '[&_svg]:pointer-events-none [&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        primary: 'bg-accent text-accent-ink hover:bg-accent-hover active:bg-accent-hover',
        secondary:
          'border border-line-strong bg-paper-raised text-ink hover:bg-paper-sunken active:bg-paper-sunken',
        ghost: 'text-ink-muted hover:bg-paper-sunken hover:text-ink active:bg-paper-sunken',
        danger: 'bg-danger text-accent-ink hover:opacity-90 active:opacity-90',
        link: 'text-ink underline underline-offset-2 decoration-line-strong hover:decoration-current',
      },
      size: {
        sm: 'h-[var(--spacing-6)] rounded-xs px-[var(--spacing-3)] text-xs',
        md: 'h-[var(--spacing-7)] rounded-sm px-[var(--spacing-4)] text-sm',
        lg: 'h-[var(--spacing-8)] rounded-sm px-[var(--spacing-5)] text-base',
      },
      block: { true: 'w-full', false: '' },
    },
    compoundVariants: [
      // A link-styled button has no box, so box padding would misalign it.
      { variant: 'link', size: 'sm', class: 'h-auto px-0' },
      { variant: 'link', size: 'md', class: 'h-auto px-0' },
      { variant: 'link', size: 'lg', class: 'h-auto px-0' },
    ],
    defaultVariants: { variant: 'secondary', size: 'md', block: false },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {
  /** Render as the child element (a Link, say) while keeping button styling. */
  asChild?: boolean;
  /** Shows a spinner, disables the control, and announces busy state. */
  loading?: boolean;
}

export function Button({
  className,
  variant,
  size,
  block,
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button';

  // Slot needs to know which child is the element to merge onto. Without
  // Slottable the spinner counts as a second child and Slot throws — which
  // surfaces as a prerender failure, not a dev-time warning.
  const content = (
    <>
      {loading ? <Spinner /> : null}
      <Slot.Slottable>{children}</Slot.Slottable>
    </>
  );

  return (
    <Comp
      className={cn(button({ variant, size, block }), className)}
      disabled={asChild ? undefined : disabled || loading}
      aria-disabled={asChild && (disabled || loading) ? true : undefined}
      aria-busy={loading || undefined}
      {...props}
    >
      {asChild ? content : (
        <>
          {loading ? <Spinner /> : null}
          {children}
        </>
      )}
    </Comp>
  );
}

function Spinner() {
  return (
    <svg
      className="size-[1em] animate-spin motion-reduce:animate-none"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" opacity="0.25" />
      <path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export { button as buttonVariants };

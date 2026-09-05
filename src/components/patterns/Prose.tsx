import { cn } from '@/lib/cn';

/**
 * Long-form text. Measure is capped at 66ch because past that the eye loses the
 * start of the next line — the single most common reason a text page feels
 * tiring without looking wrong.
 */
export function Prose({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'max-w-[var(--measure-prose)] leading-prose text-ink-muted',
        '[&_h2]:mt-[var(--spacing-8)] [&_h2]:mb-[var(--spacing-4)] [&_h2]:text-2xl',
        '[&_h3]:mt-[var(--spacing-7)] [&_h3]:mb-[var(--spacing-3)] [&_h3]:text-xl',
        '[&_p]:mb-[var(--spacing-5)]',
        '[&_ul]:mb-[var(--spacing-5)] [&_ol]:mb-[var(--spacing-5)]',
        '[&_li]:mb-[var(--spacing-2)]',
        '[&_a]:text-ink [&_a]:underline [&_a]:decoration-line-strong hover:[&_a]:decoration-current',
        '[&_blockquote]:my-[var(--spacing-7)] [&_blockquote]:border-l-2 [&_blockquote]:border-accent',
        '[&_blockquote]:pl-[var(--spacing-5)] [&_blockquote]:font-display [&_blockquote]:text-xl',
        '[&_blockquote]:text-ink [&_blockquote]:not-italic',
        '[&_figcaption]:mt-[var(--spacing-2)] [&_figcaption]:text-xs [&_figcaption]:text-ink-subtle',
        '[&>*:last-child]:mb-0',
        className,
      )}
      {...props}
    />
  );
}

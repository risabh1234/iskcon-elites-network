import { cn } from '@/lib/cn';

export interface PageHeaderProps
  extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  title: React.ReactNode;
  /** Small caps label above the title. Use sparingly — it is a locator, not a tagline. */
  eyebrow?: React.ReactNode;
  /** One sentence. If it needs two, the page is doing too much. */
  lede?: React.ReactNode;
  actions?: React.ReactNode;
}

export function PageHeader({
  className,
  title,
  eyebrow,
  lede,
  actions,
  ...props
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        'flex flex-wrap items-end justify-between gap-[var(--spacing-5)]',
        'border-b border-line pb-[var(--spacing-5)]',
        className,
      )}
      {...props}
    >
      <div className="max-w-[var(--measure-lede)]">
        {eyebrow ? (
          <p className="text-2xs uppercase tracking-wide text-ink-subtle">{eyebrow}</p>
        ) : null}
        <h1 className={cn('text-3xl', eyebrow && 'mt-[var(--spacing-2)]')}>{title}</h1>
        {lede ? <p className="mt-[var(--spacing-3)] text-ink-muted">{lede}</p> : null}
      </div>

      {actions ? <div className="flex items-center gap-[var(--spacing-3)]">{actions}</div> : null}
    </header>
  );
}

import { cn } from '@/lib/cn';

/**
 * The one place page width is decided. Every page uses this rather than
 * re-picking a max-width, which is how the old codebase ended up with
 * max-w-4xl, max-w-6xl and container mx-auto on three sibling pages.
 */
export function Container({
  className,
  width = 'default',
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { width?: 'default' | 'narrow' | 'wide' }) {
  return (
    <div
      className={cn(
        'mx-auto w-full px-[var(--container-pad)]',
        width === 'default' && 'max-w-[var(--container-max)]',
        width === 'narrow' && 'max-w-[52rem]',
        width === 'wide' && 'max-w-[96rem]',
        className,
      )}
      {...props}
    />
  );
}

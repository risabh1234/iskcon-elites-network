import { cn } from '@/lib/cn';
import { Container } from './Container';

/**
 * Vertical rhythm. Section padding comes from one of two tokens, never from a
 * per-section guess — irregular spacing is read as amateurism even by people
 * who cannot name what is wrong.
 */
export function Section({
  className,
  size = 'default',
  bleed = false,
  children,
  ...props
}: React.HTMLAttributes<HTMLElement> & {
  size?: 'default' | 'large';
  /** Skip the Container — for full-bleed content that manages its own width. */
  bleed?: boolean;
}) {
  return (
    <section
      className={cn(
        size === 'default' ? 'py-[var(--section-y)]' : 'py-[var(--section-y-large)]',
        className,
      )}
      {...props}
    >
      {bleed ? children : <Container>{children}</Container>}
    </section>
  );
}

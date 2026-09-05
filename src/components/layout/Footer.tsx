import Link from 'next/link';
import { Container } from '@/components/patterns';

/**
 * Hairlines and two columns of real links.
 *
 * The footer this replaces was a navy slab with a newsletter box wired to
 * nothing, a social row whose links all pointed at `#`, and a "Knowledge
 * Centre" that does not exist. Links to pages that were never built are worse
 * than no links: they teach people the site is careless.
 */
const NAVIGATE = [
  { href: '/directory', label: 'Directory' },
  { href: '/events', label: 'Gatherings' },
  { href: '/mentorship', label: 'Mentorship' },
] as const;

const READ = [
  { href: '/success-stories', label: 'Stories' },
  { href: '/about', label: 'About the register' },
] as const;

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-line bg-paper-sunken">
      <Container className="py-[var(--spacing-8)]">
        <div className="grid grid-cols-1 gap-[var(--spacing-7)] sm:grid-cols-3">
          <div>
            <p className="font-display text-lg text-ink">
              ISKCON <span className="text-accent">Elites</span>
            </p>
            <p className="mt-[var(--spacing-3)] max-w-[32ch] text-sm text-ink-muted">
              A register of people who practise a tradition and a profession without asking either
              to make room for the other.
            </p>
          </div>

          <FooterColumn heading="The network" links={NAVIGATE} />
          <FooterColumn heading="Read" links={READ} />
        </div>

        <div className="mt-[var(--spacing-8)] flex flex-wrap items-center justify-between gap-[var(--spacing-3)] border-t border-line pt-[var(--spacing-5)]">
          <p className="text-xs text-ink-subtle">
            © {new Date().getFullYear()} ISKCON Elites Network
          </p>
          <p className="text-xs text-ink-subtle">
            Contact details in the register are for members, not for collection.
          </p>
        </div>
      </Container>
    </footer>
  );
}

function FooterColumn({
  heading,
  links,
}: {
  heading: string;
  links: readonly { href: string; label: string }[];
}) {
  return (
    <nav aria-label={heading}>
      <h2 className="text-2xs uppercase tracking-wide text-ink-subtle">{heading}</h2>
      <ul className="mt-[var(--spacing-4)] flex list-none flex-col gap-[var(--spacing-2)] p-0">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-sm text-ink-muted no-underline transition-colors duration-[var(--dur-instant)] ease-standard hover:text-ink"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

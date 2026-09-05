'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { Button, Sheet, SheetClose, SheetContent, SheetTrigger } from '@/components/primitives';
import { Container } from '@/components/patterns';
import { UserMenu } from '@/components/auth/UserMenu';
import { cn } from '@/lib/cn';

export type HeaderUser = { name: string | null; email: string };

const NAV = [
  { href: '/directory', label: 'Directory' },
  { href: '/events', label: 'Gatherings' },
  { href: '/mentorship', label: 'Mentorship' },
  { href: '/success-stories', label: 'Stories' },
  { href: '/about', label: 'About' },
] as const;

/**
 * A hairline, a wordmark and five links.
 *
 * The header this replaces was a fixed dark navy bar with a gold logo tile, a
 * blur-on-scroll effect and white text — designed for a dark site that no
 * longer exists. On the light pages it measured 1.05:1, which is invisible
 * rather than merely low-contrast.
 *
 * Not fixed-position: a sticky bar costs vertical space on every phone screen
 * and buys nothing on pages people scroll through once.
 */
export default function Header({ user }: { user: HeaderUser | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <header className="border-b border-line bg-paper">
      <Container className="flex h-[var(--spacing-9)] items-center justify-between gap-[var(--spacing-5)]">
        <Link
          href="/"
          className="font-display text-lg text-ink no-underline whitespace-nowrap"
        >
          ISKCON <span className="text-accent">Elites</span>
        </Link>

        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex list-none items-center gap-[var(--spacing-6)] p-0">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? 'page' : undefined}
                  className={cn(
                    'text-sm no-underline transition-colors duration-[var(--dur-instant)] ease-standard',
                    isActive(item.href) ? 'text-ink' : 'text-ink-muted hover:text-ink',
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-[var(--spacing-3)]">
          {user ? (
            <UserMenu name={user.name} email={user.email} />
          ) : (
            <div className="hidden items-center gap-[var(--spacing-2)] sm:flex">
              <Button asChild size="sm">
                <Link href="/sign-in">Sign in</Link>
              </Button>
              <Button asChild size="sm" variant="primary">
                <Link href="/sign-up">Join</Link>
              </Button>
            </div>
          )}

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button size="sm" variant="ghost" className="lg:hidden" aria-label="Open menu">
                <Menu className="size-[var(--spacing-4)]" />
              </Button>
            </SheetTrigger>

            <SheetContent side="right" title="Menu" titleHidden>
              <nav aria-label="Main">
                <ul className="flex list-none flex-col gap-[var(--spacing-1)] p-0">
                  {NAV.map((item) => (
                    <li key={item.href}>
                      <SheetClose asChild>
                        <Link
                          href={item.href}
                          aria-current={isActive(item.href) ? 'page' : undefined}
                          className={cn(
                            'block rounded-sm px-[var(--spacing-3)] py-[var(--spacing-3)] text-base no-underline',
                            'transition-colors duration-[var(--dur-instant)] ease-standard hover:bg-paper-sunken',
                            isActive(item.href) ? 'text-ink' : 'text-ink-muted',
                          )}
                        >
                          {item.label}
                        </Link>
                      </SheetClose>
                    </li>
                  ))}
                </ul>
              </nav>

              {!user ? (
                <div className="mt-[var(--spacing-6)] flex flex-col gap-[var(--spacing-3)] border-t border-line pt-[var(--spacing-5)]">
                  <SheetClose asChild>
                    <Button asChild block><Link href="/sign-in">Sign in</Link></Button>
                  </SheetClose>
                  <SheetClose asChild>
                    <Button asChild block variant="primary"><Link href="/sign-up">Join the network</Link></Button>
                  </SheetClose>
                </div>
              ) : null}
            </SheetContent>
          </Sheet>
        </div>
      </Container>
    </header>
  );
}

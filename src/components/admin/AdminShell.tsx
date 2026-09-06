'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  CalendarDays, FileText, Image as ImageIcon, Landmark, ScrollText, Users, UserSquare,
} from 'lucide-react';
import { Command, ToastProvider, useCommandShortcut } from '@/components/primitives';
import { Container } from '@/components/patterns';
import { cn } from '@/lib/cn';

export const SECTIONS = [
  { href: '/admin/members', label: 'Members', icon: UserSquare },
  { href: '/admin/events', label: 'Events', icon: CalendarDays },
  { href: '/admin/stories', label: 'Stories', icon: FileText },
  { href: '/admin/leadership', label: 'Leadership', icon: Landmark },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/media', label: 'Media', icon: ImageIcon },
  { href: '/admin/audit', label: 'Audit', icon: ScrollText },
] as const;

/** Sidebar, breadcrumb and the ⌘K palette, on every console page. */
export function AdminShell({ name, children }: { name: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [paletteOpen, setPaletteOpen] = useState(false);

  useCommandShortcut(useCallback(() => setPaletteOpen(true), []));

  const current = SECTIONS.find((s) => pathname.startsWith(s.href));

  return (
    <ToastProvider>
      <Container width="wide" className="py-[var(--spacing-7)]">
        <div className="grid gap-[var(--spacing-7)] lg:grid-cols-[13rem_1fr]">
          <aside>
            <p className="text-2xs uppercase tracking-wide text-ink-subtle">Console</p>
            <nav aria-label="Console sections" className="mt-[var(--spacing-4)]">
              <ul className="flex list-none flex-col gap-[var(--spacing-1)] p-0">
                {SECTIONS.map((section) => {
                  const active = pathname.startsWith(section.href);
                  const Icon = section.icon;
                  return (
                    <li key={section.href}>
                      <Link
                        href={section.href}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'flex items-center gap-[var(--spacing-3)] rounded-sm no-underline',
                          'px-[var(--spacing-3)] py-[var(--spacing-2)] text-sm',
                          'transition-colors duration-[var(--dur-instant)] ease-standard',
                          active ? 'bg-paper-sunken text-ink' : 'text-ink-muted hover:text-ink',
                        )}
                      >
                        <Icon className="size-[var(--spacing-4)] shrink-0" aria-hidden />
                        {section.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <p className="mt-[var(--spacing-6)] border-t border-line pt-[var(--spacing-4)] text-xs text-ink-subtle">
              Signed in as {name}
              <br />
              <kbd className="text-2xs">⌘K</kbd> to jump
            </p>
          </aside>

          <div className="min-w-0">
            <nav aria-label="Breadcrumb">
              <ol className="flex list-none items-center gap-[var(--spacing-2)] p-0 text-xs text-ink-subtle">
                <li><Link href="/admin/members" className="no-underline hover:underline">Console</Link></li>
                {current ? (
                  <>
                    <li aria-hidden>/</li>
                    <li aria-current="page" className="text-ink">{current.label}</li>
                  </>
                ) : null}
              </ol>
            </nav>

            <div className="mt-[var(--spacing-5)]">{children}</div>
          </div>
        </div>
      </Container>

      <Command
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        placeholder="Jump to a section…"
        items={SECTIONS.map((section) => ({
          id: section.href,
          label: section.label,
          group: 'Console',
          onSelect: () => router.push(section.href),
        }))}
      />
    </ToastProvider>
  );
}

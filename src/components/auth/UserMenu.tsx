'use client';

import Link from 'next/link';
import { LogOut, User } from 'lucide-react';
import { Avatar, Popover, PopoverContent, PopoverTrigger, Button } from '@/components/primitives';
import { signOutAction } from '@/actions/auth';

export type UserMenuProps = {
  name: string | null;
  email: string;
  compact?: boolean;
};

/** Identity, then the one action an account menu needs to offer. */
export function UserMenu({ name, email, compact = false }: UserMenuProps) {
  const label = name ?? email;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="rounded-full"
          aria-label={`Account menu for ${label}`}
        >
          <Avatar name={label} size={compact ? 'sm' : 'md'} />
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[16rem]">
        <div className="flex items-center gap-[var(--spacing-3)]">
          <Avatar name={label} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">{label}</p>
            <p className="truncate text-xs text-ink-subtle">{email}</p>
          </div>
        </div>

        <div className="mt-[var(--spacing-4)] flex flex-col gap-[var(--spacing-2)] border-t border-line pt-[var(--spacing-4)]">
          <Button asChild variant="ghost" size="sm" className="justify-start">
            <Link href="/directory">
              <User className="size-[var(--spacing-3)]" />
              The directory
            </Link>
          </Button>

          {/* A form, not a link: signing out is a mutation and must not be
              reachable by a prefetch or a crawler following a GET. */}
          <form action={signOutAction}>
            <Button type="submit" variant="ghost" size="sm" block className="justify-start">
              <LogOut className="size-[var(--spacing-3)]" />
              Sign out
            </Button>
          </form>
        </div>
      </PopoverContent>
    </Popover>
  );
}

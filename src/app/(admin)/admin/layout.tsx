import type { Metadata } from 'next';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/primitives';
import { Container } from '@/components/patterns';
import Link from 'next/link';
import { getActor } from '@/server/auth';
import { can } from '@/server/policy';
import { AdminShell } from '@/components/admin/AdminShell';

export const metadata: Metadata = {
  title: { template: '%s · Console', default: 'Console' },
  robots: { index: false, follow: false },
};

/**
 * The console's gate.
 *
 * The proxy redirects a request with no session cookie, but that is a
 * convenience, not a control — it cannot tell a forged cookie from a real one
 * without a database round trip on every request. This is the check that
 * matters: a resolved Actor, and `can()`.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const actor = await getActor();

  if (!can(actor, 'admin:access')) {
    return <Denied signedIn={actor.kind === 'user'} />;
  }

  return (
    <AdminShell name={actor.kind === 'user' ? (actor.name ?? actor.email) : ''}>
      {children}
    </AdminShell>
  );
}

function Denied({ signedIn }: { signedIn: boolean }) {
  return (
    <Container className="flex flex-1 flex-col justify-center py-[var(--section-y)]">
      <div className="max-w-[var(--measure-lede)]">
        <ShieldAlert className="size-[var(--spacing-6)] text-danger" aria-hidden />
        <h1 className="mt-[var(--spacing-4)] text-3xl">
          {signedIn ? 'You don’t have access to the console' : 'Sign in to continue'}
        </h1>
        <p className="mt-[var(--spacing-4)] text-ink-muted">
          {signedIn
            ? 'The console is limited to reviewers. If you believe that is wrong, ask an administrator to check your role.'
            : 'The console is limited to reviewers of the register.'}
        </p>
        <div className="mt-[var(--spacing-6)] flex flex-wrap gap-[var(--spacing-3)]">
          {signedIn ? null : (
            <Button asChild variant="primary">
              <Link href="/sign-in?redirectTo=/admin">Sign in</Link>
            </Button>
          )}
          <Button asChild>
            <Link href="/">Return home</Link>
          </Button>
        </div>
      </div>
    </Container>
  );
}

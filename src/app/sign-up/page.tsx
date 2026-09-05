import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthForm } from '@/components/auth/AuthForm';
import { GoogleButton } from '@/components/auth/GoogleButton';
import { signUpAction } from '@/actions/auth';
import { getActor } from '@/server/auth';
import { isGoogleConfigured } from '@/server/auth/google';
import { Section } from '@/components/patterns';

export const metadata: Metadata = {
  title: 'Create an account',
  robots: { index: false, follow: false },
};

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirectTo?: string }>;
}) {
  const actor = await getActor();
  if (actor.kind === 'user') redirect('/directory');

  const params = await searchParams;

  return (
    <Section className="flex flex-1 items-center">
      <div className="mx-auto w-full max-w-[26rem]">
        <h1 className="text-3xl">Create an account</h1>
        <p className="mt-[var(--spacing-3)] text-ink-muted">
          Join the register and reach the rest of the network.
        </p>

        <div className="mt-[var(--spacing-7)]">
          <AuthForm
            mode="sign-up"
            action={signUpAction}
            redirectTo={params.redirectTo}
            initialError={params.error}
          />
        </div>

        {isGoogleConfigured() ? (
          <>
            <div className="my-[var(--spacing-6)] flex items-center gap-[var(--spacing-4)]">
              <span className="h-px flex-1 bg-line" />
              <span className="text-xs text-ink-subtle">or</span>
              <span className="h-px flex-1 bg-line" />
            </div>
            <GoogleButton label="Continue with Google" />
          </>
        ) : null}

        <p className="mt-[var(--spacing-7)] border-t border-line pt-[var(--spacing-5)] text-sm text-ink-muted">
          Already have an account?{' '}
          <Link href="/sign-in" className="text-ink">
            Sign in
          </Link>
        </p>
      </div>
    </Section>
  );
}

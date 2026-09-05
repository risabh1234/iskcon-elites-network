'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button, Field, Input } from '@/components/primitives';
import type { AuthFormState } from '@/actions/auth';

function Submit({ label }: { label: string }) {
  // useFormStatus reads the pending state of the enclosing form, so the button
  // does not need the action's state threaded into it.
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" block loading={pending}>
      {label}
    </Button>
  );
}

export type AuthFormProps = {
  mode: 'sign-in' | 'sign-up';
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  redirectTo?: string;
  initialError?: string;
};

export function AuthForm({ mode, action, redirectTo, initialError }: AuthFormProps) {
  const [state, formAction] = useActionState<AuthFormState, FormData>(action, {
    error: initialError,
  });

  const isSignUp = mode === 'sign-up';
  const field = (name: string) => state.fields?.[name]?.[0];

  return (
    <form action={formAction} className="flex flex-col gap-[var(--spacing-5)]">
      <input type="hidden" name="redirectTo" value={redirectTo ?? '/directory'} />

      {/* Announced when it appears, so a failure is not silent to a screen reader. */}
      {state.error ? (
        <p
          role="alert"
          className="rounded-sm border border-danger/30 bg-danger-quiet px-[var(--spacing-4)] py-[var(--spacing-3)] text-sm text-danger"
        >
          {state.error}
        </p>
      ) : null}

      {isSignUp ? (
        <Field label="Full name" error={field('name')} required>
          <Input name="name" autoComplete="name" required placeholder="Śrīvāsa Ṭhākura" />
        </Field>
      ) : null}

      <Field label="Email" error={field('email')} required>
        <Input
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
      </Field>

      <Field
        label="Password"
        error={field('password')}
        hint={isSignUp ? 'At least 10 characters. Length matters more than symbols.' : undefined}
        required
      >
        <Input
          name="password"
          type="password"
          autoComplete={isSignUp ? 'new-password' : 'current-password'}
          required
        />
      </Field>

      <Submit label={isSignUp ? 'Create account' : 'Sign in'} />
    </form>
  );
}

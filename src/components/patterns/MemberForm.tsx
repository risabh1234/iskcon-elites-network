'use client';

import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import {
  Button, Field, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea,
} from '@/components/primitives';
import type { MemberFormState } from '@/actions/member';

/**
 * One form for creating and editing a directory entry.
 *
 * It replaces the AddEntryModal/EditEntryModal pair, which were byte-identical
 * apart from five lines — and had drifted, since a fix to the error handling
 * had been applied to only one of the two copies.
 */
export type MemberFormValues = {
  id?: string;
  kind?: 'ALUMNUS' | 'SPEAKER' | 'GUEST';
  legalName?: string;
  initiatedName?: string | null;
  headline?: string | null;
  bio?: string;
  city?: string | null;
  countryCode?: string | null;
  cohort?: string | null;
  email?: string | null;
  recommendation?: string | null;
};

export type MemberFormProps = {
  mode: 'create' | 'edit';
  action: (state: MemberFormState, formData: FormData) => Promise<MemberFormState>;
  defaultValues?: MemberFormValues;
  onSuccess?: () => void;
};

function Submit({ mode }: { mode: 'create' | 'edit' }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" loading={pending}>
      {mode === 'create' ? 'Submit entry' : 'Save changes'}
    </Button>
  );
}

export function MemberForm({ mode, action, defaultValues = {}, onSuccess }: MemberFormProps) {
  const [state, formAction] = useActionState<MemberFormState, FormData>(action, {});

  useEffect(() => {
    if (state.ok) onSuccess?.();
  }, [state.ok, onSuccess]);

  const error = (name: string) => state.fields?.[name]?.[0];

  return (
    <form action={formAction} className="flex flex-col gap-[var(--spacing-5)]">
      {defaultValues.id ? <input type="hidden" name="id" value={defaultValues.id} /> : null}

      {state.error ? (
        <p
          role="alert"
          className="rounded-sm border border-danger/30 bg-danger-quiet px-[var(--spacing-4)] py-[var(--spacing-3)] text-sm text-danger"
        >
          {state.error}
        </p>
      ) : null}

      <div className="grid gap-[var(--spacing-5)] md:grid-cols-2">
        <Field label="Full name" error={error('legalName')} required>
          <Input name="legalName" defaultValue={defaultValues.legalName} required placeholder="Śrīvāsa Ṭhākura" />
        </Field>

        <Field label="Initiated name" hint="If they are known by one." error={error('initiatedName')}>
          <Input name="initiatedName" defaultValue={defaultValues.initiatedName ?? ''} placeholder="Gaura Nitai Dāsa" />
        </Field>

        <Field label="In the register as" error={error('kind')}>
          <Select name="kind" defaultValue={defaultValues.kind ?? 'ALUMNUS'}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALUMNUS">Alumnus</SelectItem>
              <SelectItem value="SPEAKER">Speaker</SelectItem>
              <SelectItem value="GUEST">Featured guest</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field label="Cohort" hint="Alumni only." error={error('cohort')}>
          <Input name="cohort" defaultValue={defaultValues.cohort ?? ''} placeholder="2018" />
        </Field>

        <Field label="City" error={error('city')}>
          <Input name="city" defaultValue={defaultValues.city ?? ''} placeholder="Mumbai" />
        </Field>

        <Field label="Country" hint="Two-letter code, e.g. IN." error={error('countryCode')}>
          <Input name="countryCode" defaultValue={defaultValues.countryCode ?? ''} maxLength={2} placeholder="IN" />
        </Field>
      </div>

      <Field label="Headline" hint="One line: role and organisation. Not a biography." error={error('headline')}>
        <Input name="headline" defaultValue={defaultValues.headline ?? ''} placeholder="Consultant cardiologist, Kokilaben Hospital" />
      </Field>

      <Field label="Email" hint="Visible to signed-in members only." error={error('email')}>
        <Input name="email" type="email" defaultValue={defaultValues.email ?? ''} />
      </Field>

      <Field label="Biography" error={error('bio')} required>
        <Textarea name="bio" defaultValue={defaultValues.bio} rows={5} required />
      </Field>

      <Field label="In their words" hint="An optional short quote." error={error('recommendation')}>
        <Textarea name="recommendation" defaultValue={defaultValues.recommendation ?? ''} rows={3} />
      </Field>

      <div className="flex justify-end gap-[var(--spacing-3)]">
        <Submit mode={mode} />
      </div>
    </form>
  );
}

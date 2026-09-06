'use client';

import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import {
  Button, Field, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea,
} from '@/components/primitives';
import type { LeadershipFormState } from '@/actions/leadership';

export type LeadershipFormValues = {
  id?: string;
  honorific?: string | null;
  name?: string;
  initiatedName?: string | null;
  role?: string | null;
  headline?: string | null;
  bio?: string;
  focusAreas?: string[];
  initiatives?: string[];
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
};

export type LeadershipFormProps = {
  mode: 'create' | 'edit';
  action: (state: LeadershipFormState, formData: FormData) => Promise<LeadershipFormState>;
  defaultValues?: LeadershipFormValues;
  onSuccess?: () => void;
};

function Submit({ mode }: { mode: 'create' | 'edit' }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" loading={pending}>
      {mode === 'create' ? 'Create profile' : 'Save changes'}
    </Button>
  );
}

/**
 * Plain text areas, not a rich-text editor.
 *
 * A WYSIWYG field in an admin console is a sanitisation surface that has to be
 * maintained forever, and the thing being edited here is four paragraphs of
 * prose and two lists. Blank lines separate paragraphs; one item per line makes
 * a list. Both rules are stated on the field itself (ADR-0040).
 */
export function LeadershipForm({
  mode,
  action,
  defaultValues = {},
  onSuccess,
}: LeadershipFormProps) {
  const [state, formAction] = useActionState<LeadershipFormState, FormData>(action, {});

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
        <Field label="Honorific" hint="A form of address, not part of the name." error={error('honorific')}>
          <Input name="honorific" defaultValue={defaultValues.honorific ?? ''} placeholder="His Grace" />
        </Field>

        <Field label="Name" error={error('name')} required>
          <Input name="name" defaultValue={defaultValues.name} required placeholder="Tukaram Das" />
        </Field>

        <Field label="Initiated name" hint="Only if it differs from the name above." error={error('initiatedName')}>
          <Input name="initiatedName" defaultValue={defaultValues.initiatedName ?? ''} />
        </Field>

        <Field label="Office" error={error('role')}>
          <Input name="role" defaultValue={defaultValues.role ?? ''} placeholder="Vice President, ISKCON Bhubaneswar" />
        </Field>
      </div>

      <Field label="Headline" hint="One line, shown under the name." error={error('headline')}>
        <Input name="headline" defaultValue={defaultValues.headline ?? ''} />
      </Field>

      <Field label="Biography" hint="Leave a blank line between paragraphs." error={error('bio')} required>
        <Textarea name="bio" defaultValue={defaultValues.bio} rows={12} required />
      </Field>

      <Field label="Speaks on" hint="One per line." error={error('focusAreas')}>
        <Textarea name="focusAreas" defaultValue={(defaultValues.focusAreas ?? []).join('\n')} rows={6} />
      </Field>

      <Field label="Outreach" hint="One per line." error={error('initiatives')}>
        <Textarea name="initiatives" defaultValue={(defaultValues.initiatives ?? []).join('\n')} rows={5} />
      </Field>

      <Field
        label="Status"
        hint="Only a published profile appears on the public page."
        error={error('status')}
      >
        <Select name="status" defaultValue={defaultValues.status ?? 'DRAFT'}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="PUBLISHED">Published</SelectItem>
            <SelectItem value="ARCHIVED">Archived</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <div className="flex items-center gap-[var(--spacing-3)]">
        <Submit mode={mode} />
      </div>
    </form>
  );
}

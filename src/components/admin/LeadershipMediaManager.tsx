'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import Image from 'next/image';
import { Button, Field, Input, Textarea } from '@/components/primitives';
import { ConfirmButton } from '@/components/admin/ConfirmButton';
import { formatBytes } from '@/lib/format';
import {
  clearLeadershipPortraitAction,
  removeLeadershipMediaAction,
  uploadLeadershipFileAction,
  type LeadershipFormState,
} from '@/actions/leadership';

type Item = {
  id: string;
  title: string;
  description: string | null;
  url: string | null;
  bytes: number;
};

export type LeadershipMediaManagerProps = {
  profileId: string;
  portraitUrl: string | null;
  portraitAlt: string | null;
  photos: Item[];
  documents: Item[];
};

const TARGETS = [
  { value: 'PORTRAIT', label: 'Portrait', accept: 'image/jpeg,image/png,image/webp,image/avif' },
  { value: 'PHOTO', label: 'Photograph', accept: 'image/jpeg,image/png,image/webp,image/avif' },
  { value: 'DOCUMENT', label: 'PDF', accept: 'application/pdf' },
] as const;

function Submit() {
  const { pending } = useFormStatus();
  return <Button type="submit" variant="primary" loading={pending}>Publish file</Button>;
}

/**
 * Everything a reviewer can put on the public page, and everything they can
 * take off it.
 *
 * The title field is mandatory for all three targets because it does different
 * necessary work in each: it is the portrait's alt text, the photograph's alt
 * text, and the document's link text. A file published with no title is either
 * invisible to a screen reader or shown to everyone as a UUID.
 */
export function LeadershipMediaManager({
  profileId,
  portraitUrl,
  portraitAlt,
  photos,
  documents,
}: LeadershipMediaManagerProps) {
  const [target, setTarget] = useState<(typeof TARGETS)[number]['value']>('PHOTO');
  const [state, formAction] = useActionState<LeadershipFormState, FormData>(
    uploadLeadershipFileAction,
    {},
  );
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) form.current?.reset();
  }, [state.ok]);

  const accept = TARGETS.find((t) => t.value === target)!.accept;

  return (
    <div className="flex flex-col gap-[var(--spacing-8)]">
      <form ref={form} action={formAction} className="flex flex-col gap-[var(--spacing-4)]">
        <input type="hidden" name="profileId" value={profileId} />
        <input type="hidden" name="target" value={target} />

        {state.error ? (
          <p
            role="alert"
            className="rounded-sm border border-danger/30 bg-danger-quiet px-[var(--spacing-4)] py-[var(--spacing-3)] text-sm text-danger"
          >
            {state.error}
          </p>
        ) : null}

        <fieldset className="border-0 p-0">
          <legend className="text-2xs uppercase tracking-wide text-ink-subtle">Publish as</legend>
          <div className="mt-[var(--spacing-3)] flex flex-wrap gap-[var(--spacing-2)]">
            {TARGETS.map((option) => (
              <Button
                key={option.value}
                type="button"
                size="sm"
                variant={target === option.value ? 'primary' : 'secondary'}
                aria-pressed={target === option.value}
                onClick={() => setTarget(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </fieldset>

        <Field label="File" hint={target === 'DOCUMENT' ? 'PDF, up to 20MB.' : 'JPEG, PNG, WebP or AVIF, up to 5MB.'} required>
          <Input
            type="file"
            name="file"
            accept={accept}
            required
            className="h-auto py-[var(--spacing-2)] file:mr-[var(--spacing-3)] file:rounded-sm file:border-0 file:bg-paper-sunken file:px-[var(--spacing-3)] file:py-[var(--spacing-1)] file:text-xs file:text-ink"
          />
        </Field>

        <Field
          label="Title"
          hint={
            target === 'DOCUMENT'
              ? 'What the link says. A reader sees this instead of the filename.'
              : 'Describe the photograph for people who cannot see it.'
          }
          error={state.fields?.title?.[0]}
          required
        >
          <Input name="title" required maxLength={200} />
        </Field>

        {target === 'DOCUMENT' || target === 'PHOTO' ? (
          <>
            <Field label="Caption" hint="Optional. Shown beneath the item.">
              <Textarea name="description" rows={2} maxLength={1000} />
            </Field>

            <Field
              label="Position"
              hint="Lower numbers come first. Equal numbers fall back to upload order."
            >
              <Input type="number" name="orderIndex" min={0} max={999} defaultValue={0} />
            </Field>
          </>
        ) : null}

        <div><Submit /></div>
      </form>

      {portraitUrl ? (
        <section>
          <h3 className="text-2xs uppercase tracking-wide text-ink-subtle">Portrait</h3>
          <div className="mt-[var(--spacing-4)] flex items-start gap-[var(--spacing-4)]">
            <div className="relative aspect-[4/5] w-[8rem] shrink-0 overflow-hidden rounded-sm border border-line">
              <Image src={portraitUrl} alt={portraitAlt ?? ''} fill sizes="8rem" className="object-cover" />
            </div>
            <ConfirmButton
              label="Remove"
              variant="danger"
              objectName={portraitAlt ?? 'the current portrait'}
              title="Remove this portrait?"
              description="The profile keeps its text and its other files. The image stays in storage and can be attached again."
              confirmLabel="Remove portrait"
              successMessage="Portrait removed"
              action={() => clearLeadershipPortraitAction(profileId)}
            />
          </div>
        </section>
      ) : null}

      <ItemList heading="Photographs" items={photos} />
      <ItemList heading="Documents" items={documents} />
    </div>
  );
}

function ItemList({ heading, items }: { heading: string; items: Item[] }) {
  if (items.length === 0) return null;

  return (
    <section>
      <h3 className="text-2xs uppercase tracking-wide text-ink-subtle">{heading}</h3>
      <ul className="mt-[var(--spacing-4)] flex list-none flex-col p-0">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between gap-[var(--spacing-4)] border-t border-line py-[var(--spacing-3)] last:border-b"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm text-ink">{item.title}</span>
              <span className="block text-xs text-ink-subtle" data-numeric>
                {formatBytes(item.bytes)}
              </span>
            </span>
            <ConfirmButton
              label="Remove"
              variant="danger"
              objectName={item.title}
              title="Take this off the public page?"
              description="It stops appearing immediately. Nothing is destroyed — the record is archived and the file stays in storage."
              confirmLabel="Remove file"
              successMessage="Removed from the page"
              action={() => removeLeadershipMediaAction(item.id)}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

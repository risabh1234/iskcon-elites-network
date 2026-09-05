import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PageHeader, Section } from '@/components/patterns';
import { getActor } from '@/server/auth';
import { SubmitForm } from './SubmitForm';

export const metadata: Metadata = {
  title: 'Add an entry',
  robots: { index: false, follow: false },
};

export default async function SubmitPage() {
  const actor = await getActor();
  if (actor.kind !== 'user') redirect('/sign-in?redirectTo=/directory/submit');

  return (
    <Section>
      <div className="mx-auto max-w-[48rem]">
        <PageHeader
          eyebrow="The register"
          title="Add an entry"
          lede="Entries are reviewed before they appear. Yours will be visible to you in the meantime."
        />
        <div className="mt-[var(--spacing-7)]">
          <SubmitForm />
        </div>
      </div>
    </Section>
  );
}

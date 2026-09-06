import type { Metadata } from 'next';
import { PageHeader } from '@/components/patterns';
import { LeadershipForm } from '@/components/admin/LeadershipForm';
import { createLeadershipAction } from '@/actions/leadership';

export const metadata: Metadata = { title: 'New profile' };

/**
 * Text first, files afterwards.
 *
 * A portrait cannot be attached until the profile exists to attach it to, so
 * this page does not pretend to offer one — the editor does, immediately after
 * the profile is created.
 */
export default function NewLeadershipPage() {
  return (
    <>
      <PageHeader
        eyebrow="Leadership"
        title="New profile"
        lede="It is created as a draft. Photographs and documents are added once it exists."
      />

      <div className="mt-[var(--spacing-6)] max-w-[var(--measure-prose)]">
        <LeadershipForm mode="create" action={createLeadershipAction} />
      </div>
    </>
  );
}

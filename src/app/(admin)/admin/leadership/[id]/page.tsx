import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge, Button } from '@/components/primitives';
import { PageHeader } from '@/components/patterns';
import { LeadershipForm } from '@/components/admin/LeadershipForm';
import { LeadershipMediaManager } from '@/components/admin/LeadershipMediaManager';
import { getActor } from '@/server/auth';
import { getLeadershipProfile } from '@/domain/leadership/service';
import { updateLeadershipAction } from '@/actions/leadership';

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: 'Edit profile' };

const TONE = { PUBLISHED: 'success', DRAFT: 'warning', ARCHIVED: 'neutral' } as const;

/** Text on the left of the fold, files below it. Both write an audit row. */
export default async function EditLeadershipPage({ params }: Props) {
  const { id } = await params;
  const result = await getLeadershipProfile(await getActor(), id);
  if (!result.ok) notFound();

  const profile = result.value;

  return (
    <>
      <PageHeader
        eyebrow="Leadership"
        title={profile.displayName}
        actions={
          <>
            <Badge tone={TONE[profile.status]}>{profile.status.toLowerCase()}</Badge>
            <Button asChild size="sm">
              <Link href="/leadership">View page</Link>
            </Button>
          </>
        }
      />

      <div className="mt-[var(--spacing-6)] max-w-[var(--measure-prose)]">
        <LeadershipForm
          mode="edit"
          action={updateLeadershipAction}
          defaultValues={{
            id: profile.id,
            honorific: profile.honorific,
            name: profile.name,
            initiatedName: profile.initiatedName,
            role: profile.role,
            headline: profile.headline,
            bio: profile.bio,
            focusAreas: profile.focusAreas,
            initiatives: profile.initiatives,
            status: profile.status,
          }}
        />
      </div>

      <section className="mt-[var(--spacing-9)] max-w-[var(--measure-prose)] border-t border-line pt-[var(--spacing-7)]">
        <h2 className="text-xl">Photographs and documents</h2>
        <p className="mt-[var(--spacing-2)] text-sm text-ink-muted">
          Anything published here is visible to anyone who opens the page, signed in or not.
        </p>

        <div className="mt-[var(--spacing-6)]">
          <LeadershipMediaManager
            profileId={profile.id}
            portraitUrl={profile.portraitUrl}
            portraitAlt={profile.portraitAlt}
            photos={profile.photos}
            documents={profile.documents}
          />
        </div>
      </section>
    </>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Badge, Button, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, TableWrapper,
} from '@/components/primitives';
import { EmptyState, PageHeader } from '@/components/patterns';
import { getActor } from '@/server/auth';
import { listLeadership } from '@/domain/leadership/service';

export const metadata: Metadata = { title: 'Leadership' };

const TONE = { PUBLISHED: 'success', DRAFT: 'warning', ARCHIVED: 'neutral' } as const;

/** The people the public page names, and the state each of them is in. */
export default async function AdminLeadershipPage() {
  const result = await listLeadership(await getActor());
  if (!result.ok) throw new Error(result.error.message);

  const profiles = result.value;

  return (
    <>
      <PageHeader
        title="Leadership"
        lede="Who the network says it is led by. Published profiles appear on /leadership."
        actions={
          <Button asChild variant="primary" size="sm">
            <Link href="/admin/leadership/new">New profile</Link>
          </Button>
        }
      />

      <div className="mt-[var(--spacing-5)]">
        {profiles.length === 0 ? (
          <EmptyState
            title="No profiles yet"
            description="Nothing is claimed about who leads the network until someone is named here."
            action={
              <Button asChild variant="primary">
                <Link href="/admin/leadership/new">Add the first profile</Link>
              </Button>
            }
          />
        ) : (
          <TableWrapper>
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>Name</TableHeaderCell>
                  <TableHeaderCell>Office</TableHeaderCell>
                  <TableHeaderCell>Files</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Updated</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {profiles.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell className="text-ink">
                      <Link
                        href={`/admin/leadership/${profile.id}`}
                        className="no-underline hover:underline"
                      >
                        {profile.displayName}
                      </Link>
                    </TableCell>
                    <TableCell>{profile.role ?? '—'}</TableCell>
                    <TableCell data-numeric>
                      {profile.photos.length} photo{profile.photos.length === 1 ? '' : 's'},{' '}
                      {profile.documents.length} PDF{profile.documents.length === 1 ? '' : 's'}
                    </TableCell>
                    <TableCell>
                      <Badge tone={TONE[profile.status]}>{profile.status.toLowerCase()}</Badge>
                    </TableCell>
                    <TableCell data-numeric>
                      {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
                        new Date(profile.updatedAt),
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableWrapper>
        )}
      </div>
    </>
  );
}

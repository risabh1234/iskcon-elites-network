import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Badge, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, TableWrapper,
} from '@/components/primitives';
import { EmptyState, PageHeader } from '@/components/patterns';
import { getActor } from '@/server/auth';
import { listStories } from '@/domain/story/service';

export const metadata: Metadata = { title: 'Stories' };

const TONE = { PUBLISHED: 'success', DRAFT: 'warning', ARCHIVED: 'neutral' } as const;

export default async function AdminStoriesPage() {
  const result = await listStories(await getActor());
  if (!result.ok) throw new Error(result.error.message);

  const stories = result.value;

  return (
    <>
      <PageHeader
        title="Stories"
        lede="Editorial pieces about members of the register."
        actions={<Badge tone="neutral">{stories.filter((s) => s.status === 'DRAFT').length} drafts</Badge>}
      />

      <div className="mt-[var(--spacing-5)]">
        {stories.length === 0 ? (
          <EmptyState
            title="No stories yet"
            description="Stories are written outside the console for now; they appear here once they exist."
          />
        ) : (
          <TableWrapper>
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>Title</TableHeaderCell>
                  <TableHeaderCell>About</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Published</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {stories.map((story) => (
                  <TableRow key={story.id}>
                    <TableCell className="text-ink">
                      <Link href={`/success-stories/${story.slug}`} className="no-underline hover:underline">
                        {story.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {story.member ? (
                        <Link href={`/directory/${story.member.slug}`}>{story.member.name}</Link>
                      ) : '—'}
                    </TableCell>
                    <TableCell><Badge tone={TONE[story.status]}>{story.status.toLowerCase()}</Badge></TableCell>
                    <TableCell data-numeric>
                      {story.publishedAt
                        ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(story.publishedAt))
                        : '—'}
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

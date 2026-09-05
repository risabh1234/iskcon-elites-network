import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Badge, Table, TableBody, TableHead, TableHeaderCell, TableWrapper,
} from '@/components/primitives';
import { EmptyState, PageHeader } from '@/components/patterns';
import { getActor } from '@/server/auth';
import { listMembers } from '@/domain/member/service';
import { MemberRow } from './MemberQueue';

export const metadata: Metadata = { title: 'Members' };

type Props = { searchParams: Promise<{ status?: string }> };

const TABS = [
  { key: 'PENDING', label: 'Awaiting review' },
  { key: 'APPROVED', label: 'Published' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'ALL', label: 'Everyone' },
] as const;

/**
 * The approval queue.
 *
 * NOTE, a deviation from REBUILD_PLAN.md Phase 6: the plan asks for a
 * side-by-side diff of submitted versus current values. There is nothing to
 * diff — the schema has no revision or draft model, so a pending entry IS the
 * current row rather than a proposed change to one. Showing an invented "before"
 * column would be worse than showing none. A revision model is the prerequisite,
 * and it is not in Phase 4's schema.
 */
export default async function AdminMembersPage({ searchParams }: Props) {
  const { status } = await searchParams;
  const active = TABS.find((t) => t.key === status)?.key ?? 'PENDING';

  const actor = await getActor();
  const result = await listMembers(actor, { includeUnpublished: true, limit: 100, sort: 'recent' });
  if (!result.ok) throw new Error(result.error.message);

  const all = result.value.members;
  const members = active === 'ALL' ? all : all.filter((m) => m.status === active);
  const pendingCount = all.filter((m) => m.status === 'PENDING').length;

  return (
    <>
      <PageHeader
        title="Members"
        lede="Entries are reviewed before they appear in the register."
        actions={pendingCount > 0 ? <Badge tone="warning">{pendingCount} awaiting review</Badge> : null}
      />

      {/* Tab state is in the URL, so a reviewer can send a colleague the queue
          they are actually looking at. */}
      <nav aria-label="Filter by status" className="mt-[var(--spacing-5)] border-b border-line">
        <ul className="flex list-none flex-wrap items-center gap-[var(--spacing-5)] p-0">
          {TABS.map((tab) => (
            <li key={tab.key}>
              <Link
                href={`/admin/members?status=${tab.key}`}
                aria-current={active === tab.key ? 'page' : undefined}
                className={`-mb-px inline-block border-b-2 pb-[var(--spacing-3)] text-sm no-underline ${
                  active === tab.key
                    ? 'border-accent text-ink'
                    : 'border-transparent text-ink-subtle hover:text-ink'
                }`}
              >
                {tab.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-[var(--spacing-5)]">
        {members.length === 0 ? (
          <EmptyState
            title={active === 'PENDING' ? 'Nothing awaiting review' : 'Nothing here'}
            description={
              active === 'PENDING'
                ? 'The queue is empty. New submissions appear here as they arrive.'
                : 'No entries have this status yet.'
            }
          />
        ) : (
          <TableWrapper>
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>Name</TableHeaderCell>
                  <TableHeaderCell>Role</TableHeaderCell>
                  <TableHeaderCell>Location</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell align="end">Actions</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {members.map((member) => (
                  <MemberRow key={member.id} member={member} />
                ))}
              </TableBody>
            </Table>
          </TableWrapper>
        )}
      </div>
    </>
  );
}

import type { Metadata } from 'next';
import { Table, TableBody, TableHead, TableHeaderCell, TableWrapper } from '@/components/primitives';
import { EmptyState, PageHeader } from '@/components/patterns';
import { getActor } from '@/server/auth';
import { listUsers } from '@/domain/user/service';
import { UserRow } from './UserRow';

export const metadata: Metadata = { title: 'Users' };

/**
 * Roles and permissions.
 *
 * Every change goes through the policy layer, which refuses self-demotion,
 * refuses an ADMIN acting on a SUPERADMIN, and refuses to leave the register
 * with no administrator at all. The UI disables what it can, but the guard
 * rails are in the service — a disabled control is a courtesy, not a control.
 */
export default async function AdminUsersPage() {
  const actor = await getActor();
  const result = await listUsers(actor);
  if (!result.ok) throw new Error(result.error.message);

  const users = result.value;
  const admins = users.filter((u) => u.role !== 'USER').length;

  return (
    <>
      <PageHeader
        title="Users"
        lede={
          admins === 1
            ? 'One administrator. Promote a second before changing anything here.'
            : `${admins} administrators.`
        }
      />

      <div className="mt-[var(--spacing-5)]">
        {users.length === 0 ? (
          <EmptyState title="No accounts yet" description="Accounts appear here once people register." />
        ) : (
          <TableWrapper>
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>Name</TableHeaderCell>
                  <TableHeaderCell>Email</TableHeaderCell>
                  <TableHeaderCell>Role</TableHeaderCell>
                  <TableHeaderCell>Events</TableHeaderCell>
                  <TableHeaderCell align="end">Actions</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    isSelf={actor.kind === 'user' && actor.id === user.id}
                  />
                ))}
              </TableBody>
            </Table>
          </TableWrapper>
        )}
      </div>
    </>
  );
}

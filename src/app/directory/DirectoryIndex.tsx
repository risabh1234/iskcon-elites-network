import Link from 'next/link';
import {
  Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, TableWrapper,
} from '@/components/primitives';
import type { MemberDto } from '@/domain/member/dto';

/**
 * The dense view, for people who already know who they are looking for.
 * A directory needs both: browsing and lookup are different tasks.
 */
export function DirectoryIndex({ members }: { members: MemberDto[] }) {
  return (
    <TableWrapper>
      <Table>
        <TableHead>
          <tr>
            <TableHeaderCell>Name</TableHeaderCell>
            <TableHeaderCell>Role</TableHeaderCell>
            <TableHeaderCell>Field</TableHeaderCell>
            <TableHeaderCell>Location</TableHeaderCell>
          </tr>
        </TableHead>
        <TableBody>
          {members.map((member) => (
            <TableRow key={member.id}>
              <TableCell className="text-ink">
                <Link href={`/directory/${member.slug}`} className="no-underline hover:underline">
                  {member.initiatedName ?? member.name}
                </Link>
                {member.initiatedName ? (
                  <span className="ml-[var(--spacing-2)] text-xs text-ink-subtle">{member.name}</span>
                ) : null}
              </TableCell>
              <TableCell>{member.headline ?? '—'}</TableCell>
              <TableCell>{member.expertise.map((e) => e.label).join(', ') || '—'}</TableCell>
              <TableCell>{member.location ?? '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableWrapper>
  );
}

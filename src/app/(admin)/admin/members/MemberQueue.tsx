'use client';

import Link from 'next/link';
import { Badge, TableCell, TableRow } from '@/components/primitives';
import { ConfirmButton } from '@/components/admin/ConfirmButton';
import { archiveMemberAction, setApprovalAction } from '@/actions/member';
import type { MemberDto } from '@/domain/member/dto';

const STATUS_TONE = {
  APPROVED: 'success',
  PENDING: 'warning',
  REJECTED: 'danger',
  DRAFT: 'neutral',
  ARCHIVED: 'neutral',
} as const;

export function MemberRow({ member }: { member: MemberDto }) {
  const name = member.initiatedName ?? member.name;

  return (
    <TableRow>
      <TableCell className="text-ink">
        <Link href={`/directory/${member.slug}`} className="no-underline hover:underline">
          {name}
        </Link>
        {member.initiatedName ? (
          <span className="ml-[var(--spacing-2)] text-xs text-ink-subtle">{member.name}</span>
        ) : null}
      </TableCell>
      <TableCell>{member.headline ?? '—'}</TableCell>
      <TableCell>{member.location ?? '—'}</TableCell>
      <TableCell>
        <Badge tone={STATUS_TONE[member.status]}>{member.status.toLowerCase()}</Badge>
      </TableCell>
      <TableCell align="end">
        <div className="flex justify-end gap-[var(--spacing-2)]">
          {member.status !== 'APPROVED' ? (
            <ConfirmButton
              label="Publish"
              variant="primary"
              objectName={name}
              title="Publish this entry?"
              description="It becomes visible in the directory immediately."
              confirmLabel="Publish"
              successMessage="Entry published"
              action={() => setApprovalAction(member.id, true)}
            />
          ) : null}

          {member.status !== 'REJECTED' ? (
            <ConfirmButton
              label="Reject"
              objectName={name}
              title="Reject this entry?"
              description="The submitter is told why. Nothing is deleted."
              confirmLabel="Reject entry"
              requireReason
              reasonLabel="Why is it being rejected?"
              successMessage="Entry rejected"
              action={(reason) => setApprovalAction(member.id, false, reason)}
            />
          ) : null}

          <ConfirmButton
            label="Archive"
            variant="danger"
            objectName={name}
            title="Archive this entry?"
            description="It leaves the directory. Archiving is reversible — nothing is destroyed."
            confirmLabel="Archive"
            successMessage="Entry archived"
            action={() => archiveMemberAction(member.id)}
          />
        </div>
      </TableCell>
    </TableRow>
  );
}

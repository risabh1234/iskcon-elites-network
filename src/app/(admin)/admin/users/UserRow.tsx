'use client';

import { useTransition } from 'react';
import {
  Badge, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Switch, TableCell, TableRow, useToast,
} from '@/components/primitives';
import { ConfirmButton } from '@/components/admin/ConfirmButton';
import { deleteUserAction, setEventPermissionAction, setRoleAction } from '@/actions/user';
import type { UserDto } from '@/domain/user/dto';

const ROLE_TONE = { SUPERADMIN: 'accent', ADMIN: 'success', USER: 'neutral' } as const;

export function UserRow({ user, isSelf }: { user: UserDto; isSelf: boolean }) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const label = user.name ?? user.email;
  // Two reasons a row cannot be edited, with different explanations: it is you,
  // or the account holds the register by standing arrangement.
  const locked = isSelf || user.isProtected;

  function change(next: () => Promise<{ ok?: boolean; error?: string }>, success: string) {
    startTransition(async () => {
      const result = await next();
      if (result.error) {
        toast({ title: 'That didn’t work', description: result.error, tone: 'danger' });
        return;
      }
      toast({ title: success, description: label, tone: 'success' });
    });
  }

  return (
    <TableRow>
      <TableCell className="text-ink">
        {label}
        {isSelf ? <span className="ml-[var(--spacing-2)] text-xs text-ink-subtle">(you)</span> : null}
        {user.isProtected ? (
          <span className="ml-[var(--spacing-2)] text-xs text-ink-subtle">
            (designated administrator)
          </span>
        ) : null}
      </TableCell>
      <TableCell>{user.email}</TableCell>

      <TableCell>
        {/* Disabled for your own row, because changing your own role is the one
            edit that can silently lock the institution out of its own console;
            and for a designated administrator, whose role is reasserted at
            their next sign-in. The policy refuses both — this only saves the
            round trip, and stops the page offering a change it will not make. */}
        {locked ? (
          <Badge tone={ROLE_TONE[user.role]}>{user.role.toLowerCase()}</Badge>
        ) : (
          <Select
            value={user.role}
            disabled={pending}
            onValueChange={(role) =>
              change(() => setRoleAction(user.id, role as UserDto['role']), 'Role changed')
            }
          >
            <SelectTrigger className="w-[10rem]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="USER">User</SelectItem>
              <SelectItem value="ADMIN">Admin</SelectItem>
              <SelectItem value="SUPERADMIN">Superadmin</SelectItem>
            </SelectContent>
          </Select>
        )}
      </TableCell>

      <TableCell>
        <Switch
          id={`events-${user.id}`}
          checked={user.canCreateEvents}
          disabled={pending}
          onCheckedChange={(checked) =>
            change(
              () => setEventPermissionAction(user.id, checked),
              checked ? 'Can now create events' : 'Event permission removed',
            )
          }
          label="May create events"
        />
      </TableCell>

      <TableCell align="end">
        {locked ? (
          <span className="text-xs text-ink-subtle">—</span>
        ) : (
          <ConfirmButton
            label="Remove"
            variant="danger"
            objectName={`${label} (${user.email})`}
            title="Remove this account?"
            description="Their sessions end immediately and their linked sign-in methods are removed. Directory entries they submitted are not deleted."
            confirmLabel="Remove account"
            successMessage="Account removed"
            action={() => deleteUserAction(user.id)}
          />
        )}
      </TableCell>
    </TableRow>
  );
}

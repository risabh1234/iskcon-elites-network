'use client';

import { ConfirmButton } from '@/components/admin/ConfirmButton';
import { cancelEventAction } from '@/actions/event';

export function EventActions({ id, title }: { id: string; title: string }) {
  return (
    <ConfirmButton
      label="Cancel"
      variant="danger"
      objectName={title}
      title="Cancel this event?"
      description="It leaves the calendar and registrations stop. Cancelling is reversible — nothing is destroyed."
      confirmLabel="Cancel event"
      successMessage="Event cancelled"
      action={() => cancelEventAction(id)}
    />
  );
}

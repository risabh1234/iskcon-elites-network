'use client';

import { useState, useTransition } from 'react';
import {
  Button, Dialog, DialogContent, DialogFooter, Field, Textarea, useToast,
} from '@/components/primitives';
import type { ButtonProps } from '@/components/primitives';

export type ConfirmButtonProps = {
  /** What the action does, e.g. "Archive". */
  label: React.ReactNode;
  /** The object being acted on, named in the confirmation. */
  objectName: string;
  title: string;
  description: string;
  confirmLabel: string;
  /** When set, the reason is required and passed to the action. */
  requireReason?: boolean;
  reasonLabel?: string;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  action: (reason?: string) => Promise<{ ok?: boolean; error?: string }>;
  successMessage: string;
};

/**
 * Every destructive action confirms by naming the object.
 *
 * "Are you sure?" is not a confirmation — it asks a question the reader cannot
 * answer, because it does not say what is about to happen to whom.
 */
export function ConfirmButton({
  label, objectName, title, description, confirmLabel,
  requireReason = false, reasonLabel = 'Reason', variant = 'secondary', size = 'sm',
  action, successMessage,
}: ConfirmButtonProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [pending, startTransition] = useTransition();

  const blocked = requireReason && reason.trim().length === 0;

  function run() {
    startTransition(async () => {
      const result = await action(requireReason ? reason.trim() : undefined);
      if (result.error) {
        toast({ title: 'That didn’t work', description: result.error, tone: 'danger' });
        return;
      }
      setOpen(false);
      setReason('');
      toast({ title: successMessage, description: objectName, tone: 'success' });
    });
  }

  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)}>
        {label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title={title} description={description}>
          <p className="text-sm text-ink">
            This applies to <strong>{objectName}</strong>.
          </p>

          {requireReason ? (
            <div className="mt-[var(--spacing-5)]">
              <Field
                label={reasonLabel}
                hint="Recorded in the audit trail and shown to the submitter."
                required
              >
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  autoFocus
                />
              </Field>
            </div>
          ) : null}

          <DialogFooter>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              variant={variant === 'danger' ? 'danger' : 'primary'}
              loading={pending}
              disabled={blocked}
              onClick={run}
            >
              {confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

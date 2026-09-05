'use client';

import { useRouter } from 'next/navigation';
import { MemberForm } from '@/components/patterns';
import { createMemberAction } from '@/actions/member';

export function SubmitForm() {
  const router = useRouter();

  return (
    <MemberForm
      mode="create"
      action={createMemberAction}
      // Back to the register on success: the entry is in the queue, and the
      // directory is where the person expects to end up.
      onSuccess={() => router.push('/directory')}
    />
  );
}

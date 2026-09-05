import { redirect } from 'next/navigation';

/** The console opens on the queue, because that is what needs attention. */
export default function AdminIndexPage() {
  redirect('/admin/members');
}

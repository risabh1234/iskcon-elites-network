import { getActor } from '@/server/auth';
import { respond } from '@/server/http';
import { listUsers, syncFromClerk } from '@/domain/user/service';

export async function GET() {
  return respond(await listUsers(await getActor()));
}

/**
 * Reconciliation with Clerk. It used to run inside the GET above, so opening
 * the admin dashboard wrote to the database on every load — a GET must not
 * mutate. It is now an explicit action.
 */
export async function POST() {
  return respond(await syncFromClerk(await getActor()));
}

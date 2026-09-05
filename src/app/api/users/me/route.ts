import { ensureActor } from '@/server/auth';
import { respond } from '@/server/http';
import { getSelf } from '@/domain/user/service';

export async function GET() {
  // ensureActor creates the local row for a signed-in Clerk user who lacks one,
  // always as USER. It never elevates — see ADR-0007.
  return respond(getSelf(await ensureActor()));
}

import { getActor } from '@/server/auth';
import { respond } from '@/server/http';
import { getSelf } from '@/domain/user/service';

export async function GET() {
  // No provisioning step: a user row exists because they registered here.
  return respond(getSelf(await getActor()));
}

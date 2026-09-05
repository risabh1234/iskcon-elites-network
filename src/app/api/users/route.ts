import { getActor } from '@/server/auth';
import { respond } from '@/server/http';
import { listUsers } from '@/domain/user/service';

export async function GET() {
  return respond(await listUsers(await getActor()));
}

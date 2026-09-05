import { getActor } from '@/server/auth';
import { respond } from '@/server/http';
import { updateUserPermissions } from '@/domain/user/service';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const actor = await getActor();
  const result = await updateUserPermissions(actor, id, await request.json().catch(() => null));
  return respond(result);
}

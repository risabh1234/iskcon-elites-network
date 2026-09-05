import { getActor } from '@/server/auth';
import { respond } from '@/server/http';
import { deleteUser } from '@/domain/user/service';

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  return respond(await deleteUser(await getActor(), id));
}

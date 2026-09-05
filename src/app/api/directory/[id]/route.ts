import { getActor } from '@/server/auth';
import { respond } from '@/server/http';
import { deleteMember, getMember, updateMember } from '@/domain/member/service';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  return respond(await getMember(await getActor(), id));
}

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  const actor = await getActor();
  const result = await updateMember(actor, id, await request.json().catch(() => null));
  return respond(result);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  return respond(await deleteMember(await getActor(), id));
}

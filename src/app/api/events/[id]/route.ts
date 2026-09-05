import { getActor } from '@/server/auth';
import { respond } from '@/server/http';
import { deleteEvent, getEvent, updateEvent } from '@/domain/event/service';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  return respond(await getEvent(await getActor(), id));
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const actor = await getActor();
  const result = await updateEvent(actor, id, await request.json().catch(() => null));
  return respond(result);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  return respond(await deleteEvent(await getActor(), id));
}

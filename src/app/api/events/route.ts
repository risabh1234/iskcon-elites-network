import { getActor } from '@/server/auth';
import { respond } from '@/server/http';
import { createEvent, listEvents } from '@/domain/event/service';

export async function GET() {
  return respond(await listEvents(await getActor()));
}

export async function POST(request: Request) {
  const actor = await getActor();
  const result = await createEvent(actor, await request.json().catch(() => null));
  return respond(result, 201);
}

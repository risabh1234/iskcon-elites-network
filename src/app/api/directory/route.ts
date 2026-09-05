import { getActor } from '@/server/auth';
import { respond } from '@/server/http';
import { createMember, listMembers } from '@/domain/member/service';

export async function GET(request: Request) {
  const actor = await getActor();
  const includeUnpublished =
    new URL(request.url).searchParams.get('includeUnpublished') === 'true';

  const result = await listMembers(actor, { includeUnpublished });
  return respond(result);
}

export async function POST(request: Request) {
  const actor = await getActor();
  const result = await createMember(actor, await request.json().catch(() => null));
  return respond(result, 201);
}

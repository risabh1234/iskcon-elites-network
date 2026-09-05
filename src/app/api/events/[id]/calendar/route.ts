import { getActor } from '@/server/auth';
import { getEvent } from '@/domain/event/service';
import { buildIcs } from '@/lib/ics';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const result = await getEvent(await getActor(), id);

  if (!result.ok) return new Response('Not found', { status: 404 });

  const event = result.value;

  const ics = buildIcs(
    {
      id: event.id,
      title: event.title,
      description: event.description,
      location: event.location || event.onlineUrl,
      url: `/events`,
      startsAt: new Date(event.startsAt),
      endsAt: event.endsAt ? new Date(event.endsAt) : null,
    },
    new URL(request.url).origin,
  );

  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${event.slug}.ics"`,
      'Cache-Control': 'public, max-age=300',
    },
  });
}

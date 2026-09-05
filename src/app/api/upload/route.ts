import { getActor } from '@/server/auth';
import { clientKey, respond } from '@/server/http';
import { validation } from '@/server/errors';
import { err } from '@/server/result';
import { uploadImage } from '@/domain/media/service';

export async function POST(request: Request) {
  const actor = await getActor();

  const formData = await request.formData().catch(() => null);
  const file = formData?.get('file');

  if (!(file instanceof File)) {
    return respond(err(validation('No file was provided.')));
  }

  const result = await uploadImage(
    actor,
    file,
    clientKey(request, actor.kind === 'user' ? actor.id : undefined),
  );
  return respond(result);
}

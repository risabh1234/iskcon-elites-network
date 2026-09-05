import { readSession } from './auth/session';
import type { Actor, Role } from './policy';

/**
 * The single place a request is resolved to an identity.
 *
 * This used to wrap a third-party provider and now reads a first-party session
 * cookie. Everything above it — policy, services, adapters — was written against
 * `getActor()` and did not change when the provider was removed, which is the
 * whole point of having had the boundary.
 */
export async function getActor(): Promise<Actor> {
  const session = await readSession();
  if (!session) return { kind: 'anonymous' };

  return {
    kind: 'user',
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role as Role,
    canCreateEvents: session.user.canCreateEvents,
  };
}

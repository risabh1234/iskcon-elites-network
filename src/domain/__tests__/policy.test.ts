import { describe, expect, it } from 'vitest';
import { can, type Action, type Actor, type Role } from '@/server/policy';

/**
 * Every (role x action x ownership) combination.
 *
 * These are the tests that would have caught three of the four holes the audit
 * found: an unauthenticated caller reading unpublished members, a signed-in
 * non-admin deleting any profile, and `canCreateEvents` granting authority over
 * other people's events.
 */
const anon: Actor = { kind: 'anonymous' };

function user(role: Role, opts: { id?: string; canCreateEvents?: boolean } = {}): Actor {
  return {
    kind: 'user',
    id: opts.id ?? 'u1',
    clerkId: 'clerk_1',
    email: 'a@example.com',
    role,
    canCreateEvents: opts.canCreateEvents ?? false,
  };
}

const ROLES: Role[] = ['USER', 'ADMIN', 'SUPERADMIN'];

const ALL_ACTIONS: Action[] = [
  'member:read', 'member:read:unpublished', 'member:create', 'member:update',
  'member:delete', 'member:approve',
  'event:read', 'event:read:unpublished', 'event:create', 'event:update', 'event:delete',
  'story:read', 'story:create', 'story:update', 'story:delete',
  'mentorship:request', 'mentorship:decide',
  'user:read', 'user:update:role', 'user:update:permissions', 'user:delete',
  'admin:access', 'media:upload',
];

describe('can() — exhaustiveness', () => {
  it('returns a boolean for every action and role, and never throws', () => {
    for (const action of ALL_ACTIONS) {
      expect(typeof can(anon, action)).toBe('boolean');
      for (const role of ROLES) {
        expect(typeof can(user(role), action)).toBe('boolean');
      }
    }
  });
});

describe('anonymous visitors', () => {
  it('may read published members, events and stories', () => {
    expect(can(anon, 'member:read', { isPublished: true })).toBe(true);
    expect(can(anon, 'event:read', { isPublished: true })).toBe(true);
    expect(can(anon, 'story:read', { isPublished: true })).toBe(true);
  });

  it('may NOT read unpublished records — the hole that leaked pending profiles', () => {
    expect(can(anon, 'member:read', { isPublished: false })).toBe(false);
    expect(can(anon, 'event:read', { isPublished: false })).toBe(false);
    expect(can(anon, 'story:read', { isPublished: false })).toBe(false);
    expect(can(anon, 'member:read:unpublished')).toBe(false);
  });

  it('may do nothing else at all', () => {
    const readable = new Set<Action>(['member:read', 'event:read', 'story:read']);
    for (const action of ALL_ACTIONS) {
      if (readable.has(action)) continue;
      expect(can(anon, action), `anonymous should not be able to ${action}`).toBe(false);
    }
  });
});

describe('members (USER)', () => {
  it('may submit an entry but not publish, delete or review one', () => {
    const u = user('USER');
    expect(can(u, 'member:create')).toBe(true);
    expect(can(u, 'member:approve')).toBe(false);
    expect(can(u, 'member:read:unpublished')).toBe(false);
  });

  it('may edit only their own entry', () => {
    const u = user('USER', { id: 'me' });
    expect(can(u, 'member:update', { ownerId: 'me' })).toBe(true);
    expect(can(u, 'member:update', { ownerId: 'someone-else' })).toBe(false);
  });

  it('may NOT delete any entry, including their own', () => {
    // The route this replaces checked only that the caller was signed in, so
    // any member could destroy any profile in the register.
    const u = user('USER', { id: 'me' });
    expect(can(u, 'member:delete', { ownerId: 'me' })).toBe(false);
    expect(can(u, 'member:delete', { ownerId: 'other' })).toBe(false);
  });

  it('may see their own unpublished entry', () => {
    const u = user('USER', { id: 'me' });
    expect(can(u, 'member:read', { isPublished: false, ownerId: 'me' })).toBe(true);
    expect(can(u, 'member:read', { isPublished: false, ownerId: 'other' })).toBe(false);
  });

  it('has no access to the console or to other users', () => {
    const u = user('USER');
    expect(can(u, 'admin:access')).toBe(false);
    expect(can(u, 'user:read')).toBe(false);
    expect(can(u, 'user:update:role', { targetUserId: 'x' })).toBe(false);
    expect(can(u, 'user:delete', { targetUserId: 'x' })).toBe(false);
  });
});

describe('canCreateEvents', () => {
  it('grants creation', () => {
    expect(can(user('USER', { canCreateEvents: true }), 'event:create')).toBe(true);
    expect(can(user('USER', { canCreateEvents: false }), 'event:create')).toBe(false);
  });

  it('grants authority over their OWN events only', () => {
    // Previously this permission authorised deleting and editing every event in
    // the system, which is not what "may create events" means.
    const organiser = user('USER', { id: 'me', canCreateEvents: true });
    expect(can(organiser, 'event:update', { ownerId: 'me' })).toBe(true);
    expect(can(organiser, 'event:delete', { ownerId: 'me' })).toBe(true);
    expect(can(organiser, 'event:update', { ownerId: 'other' })).toBe(false);
    expect(can(organiser, 'event:delete', { ownerId: 'other' })).toBe(false);
  });

  it('does not leak into the directory or the console', () => {
    const organiser = user('USER', { canCreateEvents: true });
    expect(can(organiser, 'member:delete')).toBe(false);
    expect(can(organiser, 'admin:access')).toBe(false);
    expect(can(organiser, 'user:read')).toBe(false);
  });
});

describe.each(['ADMIN', 'SUPERADMIN'] as const)('%s', (role) => {
  const admin = user(role, { id: 'admin-1' });

  it('may review, publish and remove directory entries', () => {
    expect(can(admin, 'member:read:unpublished')).toBe(true);
    expect(can(admin, 'member:approve')).toBe(true);
    expect(can(admin, 'member:delete', { ownerId: 'anyone' })).toBe(true);
    expect(can(admin, 'member:read', { isPublished: false })).toBe(true);
  });

  it('may manage any event', () => {
    expect(can(admin, 'event:create')).toBe(true);
    expect(can(admin, 'event:update', { ownerId: 'other' })).toBe(true);
    expect(can(admin, 'event:delete', { ownerId: 'other' })).toBe(true);
  });

  it('may reach the console and read users', () => {
    expect(can(admin, 'admin:access')).toBe(true);
    expect(can(admin, 'user:read')).toBe(true);
    expect(can(admin, 'user:update:permissions')).toBe(true);
  });

  it('may NOT change their own role or delete themselves', () => {
    expect(can(admin, 'user:update:role', { targetUserId: 'admin-1' })).toBe(false);
    expect(can(admin, 'user:delete', { targetUserId: 'admin-1' })).toBe(false);
  });

  it('may act on an ordinary user', () => {
    expect(can(admin, 'user:update:role', { targetUserId: 'u2', targetRole: 'USER' })).toBe(true);
    expect(can(admin, 'user:delete', { targetUserId: 'u2', targetRole: 'USER' })).toBe(true);
  });
});

describe('SUPERADMIN is required to act on a SUPERADMIN', () => {
  const admin = user('ADMIN', { id: 'admin-1' });
  const superadmin = user('SUPERADMIN', { id: 'super-1' });

  it('an ADMIN may not demote or delete a SUPERADMIN', () => {
    expect(can(admin, 'user:update:role', { targetUserId: 's1', targetRole: 'SUPERADMIN' })).toBe(false);
    expect(can(admin, 'user:delete', { targetUserId: 's1', targetRole: 'SUPERADMIN' })).toBe(false);
  });

  it('a SUPERADMIN may', () => {
    expect(can(superadmin, 'user:update:role', { targetUserId: 's2', targetRole: 'SUPERADMIN' })).toBe(true);
    expect(can(superadmin, 'user:delete', { targetUserId: 's2', targetRole: 'SUPERADMIN' })).toBe(true);
  });
});

describe('defaults', () => {
  it('treats an unspecified publication state as published', () => {
    // Resources are often passed without the flag; the safe reading for a READ
    // is "this is a published thing", because callers that know it is not pass
    // isPublished: false explicitly.
    expect(can(anon, 'member:read', {})).toBe(true);
    expect(can(anon, 'member:read', { isPublished: false })).toBe(false);
  });

  it('treats a missing ownerId as "not the owner"', () => {
    expect(can(user('USER', { id: 'me' }), 'member:update', {})).toBe(false);
  });
});

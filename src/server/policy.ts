/**
 * Authorisation. One function, one table of rules.
 *
 * This module replaces twenty-one hand-written role comparisons spread across
 * twelve files (docs/AUDIT.md §3). That scattering is not a tidiness problem:
 * three of those endpoints had no authorisation at all, and one compared
 * against a different role vocabulary belonging to the old auth provider. When the rule lives in N
 * places, endpoint N+1 is where the breach happens.
 *
 * `can()` is pure — no database, no session, no request. That is what makes it
 * exhaustively testable, and every (role x action x ownership) combination is
 * covered in src/domain/__tests__/policy.test.ts.
 */

export type Role = 'USER' | 'ADMIN' | 'SUPERADMIN';

export type Actor =
  | { kind: 'anonymous' }
  | {
      kind: 'user';
      id: string;
      email: string;
      name: string | null;
      role: Role;
      canCreateEvents: boolean;
    };

export type Action =
  // Directory
  | 'member:read'
  | 'member:read:unpublished'
  | 'member:create'
  | 'member:update'
  | 'member:delete'
  | 'member:approve'
  // Events
  | 'event:read'
  | 'event:read:unpublished'
  | 'event:create'
  | 'event:update'
  | 'event:delete'
  // Leadership
  | 'leadership:read'
  | 'leadership:read:unpublished'
  | 'leadership:update'
  | 'leadership:media:manage'
  // Stories
  | 'story:read'
  | 'story:create'
  | 'story:update'
  | 'story:delete'
  // Mentorship — vocabulary reserved; the tables arrive in Phase 4.
  | 'mentorship:request'
  | 'mentorship:decide'
  // People and access
  | 'user:read'
  | 'user:update:role'
  | 'user:update:permissions'
  | 'user:delete'
  | 'admin:access'
  // Uploads
  | 'media:upload';

/**
 * What the action is being performed on. Everything is optional because many
 * actions are unconditional; supplying more only ever narrows permission.
 */
export type Resource = {
  /** Internal User.id of whoever owns/created the record. */
  ownerId?: string;
  /** False for records awaiting review. */
  isPublished?: boolean;
  /** Role of the user being acted upon, for user-management actions. */
  targetRole?: Role;
  /** Internal User.id of the user being acted upon. */
  targetUserId?: string;
  /**
   * True when the user being acted upon is a designated administrator
   * (src/server/administrators.ts). Passed in rather than looked up, so `can()`
   * stays pure — the caller knows the email, this module must not need to.
   */
  targetIsProtected?: boolean;
};

const isAdmin = (role: Role) => role === 'ADMIN' || role === 'SUPERADMIN';

export function can(actor: Actor, action: Action, resource: Resource = {}): boolean {
  // ── Anonymous ──────────────────────────────────────────────────────────
  // Reading published material is the only thing a stranger may do. Note that
  // `member:read` is granted only when the record is actually published:
  // omitting that check is precisely how unapproved profiles were being served
  // to the public.
  if (actor.kind === 'anonymous') {
    switch (action) {
      case 'member:read':
      case 'event:read':
      case 'story:read':
      case 'leadership:read':
        return resource.isPublished !== false;
      default:
        return false;
    }
  }

  const { role, id, canCreateEvents } = actor;
  const admin = isAdmin(role);
  const owns = resource.ownerId != null && resource.ownerId === id;

  switch (action) {
    // ── Directory ────────────────────────────────────────────────────────
    case 'member:read':
      return resource.isPublished !== false || admin || owns;

    case 'member:read:unpublished':
      return admin;

    case 'member:create':
      // Any member of the network may submit an entry; it lands unapproved.
      return true;

    case 'member:update':
      return admin || owns;

    case 'member:delete':
    case 'member:approve':
      return admin;

    // ── Events ───────────────────────────────────────────────────────────
    case 'event:read':
      return resource.isPublished !== false || admin;

    case 'event:read:unpublished':
      return admin;

    case 'event:create':
      return admin || canCreateEvents;

    case 'event:update':
    case 'event:delete':
      // `canCreateEvents` grants authorship, not authority over other people's
      // events — the previous code let it delete anything. Admins still can.
      return admin || (canCreateEvents && owns);

    // ── Leadership ───────────────────────────────────────────────────────
    // Ownership is deliberately absent: a leadership profile speaks for the
    // institution, so there is no "my own" version of it to edit. Reviewers
    // maintain it or nobody does.
    case 'leadership:read':
      return resource.isPublished !== false || admin;

    case 'leadership:read:unpublished':
    case 'leadership:update':
    case 'leadership:media:manage':
      return admin;

    // ── Stories ──────────────────────────────────────────────────────────
    case 'story:read':
      return resource.isPublished !== false || admin;

    case 'story:create':
      return admin;

    case 'story:update':
    case 'story:delete':
      return admin || owns;

    // ── Mentorship ───────────────────────────────────────────────────────
    case 'mentorship:request':
      return true;

    case 'mentorship:decide':
      return admin || owns;

    // ── People and access ────────────────────────────────────────────────
    case 'user:read':
    case 'admin:access':
      return admin;

    case 'user:update:permissions':
      return admin;

    case 'user:update:role': {
      if (!admin) return false;
      // Nobody edits their own role: it is the one change that can silently
      // lock the institution out of its own console.
      if (resource.targetUserId === id) return false;
      // A designated administrator's role is reasserted at their next sign-in,
      // so allowing the change here would produce a console that appears to
      // work and quietly undoes itself.
      if (resource.targetIsProtected) return false;
      // Only a SUPERADMIN may act on a SUPERADMIN.
      if (resource.targetRole === 'SUPERADMIN' && role !== 'SUPERADMIN') return false;
      return true;
    }

    case 'user:delete': {
      if (!admin) return false;
      if (resource.targetUserId === id) return false;
      if (resource.targetIsProtected) return false;
      if (resource.targetRole === 'SUPERADMIN' && role !== 'SUPERADMIN') return false;
      return true;
    }

    // ── Uploads ──────────────────────────────────────────────────────────
    case 'media:upload':
      return true;

    default: {
      // Exhaustiveness: adding an Action without a rule fails the build rather
      // than silently defaulting to allow — or to deny, and being debugged later.
      const exhaustive: never = action;
      throw new Error(`Unhandled action: ${String(exhaustive)}`);
    }
  }
}

/** Convenience for services: the first line of every mutating method. */
export function requireCan(actor: Actor, action: Action, resource: Resource = {}) {
  return can(actor, action, resource);
}

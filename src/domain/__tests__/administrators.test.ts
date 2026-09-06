import { describe, expect, it } from 'vitest';
import { administratorEmails, isDesignatedAdministrator } from '@/server/administrators';
import { can, type Actor } from '@/server/policy';

/**
 * The two standing administrators, and the rule that keeps the console from
 * offering an edit that would be undone at their next sign-in.
 */
const DESIGNATED = ['tukaramd.official@gmail.com', 'risabhbharadwaj4@gmail.com'];

describe('administratorEmails', () => {
  it('contains both designated addresses with no environment configured', () => {
    const emails = administratorEmails('');
    for (const email of DESIGNATED) expect(emails.has(email)).toBe(true);
  });

  it('adds addresses from the environment without removing the built-in ones', () => {
    const emails = administratorEmails('extra@example.org, SECOND@Example.org');
    expect(emails.has('extra@example.org')).toBe(true);
    expect(emails.has('second@example.org')).toBe(true);
    for (const email of DESIGNATED) expect(emails.has(email)).toBe(true);
  });

  it('ignores entries that are not addresses', () => {
    expect(administratorEmails('not-an-address, ,').has('not-an-address')).toBe(false);
  });
});

describe('isDesignatedAdministrator', () => {
  it('matches regardless of case or surrounding space', () => {
    expect(isDesignatedAdministrator('  Tukaramd.Official@Gmail.com ', '')).toBe(true);
    expect(isDesignatedAdministrator('RisabhBharadwaj4@gmail.com', '')).toBe(true);
  });

  it('does not match a lookalike address', () => {
    // Substring and prefix matching here would hand SUPERADMIN to anyone who
    // could register a similar address.
    expect(isDesignatedAdministrator('tukaramd.official@gmail.com.evil.test', '')).toBe(false);
    expect(isDesignatedAdministrator('xtukaramd.official@gmail.com', '')).toBe(false);
  });

  it('is false for nothing at all', () => {
    expect(isDesignatedAdministrator(null, '')).toBe(false);
    expect(isDesignatedAdministrator(undefined, '')).toBe(false);
    expect(isDesignatedAdministrator('', '')).toBe(false);
  });
});

describe('a designated administrator cannot be demoted or removed', () => {
  const superadmin: Actor = {
    kind: 'user', id: 'a1', email: 'a@e.com', name: null,
    role: 'SUPERADMIN', canCreateEvents: true,
  };

  it('refuses the role change even for a SUPERADMIN', () => {
    expect(
      can(superadmin, 'user:update:role', {
        targetUserId: 'u2',
        targetRole: 'SUPERADMIN',
        targetIsProtected: true,
      }),
    ).toBe(false);
  });

  it('refuses the deletion', () => {
    expect(
      can(superadmin, 'user:delete', { targetUserId: 'u2', targetIsProtected: true }),
    ).toBe(false);
  });

  it('still permits both on an ordinary account', () => {
    const resource = { targetUserId: 'u2', targetRole: 'USER' as const };
    expect(can(superadmin, 'user:update:role', resource)).toBe(true);
    expect(can(superadmin, 'user:delete', resource)).toBe(true);
  });
});

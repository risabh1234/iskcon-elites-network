import { describe, expect, it } from 'vitest';
import { hostOf, isAdminHost, normaliseHost, resolveHostRouting } from '@/server/hosting';

/**
 * The console's subdomain cannot be exercised until a domain exists, so these
 * tests are the only thing standing between the configuration and a reviewer
 * locked out of a host nobody can reach. Every rule is asserted in both
 * directions: what it redirects, and what it must leave alone.
 */
const base = {
  search: '',
  protocol: 'https',
  siteHost: 'iskconelites.org',
  adminHost: 'admin.iskconelites.org',
};

const route = (over: Partial<Parameters<typeof resolveHostRouting>[0]>) =>
  resolveHostRouting({ host: base.siteHost, pathname: '/', ...base, ...over });

describe('normaliseHost', () => {
  it('lower-cases, trims and drops a trailing dot', () => {
    expect(normaliseHost('  Admin.Example.ORG.  ')).toBe('admin.example.org');
  });

  it('keeps the port, because it is part of the origin', () => {
    expect(normaliseHost('localhost:3001')).toBe('localhost:3001');
  });

  it('treats empty and missing alike', () => {
    expect(normaliseHost('')).toBeNull();
    expect(normaliseHost(null)).toBeNull();
  });
});

describe('hostOf', () => {
  it('takes the host out of a configured origin', () => {
    expect(hostOf('https://iskconelites.org/')).toBe('iskconelites.org');
  });

  it('accepts a bare host, so a misconfigured value still works', () => {
    expect(hostOf('iskconelites.org')).toBe('iskconelites.org');
  });

  it('is null when nothing is configured', () => {
    expect(hostOf(undefined)).toBeNull();
  });
});

describe('resolveHostRouting — with no admin host configured', () => {
  it('never redirects anything', () => {
    for (const pathname of ['/', '/admin', '/admin/members', '/directory']) {
      expect(route({ adminHost: null, pathname }).kind).toBe('continue');
      expect(route({ adminHost: '', pathname }).kind).toBe('continue');
    }
  });
});

describe('resolveHostRouting — on the console host', () => {
  const onAdmin = (pathname: string, search = '') =>
    route({ host: base.adminHost, pathname, search });

  it('opens the console from the bare subdomain', () => {
    expect(onAdmin('/')).toEqual({
      kind: 'redirect',
      url: 'https://admin.iskconelites.org/admin',
      permanent: false,
    });
  });

  it('serves the console, the API and the auth pages', () => {
    for (const pathname of ['/admin', '/admin/members', '/api/health', '/sign-in', '/_next/static/x.js']) {
      expect(onAdmin(pathname).kind).toBe('continue');
    }
  });

  it('sends public pages back to the public host, keeping the query string', () => {
    expect(onAdmin('/directory', '?q=delhi')).toEqual({
      kind: 'redirect',
      url: 'https://iskconelites.org/directory?q=delhi',
      permanent: false,
    });
  });

  it('falls back to the console when no public host is configured', () => {
    const result = resolveHostRouting({
      ...base,
      siteHost: null,
      host: base.adminHost,
      pathname: '/directory',
    });
    expect(result).toEqual({
      kind: 'redirect',
      url: 'https://admin.iskconelites.org/admin',
      permanent: false,
    });
  });

  it('does not confuse a path that merely starts with an allowed word', () => {
    expect(onAdmin('/administrators').kind).toBe('redirect');
  });
});

describe('resolveHostRouting — on the public host', () => {
  it('moves the console to its subdomain permanently', () => {
    expect(route({ pathname: '/admin/users', search: '?page=2' })).toEqual({
      kind: 'redirect',
      url: 'https://admin.iskconelites.org/admin/users?page=2',
      permanent: true,
    });
  });

  it('leaves every public page alone', () => {
    for (const pathname of ['/', '/directory', '/leadership', '/events']) {
      expect(route({ pathname }).kind).toBe('continue');
    }
  });

  it('ignores an unrecognised host rather than redirecting it somewhere', () => {
    // A preview deployment, or a health check hitting the origin by IP: the
    // safe answer is to serve the app, not to bounce the request off-host.
    expect(route({ host: 'preview-123.workers.dev', pathname: '/admin' }).kind).toBe('continue');
  });
});

describe('isAdminHost', () => {
  it('matches case-insensitively and only when configured', () => {
    expect(isAdminHost('ADMIN.iskconelites.org', 'admin.iskconelites.org')).toBe(true);
    expect(isAdminHost('iskconelites.org', 'admin.iskconelites.org')).toBe(false);
    expect(isAdminHost('admin.iskconelites.org', null)).toBe(false);
  });
});

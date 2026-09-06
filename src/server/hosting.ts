/**
 * Host routing, for running the console on its own subdomain.
 *
 * Pure: it takes a host and a path and returns what should happen to them, so
 * every rule below is unit-tested rather than discovered in production on a
 * domain that does not exist yet. `src/proxy.ts` supplies the request.
 *
 * The rules do NOT rewrite paths. `admin.example.org/admin/members` is a little
 * redundant to read, but the alternative — serving `/members` and rewriting it
 * to `/admin/members` — means every link in the console has to know which host
 * it was rendered on, and the first one that forgets sends a reviewer to a 404
 * on a domain nobody can test locally. The subdomain restricts and redirects;
 * it does not renumber the app.
 *
 * With `adminHost` unset, every function here returns `continue` — the app
 * behaves exactly as it did before a domain existed.
 */

export type HostRouting = { kind: 'continue' } | { kind: 'redirect'; url: string; permanent: boolean };

const CONTINUE: HostRouting = { kind: 'continue' };

/**
 * Paths the console genuinely needs on its own host.
 *
 * Sign-in is on this list deliberately: a session cookie set on the public host
 * is not sent to a subdomain unless it was scoped to the parent domain, so a
 * reviewer who is bounced to the public site to sign in comes back signed out.
 * `SESSION_COOKIE_DOMAIN` is the other half of that answer.
 */
const ADMIN_HOST_ALLOWED =
  /^\/(admin|api|sign-in|sign-out|sign-up|_next|favicon\.ico|icon|apple-icon|robots\.txt|sitemap\.xml|manifest\.webmanifest)(\/|$|\?)/;

/** Lower-cased, trailing dot removed. Ports are kept: they identify the origin. */
export function normaliseHost(host: string | null | undefined): string | null {
  if (!host) return null;
  const trimmed = host.trim().toLowerCase().replace(/\.$/, '');
  return trimmed.length > 0 ? trimmed : null;
}

/** The host part of a configured origin, e.g. "https://x.org/" -> "x.org". */
export function hostOf(origin: string | null | undefined): string | null {
  if (!origin) return null;
  try {
    return normaliseHost(new URL(origin).host);
  } catch {
    return normaliseHost(origin);
  }
}

export type HostRoutingInput = {
  host: string | null;
  pathname: string;
  search: string;
  /** e.g. "https". */
  protocol: string;
  /** The console's host. Null disables all of this. */
  adminHost: string | null;
  /** The public host, from NEXT_PUBLIC_SITE_URL. */
  siteHost: string | null;
};

export function resolveHostRouting(input: HostRoutingInput): HostRouting {
  const adminHost = normaliseHost(input.adminHost);
  if (!adminHost) return CONTINUE;

  const host = normaliseHost(input.host);
  const siteHost = normaliseHost(input.siteHost);
  const path = input.pathname + input.search;

  if (host === adminHost) {
    // The console's front door. Landing on the bare subdomain should open the
    // console, not the marketing site rendered on the wrong hostname.
    if (input.pathname === '/' || input.pathname === '') {
      return { kind: 'redirect', url: `${input.protocol}://${adminHost}/admin`, permanent: false };
    }

    if (ADMIN_HOST_ALLOWED.test(input.pathname)) return CONTINUE;

    // The public site is not served here. Without a public host configured
    // there is nowhere to send the reader, so the console is offered instead.
    return siteHost
      ? { kind: 'redirect', url: `${input.protocol}://${siteHost}${path}`, permanent: false }
      : { kind: 'redirect', url: `${input.protocol}://${adminHost}/admin`, permanent: false };
  }

  // On the public host the console has moved. Permanent, because the address
  // is now wrong rather than temporarily elsewhere — and a bookmark should
  // update itself.
  if (host === siteHost && /^\/admin(\/|$)/.test(input.pathname)) {
    return { kind: 'redirect', url: `${input.protocol}://${adminHost}${path}`, permanent: true };
  }

  return CONTINUE;
}

/** True when this request is being served on the console's own hostname. */
export function isAdminHost(host: string | null, adminHost: string | null): boolean {
  const configured = normaliseHost(adminHost);
  return configured !== null && normaliseHost(host) === configured;
}

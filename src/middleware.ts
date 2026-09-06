import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { hostOf, resolveHostRouting } from '@/server/hosting';

const SESSION_COOKIE = 'ien_session';

const ADMIN = /^\/(admin|api\/admin)(\/|$)/;
const DEV_ONLY = /^\/design-system(\/|$)/;

/**
 * Content Security Policy, with a fresh nonce per request.
 *
 * A static policy has to allow `'unsafe-inline'` for the scripts Next injects,
 * which is most of what CSP is for given away. A nonce lets those specific
 * scripts run and nothing else, and `'strict-dynamic'` extends that trust to
 * anything they load — so the allowlist does not have to enumerate chunks.
 *
 * Two subtleties worth recording:
 *
 *  - `style-src-attr 'unsafe-inline'` is separate and necessary. CSP3 governs
 *    style *attributes* independently of <style> blocks, and this app sets
 *    element styles from React props (the stagger index, view-transition-name).
 *    Without it every such element silently loses its style.
 *  - `'unsafe-eval'` is development-only: React uses eval there to rebuild
 *    server stacks in the browser. Neither React nor Next needs it in
 *    production.
 */
function contentSecurityPolicy(nonce: string, isDev: boolean): string {
  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    `style-src 'self' 'nonce-${nonce}'`,
    `style-src-attr 'unsafe-inline'`,
    `img-src 'self' blob: data: https://*.supabase.co https://*.cloudflarestorage.com https://lh3.googleusercontent.com`,
    `font-src 'self'`,
    `connect-src 'self'`,
    `media-src 'self' https://*.supabase.co`,
    `frame-src 'none'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    // Google is a form target for the OAuth handoff.
    `form-action 'self' https://accounts.google.com`,
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`,
  ].join('; ');
}

/**
 * Next 16 renamed the `middleware` convention to `proxy`.
 *
 * The dev-only branch runs before anything else: a 404 must be a real status,
 * and the gallery needs no session. The admin branch is a coarse gate — it
 * checks that a session cookie EXISTS and nothing more, because validating one
 * here would mean a database round trip on every request. The control is
 * `can(actor, 'admin:access')` in the admin layout (ADR-0029).
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Host policy first: if the console lives on its own subdomain, deciding
  // WHICH site this request belongs to has to happen before anything reasons
  // about the path. No-op until NEXT_PUBLIC_ADMIN_HOST is set.
  const routing = resolveHostRouting({
    host: req.headers.get('host'),
    pathname,
    search: req.nextUrl.search,
    protocol: (req.headers.get('x-forwarded-proto') ?? req.nextUrl.protocol.replace(':', '')) || 'https',
    adminHost: process.env.NEXT_PUBLIC_ADMIN_HOST ?? null,
    siteHost: hostOf(process.env.NEXT_PUBLIC_SITE_URL),
  });

  if (routing.kind === 'redirect') {
    return NextResponse.redirect(routing.url, routing.permanent ? 308 : 307);
  }

  if (DEV_ONLY.test(pathname)) {
    return process.env.NODE_ENV === 'production'
      ? new NextResponse(null, { status: 404 })
      : NextResponse.next();
  }

  if (ADMIN.test(pathname) && !req.cookies.get(SESSION_COOKIE)) {
    const signIn = new URL('/sign-in', req.url);
    signIn.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(signIn);
  }

  const nonce = btoa(crypto.randomUUID());
  const csp = contentSecurityPolicy(nonce, process.env.NODE_ENV === 'development');

  // Next reads `x-nonce` from the request and stamps it onto the script tags
  // it injects. Without this the page loads no JavaScript at all.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-nonce', nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);

  return response;
}

export const config = {
  matcher: [
    // Static assets are served straight from the CDN and need no policy.
    {
      source: '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
      missing: [{ type: 'header', key: 'next-router-prefetch' }],
    },
  ],
};

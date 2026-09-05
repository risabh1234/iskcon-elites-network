import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/server/auth/session';

const ADMIN = /^\/(admin|api\/admin)(\/|$)/;
const DEV_ONLY = /^\/design-system(\/|$)/;

/**
 * Next 16 renamed the `middleware` convention to `proxy`.
 *
 * This is a coarse gate only. It checks that a session cookie is *present* and
 * redirects if not — it does not validate the session or read a role, because
 * the proxy runs on every request and a database round trip here would tax the
 * whole site. Real authorisation is `can()` inside the services, and the admin
 * layout re-checks with a resolved Actor. A forged cookie gets past this line
 * and is refused by the next one.
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

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

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};

import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextFetchEvent, NextRequest } from 'next/server';

const isProtectedRoute = createRouteMatcher(['/admin(.*)', '/api/admin(.*)']);

// The component gallery is an internal review surface, not a page.
//
// Not named `_design`: a leading underscore marks a *private folder* in the App
// Router, which excludes the directory from routing entirely — the page would
// never have resolved to a URL at all.
const isDevOnlyRoute = createRouteMatcher(['/design-system(.*)']);

/**
 * Next 16 renamed the `middleware` convention to `proxy`. Clerk still ships
 * `clerkMiddleware` as its API — it returns a request handler — so only the file
 * and export name change.
 *
 * The dev-only branch runs *before* Clerk rather than inside it, for two reasons:
 * a 404 must be a real 404 status (a page calling notFound() streams its
 * response and so answers 200, which is a soft 404 a crawler will index), and
 * the gallery needs no session, so routing it through Clerk only buys a
 * handshake round trip.
 */
const withClerk = clerkMiddleware(async (auth, req: NextRequest) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }

  return NextResponse.next();
});

export function proxy(req: NextRequest, event: NextFetchEvent) {
  if (isDevOnlyRoute(req)) {
    return process.env.NODE_ENV === 'production'
      ? new NextResponse(null, { status: 404 })
      : NextResponse.next();
  }

  return withClerk(req, event);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};

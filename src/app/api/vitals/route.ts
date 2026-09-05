import { NextResponse } from 'next/server';
import { captureWebVital } from '@/server/observability/report';

/**
 * Receives Web Vitals from the browser.
 *
 * Unauthenticated by necessity — the metrics that matter most are from the
 * first visit, before anyone signs in. It therefore accepts a strictly bounded
 * shape and stores nothing: a public endpoint that writes to a table is a free
 * write primitive for anyone who finds it.
 */
const NAMES = new Set(['LCP', 'CLS', 'INP', 'FCP', 'TTFB']);

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (
    !body ||
    typeof body.name !== 'string' ||
    !NAMES.has(body.name) ||
    typeof body.value !== 'number' ||
    !Number.isFinite(body.value)
  ) {
    return new NextResponse(null, { status: 204 });
  }

  captureWebVital({
    name: body.name,
    value: body.value,
    rating: typeof body.rating === 'string' ? body.rating.slice(0, 20) : 'unknown',
    id: typeof body.id === 'string' ? body.id.slice(0, 64) : '',
  });

  return new NextResponse(null, { status: 204 });
}

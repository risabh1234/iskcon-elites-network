import { NextResponse } from 'next/server';
import { checkHealth } from '@/domain/system/service';

export const dynamic = 'force-dynamic';

/**
 * The uptime check.
 *
 * The body says nothing about versions, hostnames or connection strings: it is
 * public, and an unauthenticated endpoint is not the place to describe the
 * inside of the system.
 */
export async function GET() {
  const report = await checkHealth();

  return NextResponse.json(report, {
    status: report.status === 'ok' ? 200 : 503,
    headers: { 'Cache-Control': 'no-store' },
  });
}

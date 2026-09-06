import * as repo from './repository';

export type HealthReport = {
  status: 'ok' | 'degraded';
  checks: { database: 'ok' | 'unreachable' };
  latencyMs: number;
};

/**
 * Readiness, not just liveness.
 *
 * An app that answers 200 while its database is unreachable is an app whose
 * uptime monitor is lying, so the check goes all the way through.
 */
export async function checkHealth(): Promise<HealthReport> {
  const startedAt = Date.now();

  try {
    await repo.ping();
    return { status: 'ok', checks: { database: 'ok' }, latencyMs: Date.now() - startedAt };
  } catch (err) {
    console.error('Database health ping error stack:', err instanceof Error ? err.stack : err);
    return {
      status: 'degraded',
      checks: { database: 'unreachable' },
      latencyMs: Date.now() - startedAt,
    };
  }
}

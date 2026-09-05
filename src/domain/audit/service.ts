import { can, type Actor } from '@/server/policy';
import { forbidden } from '@/server/errors';
import { err, ok, type Result } from '@/server/result';
import * as repo from './repository';

/**
 * The audit trail.
 *
 * `record()` never throws and never returns a failure: an admin action that
 * succeeded must not be reported as failed because the log write did. A missing
 * audit row is a problem for the operator, not for the person who clicked the
 * button — so it is logged loudly to stderr and the mutation stands.
 */
export async function record(entry: repo.AuditEntry): Promise<void> {
  try {
    await repo.write(entry);
  } catch (cause) {
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'audit write failed',
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId ?? null,
        cause: cause instanceof Error ? cause.message : String(cause),
      }),
    );
  }
}

export type AuditLogDto = {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  at: string;
  actor: { id: string; name: string | null } | null;
};

export async function listAudit(
  actor: Actor,
  options: Parameters<typeof repo.list>[0] = {},
): Promise<Result<{ entries: AuditLogDto[]; nextCursor: string | null }>> {
  // Reading who did what is itself privileged.
  if (!can(actor, 'admin:access')) return err(forbidden());

  const { rows, nextCursor } = await repo.list(options);

  return ok({
    entries: rows.map((row) => ({
      id: row.id,
      action: row.action,
      entity: row.entity,
      entityId: row.entityId,
      at: row.at.toISOString(),
      // The actor's email is deliberately dropped: the console shows a name,
      // and an audit view is not a place to re-expose contact details.
      actor: row.actor ? { id: row.actor.id, name: row.actor.name } : null,
    })),
    nextCursor,
  });
}

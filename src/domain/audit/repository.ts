import prisma from '@/lib/prisma';

export type AuditEntry = {
  actorId: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
};

export async function write(entry: AuditEntry): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId: entry.actorId,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId ?? null,
      before: (entry.before ?? null) as never,
      after: (entry.after ?? null) as never,
      ip: entry.ip ?? null,
    },
  });
}

export async function list(options: {
  actorId?: string;
  entity?: string;
  entityId?: string;
  from?: Date;
  to?: Date;
  cursor?: string;
  limit?: number;
}) {
  const limit = Math.min(options.limit ?? 50, 200);

  const rows = await prisma.auditLog.findMany({
    where: {
      ...(options.actorId ? { actorId: options.actorId } : {}),
      ...(options.entity ? { entity: options.entity } : {}),
      ...(options.entityId ? { entityId: options.entityId } : {}),
      ...(options.from || options.to
        ? { at: { ...(options.from ? { gte: options.from } : {}), ...(options.to ? { lte: options.to } : {}) } }
        : {}),
    },
    select: {
      id: true, action: true, entity: true, entityId: true, at: true,
      actor: { select: { id: true, email: true, name: true } },
    },
    ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    take: limit + 1,
    orderBy: [{ at: 'desc' }, { id: 'desc' }],
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  return { rows: page, nextCursor: hasMore ? page[page.length - 1]!.id : null };
}

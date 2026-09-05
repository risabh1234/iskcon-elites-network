import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Badge, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, TableWrapper,
} from '@/components/primitives';
import { EmptyState, PageHeader } from '@/components/patterns';
import { getActor } from '@/server/auth';
import { listAudit } from '@/domain/audit/service';

export const metadata: Metadata = { title: 'Audit' };

type Props = { searchParams: Promise<{ entity?: string; cursor?: string; days?: string }> };

const ENTITIES = ['Member', 'Event', 'User'] as const;
const RANGES = [
  { days: '7', label: 'Last 7 days' },
  { days: '30', label: 'Last 30 days' },
  { days: '', label: 'All time' },
] as const;

/**
 * The log of who did what.
 *
 * This is what makes a console trustworthy: an administrator who can act
 * without a record is an administrator nobody can be held to. Filters are in
 * the URL so a specific view can be sent to someone else.
 */
export default async function AdminAuditPage({ searchParams }: Props) {
  const { entity, cursor, days } = await searchParams;

  const result = await listAudit(await getActor(), {
    entity: ENTITIES.includes(entity as never) ? entity : undefined,
    withinDays: days ? Number(days) : undefined,
    cursor,
    limit: 100,
  });
  if (!result.ok) throw new Error(result.error.message);

  const { entries, nextCursor } = result.value;
  const query = (next: Record<string, string>) =>
    `/admin/audit?${new URLSearchParams({ ...(entity ? { entity } : {}), ...(days ? { days } : {}), ...next }).toString()}`;

  return (
    <>
      <PageHeader title="Audit" lede="Every administrative change, with who made it and when." />

      <div className="mt-[var(--spacing-5)] flex flex-wrap gap-[var(--spacing-4)]">
        <Filter label="Entity" options={[{ value: '', label: 'Everything' }, ...ENTITIES.map((e) => ({ value: e, label: e }))]} active={entity ?? ''} build={(v) => query({ entity: v, cursor: '' })} />
        <Filter label="Period" options={RANGES.map((r) => ({ value: r.days, label: r.label }))} active={days ?? ''} build={(v) => query({ days: v, cursor: '' })} />
      </div>

      <div className="mt-[var(--spacing-5)]">
        {entries.length === 0 ? (
          <EmptyState
            title="Nothing recorded yet"
            description="Administrative changes are written here as they happen."
          />
        ) : (
          <>
            <TableWrapper>
              <Table>
                <TableHead>
                  <tr>
                    <TableHeaderCell>When</TableHeaderCell>
                    <TableHeaderCell>Who</TableHeaderCell>
                    <TableHeaderCell>Action</TableHeaderCell>
                    <TableHeaderCell>Entity</TableHeaderCell>
                  </tr>
                </TableHead>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <time dateTime={entry.at} data-numeric>
                          {new Intl.DateTimeFormat(undefined, {
                            dateStyle: 'medium', timeStyle: 'short',
                          }).format(new Date(entry.at))}
                        </time>
                      </TableCell>
                      {/* A deleted actor leaves their entries behind — the log
                          outlives the account, by design. */}
                      <TableCell className="text-ink">{entry.actor?.name ?? 'Removed account'}</TableCell>
                      <TableCell><Badge tone="outline">{entry.action}</Badge></TableCell>
                      <TableCell className="text-ink-subtle">
                        {entry.entity}
                        {entry.entityId ? ` · ${entry.entityId.slice(0, 8)}` : ''}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableWrapper>

            {nextCursor ? (
              <p className="mt-[var(--spacing-5)] text-center">
                <Link href={query({ cursor: nextCursor })}>Show older entries</Link>
              </p>
            ) : null}
          </>
        )}
      </div>
    </>
  );
}

function Filter({
  label, options, active, build,
}: {
  label: string;
  options: { value: string; label: string }[];
  active: string;
  build: (value: string) => string;
}) {
  return (
    <div>
      <p className="text-2xs uppercase tracking-wide text-ink-subtle">{label}</p>
      <ul className="mt-[var(--spacing-2)] flex list-none flex-wrap gap-[var(--spacing-2)] p-0">
        {options.map((option) => (
          <li key={option.value}>
            <Link href={build(option.value)} className="no-underline">
              <Badge tone={active === option.value ? 'accent' : 'outline'}>{option.label}</Badge>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

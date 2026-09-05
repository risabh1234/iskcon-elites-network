import type { Metadata } from 'next';
import {
  Badge, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, TableWrapper,
} from '@/components/primitives';
import { EmptyState, PageHeader } from '@/components/patterns';
import { getActor } from '@/server/auth';
import { listAssets } from '@/domain/media/service';

export const metadata: Metadata = { title: 'Media' };

function bytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Recorded assets.
 *
 * Uploads currently write to a public Supabase bucket and return a URL without
 * creating a `MediaAsset` row, so this table is empty on a live database. That
 * is stated plainly rather than papered over: Phase 7 moves uploads to R2 with
 * enforced crops and blurhash placeholders, and this page becomes useful then.
 */
export default async function AdminMediaPage() {
  const result = await listAssets(await getActor());
  if (!result.ok) throw new Error(result.error.message);

  const assets = result.value;

  return (
    <>
      <PageHeader
        title="Media"
        lede="Images recorded against the register."
        actions={<Badge tone="neutral">{assets.length} recorded</Badge>}
      />

      <div className="mt-[var(--spacing-5)]">
        {assets.length === 0 ? (
          <EmptyState
            title="No assets recorded"
            description="Uploads currently go straight to object storage without a database record. Phase 7 moves them to a pipeline with enforced crops and blurhash placeholders, and they will appear here."
          />
        ) : (
          <TableWrapper>
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>Key</TableHeaderCell>
                  <TableHeaderCell>Type</TableHeaderCell>
                  <TableHeaderCell align="end">Size</TableHeaderCell>
                  <TableHeaderCell align="end">Dimensions</TableHeaderCell>
                  <TableHeaderCell>Placeholder</TableHeaderCell>
                  <TableHeaderCell>Uploaded by</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {assets.map((asset) => (
                  <TableRow key={asset.id}>
                    <TableCell className="text-ink">{asset.key}</TableCell>
                    <TableCell>{asset.mime}</TableCell>
                    <TableCell align="end" data-numeric>{bytes(asset.bytes)}</TableCell>
                    <TableCell align="end" data-numeric>
                      {asset.width && asset.height ? `${asset.width}×${asset.height}` : '—'}
                    </TableCell>
                    <TableCell>
                      {asset.hasBlurhash ? <Badge tone="success">yes</Badge> : <Badge tone="outline">none</Badge>}
                    </TableCell>
                    <TableCell>{asset.uploadedBy ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableWrapper>
        )}
      </div>
    </>
  );
}

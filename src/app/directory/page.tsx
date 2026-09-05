import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Users } from 'lucide-react';
import { Badge, Button } from '@/components/primitives';
import { EmptyState, PageHeader, Section } from '@/components/patterns';
import { getActor } from '@/server/auth';
import { can } from '@/server/policy';
import { listFacets, listMembers, searchMembers, type Facets } from '@/domain/member/service';
import { parseDirectoryQuery, toSearchString, type RawSearchParams } from '@/lib/search-params';
import { DirectoryControls } from './DirectoryControls';
import { DirectoryGallery } from './DirectoryGallery';
import { DirectoryIndex } from './DirectoryIndex';
import { DirectorySkeleton } from './DirectorySkeleton';

export const metadata: Metadata = {
  title: 'Directory',
  description:
    'The register of the ISKCON Elites Network — alumni, speakers and mentors, searchable by field, city and name.',
};

type Props = { searchParams: Promise<RawSearchParams> };

export default async function DirectoryPage({ searchParams }: Props) {
  const query = parseDirectoryQuery(await searchParams);
  const actor = await getActor();
  const isReviewer = can(actor, 'member:read:unpublished');

  const facetsResult = await listFacets();
  const facets = facetsResult.ok ? facetsResult.value : { expertise: [], countries: [] };

  return (
    <Section>
      <PageHeader
        eyebrow="The register"
        title="Directory"
        lede="Accomplished people who share a tradition. Search by name, filter by field or city."
        actions={
          actor.kind === 'user' ? (
            <Button asChild variant="primary">
              <Link href="/directory/submit">Add an entry</Link>
            </Button>
          ) : (
            <Button asChild>
              <Link href="/sign-in?redirectTo=/directory">Sign in</Link>
            </Button>
          )
        }
      />

      <div className="mt-[var(--spacing-6)]">
        {/* Suspense keyed on the query so a filter change streams a fresh
            skeleton instead of holding the old list while the new one loads. */}
        <Suspense key={JSON.stringify(query)} fallback={<ControlsFallback />}>
          <Results query={query} isReviewer={isReviewer} facets={facets} />
        </Suspense>
      </div>
    </Section>
  );
}

function ControlsFallback() {
  return (
    <div className="mt-[var(--spacing-6)]">
      <DirectorySkeleton />
    </div>
  );
}

async function Results({
  query,
  isReviewer,
  facets,
}: {
  query: ReturnType<typeof parseDirectoryQuery>;
  isReviewer: boolean;
  facets: Facets;
}) {
  const actor = await getActor();

  // A text query goes through ranked search; everything else is a filtered
  // list. They are different queries and only one of them can be paginated by
  // cursor, so the branch is explicit rather than hidden in the repository.
  const searching = query.q.length > 0;

  const result = searching
    ? await searchMembers(actor, { q: query.q, limit: 60, includeUnpublished: isReviewer })
    : await listMembers(actor, {
        kind: query.kind ?? undefined,
        expertiseSlug: query.expertise ?? undefined,
        countryCode: query.country ?? undefined,
        cursor: query.cursor ?? undefined,
        sort: query.sort,
        limit: 24,
        includeUnpublished: isReviewer,
      });

  if (!result.ok) throw new Error(result.error.message);

  const { members: list, nextCursor } = result.value;

  return (
    <>
      <DirectoryControls query={query} facets={facets} total={list.length} />

      <div className="mt-[var(--spacing-6)]">
        {list.length === 0 ? (
          <EmptyResults query={query} facets={facets} />
        ) : query.view === 'index' ? (
          <DirectoryIndex members={list} />
        ) : (
          <DirectoryGallery members={list} />
        )}
      </div>

      {nextCursor ? (
        <nav aria-label="Pagination" className="mt-[var(--spacing-7)] flex justify-center">
          <Button asChild>
            <Link href={`/directory${toSearchString({ ...query, cursor: nextCursor })}`}>
              Show more
            </Link>
          </Button>
        </nav>
      ) : null}
    </>
  );
}

/**
 * A dead end is a bug. When nothing matches, offer the adjacent queries that
 * actually have people behind them rather than a shrug.
 */
function EmptyResults({
  query,
  facets,
}: {
  query: ReturnType<typeof parseDirectoryQuery>;
  facets: Facets;
}) {
  const suggestions = [
    ...facets.expertise.slice(0, 3).map((e) => ({
      label: e.label,
      href: `/directory${toSearchString({ expertise: e.slug })}`,
    })),
    ...facets.countries.slice(0, 2).map((c) => ({
      label: c.name,
      href: `/directory${toSearchString({ country: c.code })}`,
    })),
  ];

  return (
    <EmptyState
      icon={<Users className="size-[var(--spacing-7)]" />}
      title={query.q ? `Nothing matches “${query.q}”` : 'No members match those filters'}
      description="Spelling is forgiven — the search allows for it. Try a broader field, or a different city."
      action={
        <Button asChild variant="primary">
          <Link href="/directory">Clear all filters</Link>
        </Button>
      }
      suggestions={suggestions.map((s) => (
        <Link key={s.href} href={s.href} className="no-underline">
          <Badge tone="outline">{s.label}</Badge>
        </Link>
      ))}
    />
  );
}

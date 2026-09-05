/**
 * Directory filter state, encoded in the URL.
 *
 * Filters live in the query string, not in component state: that is what makes
 * a filtered view shareable, bookmarkable, and correct under the back button.
 * One module owns the parsing and the serialising so the server and the client
 * cannot disagree about what `?sort=recent` means.
 */
export type ViewMode = 'gallery' | 'index';
export type SortKey = 'name' | 'recent';

export type DirectoryQuery = {
  q: string;
  kind: 'ALUMNUS' | 'SPEAKER' | 'GUEST' | null;
  expertise: string | null;
  country: string | null;
  sort: SortKey;
  view: ViewMode;
  cursor: string | null;
};

export type RawSearchParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined): string | null =>
  (Array.isArray(v) ? v[0] : v)?.trim() || null;

export function parseDirectoryQuery(params: RawSearchParams): DirectoryQuery {
  const kind = first(params.kind)?.toUpperCase();
  const sort = first(params.sort);
  const view = first(params.view);

  return {
    q: first(params.q)?.slice(0, 200) ?? '',
    kind: kind === 'ALUMNUS' || kind === 'SPEAKER' || kind === 'GUEST' ? kind : null,
    expertise: first(params.expertise)?.slice(0, 80) ?? null,
    country: first(params.country)?.toUpperCase().slice(0, 2) ?? null,
    // Unknown values fall back to the default rather than erroring: a URL is
    // user input and may have been hand-edited or truncated.
    sort: sort === 'recent' ? 'recent' : 'name',
    view: view === 'index' ? 'index' : 'gallery',
    cursor: first(params.cursor)?.slice(0, 80) ?? null,
  };
}

/** Serialises back to a query string, omitting defaults so URLs stay short. */
export function toSearchString(query: Partial<DirectoryQuery>): string {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.kind) params.set('kind', query.kind);
  if (query.expertise) params.set('expertise', query.expertise);
  if (query.country) params.set('country', query.country);
  if (query.sort && query.sort !== 'name') params.set('sort', query.sort);
  if (query.view && query.view !== 'gallery') params.set('view', query.view);
  if (query.cursor) params.set('cursor', query.cursor);
  const s = params.toString();
  return s ? `?${s}` : '';
}

export function activeFilterCount(query: DirectoryQuery): number {
  return [query.q, query.kind, query.expertise, query.country].filter(Boolean).length;
}

import { revalidateTag, unstable_cache } from 'next/cache';

/**
 * Cache tags in one place, so a service invalidating "the member list" and a
 * page caching it cannot disagree about the spelling.
 *
 * Next 16 supersedes `unstable_cache` with the `use cache` directive, but that
 * is a Cache Components feature gated behind `cacheComponents: true`, which
 * changes rendering semantics for the whole app. Flipping it mid-rebuild would
 * land on the legacy pages that Phase 5 has not reached yet, so this stays on
 * the documented previous model until then (docs/DECISIONS.md ADR-0014).
 */
export const tags = {
  member: (id: string) => `member:${id}`,
  members: () => 'members',
  event: (id: string) => `event:${id}`,
  events: () => 'events',
  story: (id: string) => `story:${id}`,
  stories: () => 'stories',
  users: () => 'users',
};

/**
 * Wrap a read. `keyParts` must include every value the function closes over but
 * does not receive as an argument, or two different queries share a cache entry.
 */
export function cached<Args extends unknown[], T>(
  fn: (...args: Args) => Promise<T>,
  keyParts: string[],
  options: { tags: string[]; revalidate?: number },
) {
  return unstable_cache(fn, keyParts, {
    tags: options.tags,
    revalidate: options.revalidate ?? 300,
  });
}

/**
 * Invalidate after a write. The single-argument form of `revalidateTag` is
 * deprecated in Next 16; `'max'` gives stale-while-revalidate, so a write does
 * not make the next reader wait on a cold query.
 */
export function invalidate(...tagList: string[]) {
  for (const tag of tagList) {
    revalidateTag(tag, 'max');
  }
}

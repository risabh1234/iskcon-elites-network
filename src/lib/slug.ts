/**
 * URL slugs.
 *
 * Diacritics are folded rather than dropped so that Śrīvāsa becomes `srivasa`
 * and not `sr-v-sa` — the register is full of transliterated Sanskrit, and a
 * slug that mangles it is worse than no slug at all.
 */
export function slugify(input: string): string {
  const folded = input
    .normalize('NFKD')
    // Strip combining marks left behind by the decomposition.
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return folded || 'member';
}

/**
 * Finds a free slug by appending -2, -3, … The caller supplies the existence
 * check so this stays pure and testable.
 */
export async function uniqueSlug(
  base: string,
  exists: (candidate: string) => Promise<boolean>,
  limit = 50,
): Promise<string> {
  const stem = slugify(base);
  if (!(await exists(stem))) return stem;

  for (let n = 2; n <= limit; n += 1) {
    const candidate = `${stem}-${n}`;
    if (!(await exists(candidate))) return candidate;
  }

  // Beyond the limit, fall back to something that cannot collide rather than
  // looping forever.
  return `${stem}-${Date.now().toString(36)}`;
}

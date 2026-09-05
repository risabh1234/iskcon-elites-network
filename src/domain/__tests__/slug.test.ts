import { describe, expect, it, vi } from 'vitest';
import { slugify, uniqueSlug } from '@/lib/slug';

describe('slugify', () => {
  it('folds diacritics rather than dropping them', () => {
    // The register is full of transliterated Sanskrit. Dropping the marks would
    // turn Śrīvāsa into "sr-v-sa", which is worse than no slug at all.
    expect(slugify('Śrīvāsa Ṭhākura')).toBe('srivasa-thakura');
    expect(slugify('Rādhā Vallabha Dāsa')).toBe('radha-vallabha-dasa');
    expect(slugify('José Fernandes')).toBe('jose-fernandes');
  });

  it('collapses punctuation and trims stray separators', () => {
    expect(slugify("O’Brien, Anna  — (Dr.)")).toBe('o-brien-anna-dr');
    expect(slugify('  spaced  out  ')).toBe('spaced-out');
  });

  it('never returns an empty slug', () => {
    // A name in a script with no Latin equivalent must still get a URL.
    expect(slugify('日本語')).toBe('member');
    expect(slugify('---')).toBe('member');
    expect(slugify('')).toBe('member');
  });
});

describe('uniqueSlug', () => {
  it('returns the stem when it is free', async () => {
    expect(await uniqueSlug('Anna Novak', async () => false)).toBe('anna-novak');
  });

  it('appends a counter for a collision', async () => {
    const taken = new Set(['anna-novak', 'anna-novak-2']);
    expect(await uniqueSlug('Anna Novak', async (s) => taken.has(s))).toBe('anna-novak-3');
  });

  it('gives up on a suffix rather than looping forever', async () => {
    const slug = await uniqueSlug('Anna Novak', async () => true, 3);
    expect(slug.startsWith('anna-novak-')).toBe(true);
    expect(slug).not.toBe('anna-novak-2');
  });

  it('checks the stem before trying any suffix', async () => {
    const exists = vi.fn(async () => false);
    await uniqueSlug('Anna Novak', exists);
    expect(exists).toHaveBeenCalledTimes(1);
    expect(exists).toHaveBeenCalledWith('anna-novak');
  });
});

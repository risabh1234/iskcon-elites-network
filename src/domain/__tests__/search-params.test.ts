import { describe, expect, it } from 'vitest';
import { activeFilterCount, parseDirectoryQuery, toSearchString } from '@/lib/search-params';

describe('parseDirectoryQuery', () => {
  it('reads every filter from the query string', () => {
    const q = parseDirectoryQuery({
      q: 'mumbai', kind: 'speaker', expertise: 'medicine',
      country: 'in', sort: 'recent', view: 'index', cursor: 'm9',
    });
    expect(q).toEqual({
      q: 'mumbai', kind: 'SPEAKER', expertise: 'medicine',
      country: 'IN', sort: 'recent', view: 'index', cursor: 'm9',
    });
  });

  it('falls back to defaults for unknown values rather than throwing', () => {
    // A URL is user input and may have been hand-edited or truncated.
    const q = parseDirectoryQuery({ kind: 'nonsense', sort: 'sideways', view: 'carousel' });
    expect(q.kind).toBeNull();
    expect(q.sort).toBe('name');
    expect(q.view).toBe('gallery');
  });

  it('takes the first value when a parameter is repeated', () => {
    expect(parseDirectoryQuery({ q: ['first', 'second'] }).q).toBe('first');
  });

  it('treats blank and missing as the same', () => {
    expect(parseDirectoryQuery({ q: '   ', expertise: '' })).toMatchObject({ q: '', expertise: null });
  });

  it('caps the query length so a pathological URL cannot reach the database', () => {
    expect(parseDirectoryQuery({ q: 'x'.repeat(5000) }).q).toHaveLength(200);
  });
});

describe('toSearchString', () => {
  it('omits defaults so shared URLs stay short', () => {
    expect(toSearchString({ sort: 'name', view: 'gallery' })).toBe('');
  });

  it('round-trips a filtered view', () => {
    const original = parseDirectoryQuery({ q: 'anna', expertise: 'law', sort: 'recent' });
    expect(parseDirectoryQuery(
      Object.fromEntries(new URLSearchParams(toSearchString(original).slice(1))),
    )).toEqual(original);
  });

  it('escapes characters that would otherwise break the URL', () => {
    expect(toSearchString({ q: 'a&b=c d' })).toContain('q=a%26b%3Dc+d');
  });
});

describe('activeFilterCount', () => {
  it('counts only the filters a reader would think of as filters', () => {
    const q = parseDirectoryQuery({ q: 'x', country: 'IN', sort: 'recent', view: 'index' });
    // sort and view change presentation, not membership of the result set.
    expect(activeFilterCount(q)).toBe(2);
  });
});

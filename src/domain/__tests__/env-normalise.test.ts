import { describe, expect, it } from 'vitest';
import { describeEnvValue, normaliseEnvValue } from '@/server/env-value';

/**
 * The Cloudflare build failed on `NEXT_PUBLIC_SUPABASE_URL: Invalid URL`, and
 * the cause was two quote characters: dotenv strips the quotes around a value
 * in .env.local, and a hosting dashboard does not. These cover that paste and
 * the ones next to it.
 */
describe('normaliseEnvValue', () => {
  it('strips the quotes a dashboard paste carries over from .env.local', () => {
    expect(normaliseEnvValue('"https://abc.supabase.co"')).toBe('https://abc.supabase.co');
    expect(normaliseEnvValue("'https://abc.supabase.co'")).toBe('https://abc.supabase.co');
  });

  it('strips only one layer, and only when the quotes match', () => {
    // A mismatched pair is not a quoting mistake, it is part of the value.
    expect(normaliseEnvValue('"https://abc.supabase.co\'')).toBe('"https://abc.supabase.co\'');
    expect(normaliseEnvValue('""double""')).toBe('"double"');
  });

  it('trims whitespace, inside the quotes as well as outside', () => {
    expect(normaliseEnvValue('  https://abc.supabase.co  ')).toBe('https://abc.supabase.co');
    expect(normaliseEnvValue('" https://abc.supabase.co "')).toBe('https://abc.supabase.co');
    expect(normaliseEnvValue('https://abc.supabase.co\n')).toBe('https://abc.supabase.co');
  });

  it('treats blank as absent, so an empty dashboard field means "not configured"', () => {
    expect(normaliseEnvValue('')).toBeUndefined();
    expect(normaliseEnvValue('   ')).toBeUndefined();
    expect(normaliseEnvValue('""')).toBeUndefined();
    expect(normaliseEnvValue(undefined)).toBeUndefined();
  });

  it('leaves a well-formed value untouched', () => {
    const value = 'postgresql://u:p@db.example.co:6543/postgres?pgbouncer=true';
    expect(normaliseEnvValue(value)).toBe(value);
  });

  it('does not invent a scheme for a bare host', () => {
    // Guessing https:// here would silently point the app at a host nobody
    // named. It stays invalid, and the error message says what is missing.
    expect(normaliseEnvValue('abc.supabase.co')).toBe('abc.supabase.co');
  });
});

describe('normaliseEnvValue — invisible and typographic characters', () => {
  it('strips typographic quotes, which a dashboard renders identically to ASCII ones', () => {
    expect(normaliseEnvValue('\u201chttps://abc.supabase.co\u201d')).toBe('https://abc.supabase.co');
    expect(normaliseEnvValue('\u2018https://abc.supabase.co\u2019')).toBe('https://abc.supabase.co');
  });

  it('strips zero-width characters carried over from a copied web page', () => {
    expect(normaliseEnvValue('\u200bhttps://abc.supabase.co\u200b')).toBe('https://abc.supabase.co');
    expect(normaliseEnvValue('\ufeffhttps://abc.supabase.co')).toBe('https://abc.supabase.co');
  });

  it('sees through a zero-width space sitting between the quote and the value', () => {
    expect(normaliseEnvValue('"\u200bhttps://abc.supabase.co"')).toBe('https://abc.supabase.co');
  });

  it('does not strip a quote that only appears at one end', () => {
    expect(normaliseEnvValue('"https://abc.supabase.co')).toBe('"https://abc.supabase.co');
  });
});

describe('describeEnvValue', () => {
  it('shows a NEXT_PUBLIC_ value in full — it ships to every browser anyway', () => {
    expect(describeEnvValue('NEXT_PUBLIC_SUPABASE_URL', 'abc.supabase.co')).toContain(
      '"abc.supabase.co"',
    );
  });

  it('never prints a secret, only its shape', () => {
    const secret = 'postgresql://user:hunter2@db.example.co:6543/postgres';
    const described = describeEnvValue('DATABASE_URL', secret);
    expect(described).not.toContain('hunter2');
    expect(described).toContain(`${secret.length} characters`);
  });

  it('names the specific mistake, which is the part that does not render', () => {
    expect(describeEnvValue('NEXT_PUBLIC_SITE_URL', 'abc.example.org')).toContain('no https:// scheme');
    expect(describeEnvValue('NEXT_PUBLIC_SITE_URL', '"https://a.org"')).toContain('wrapping quotes');
    expect(describeEnvValue('NEXT_PUBLIC_SITE_URL', ' https://a.org ')).toContain('surrounding whitespace');
    expect(describeEnvValue('NEXT_PUBLIC_SITE_URL', 'https://a\u200b.org')).toContain('invisible characters');
  });

  it('answers the same way twice — the invisible-character check is not stateful', () => {
    // A /g/ regex advances lastIndex across calls to .test(), so the second
    // question about the same value would otherwise come back false.
    const value = 'https://a\u200b.org';
    expect(describeEnvValue('NEXT_PUBLIC_SITE_URL', value)).toContain('invisible characters');
    expect(describeEnvValue('NEXT_PUBLIC_SITE_URL', value)).toContain('invisible characters');
  });

  it('says so plainly when nothing was supplied', () => {
    expect(describeEnvValue('DATABASE_URL', undefined)).toBe('not set');
  });
});

import { describe, expect, it } from 'vitest';
import { normaliseEnvValue } from '@/server/env-value';

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

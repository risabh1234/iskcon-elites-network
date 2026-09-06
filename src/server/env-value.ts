/**
 * Normalises an environment variable as it was actually supplied, before
 * anything validates it, and describes one that failed.
 *
 * A `.env` file is parsed by dotenv, which strips surrounding quotes and
 * whitespace. A value typed into a hosting provider's dashboard is not: what
 * you paste is exactly what the process reads, invisible characters included.
 * Every mistake below produces the same unhelpful `Invalid URL`, and none of
 * them is visible in a dashboard field.
 *
 * Stripping one layer of matching quotes is unambiguous — no value this app
 * reads legitimately begins and ends with the same quote character. Typographic
 * quotes are included because a value that has been through a document, a chat
 * message or a notes app comes back with “ ” instead of " ", and the two are
 * indistinguishable at a glance.
 *
 * Blank after trimming is treated as absent, so a variable left empty in a
 * dashboard means "not configured" rather than "configured as nothing".
 *
 * This lives apart from env.ts because env.ts validates on import and throws
 * when the environment is incomplete — a pure string helper must not be
 * reachable only through a module that can refuse to load, which is also what
 * makes it testable.
 */

/** ASCII and typographic quote pairs, as [open, close]. */
const QUOTE_PAIRS: readonly (readonly [string, string])[] = [
  ["'", "'"],
  ['"', '"'],
  ['“', '”'], // “ ”
  ['‘', '’'], // ‘ ’
  ['«', '»'], // « »
];

/**
 * Zero-width and bidi characters. These survive a copy out of a rendered web
 * page or a PDF, occupy no visual space, and turn a correct URL into a string
 * that fails to parse with no observable difference.
 */
const INVISIBLE_CHARS = '\u200b-\u200d\u2060\ufeff\u00ad\u202a-\u202e\u2066-\u2069';
/** Global, for stripping. */
const INVISIBLE = new RegExp(`[${INVISIBLE_CHARS}]`, 'g');
/**
 * Non-global twin, for testing. `RegExp.test` on a /g/ regex advances
 * `lastIndex` and so alternates true/false across calls on the same instance —
 * a bug that only shows up on the second question you ask it.
 */
const HAS_INVISIBLE = new RegExp(`[${INVISIBLE_CHARS}]`);

function stripOneQuoteLayer(value: string): string {
  for (const [open, close] of QUOTE_PAIRS) {
    if (value.length >= 2 && value.startsWith(open) && value.endsWith(close)) {
      return value.slice(open.length, value.length - close.length);
    }
  }
  return value;
}

export function normaliseEnvValue(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;

  // Invisibles first: a zero-width space between the quote and the value would
  // otherwise stop the quote from being recognised as a quote.
  const cleaned = stripOneQuoteLayer(value.replace(INVISIBLE, '').trim()).trim();

  return cleaned.length > 0 ? cleaned : undefined;
}

/**
 * What to print about a value that failed validation.
 *
 * "Invalid URL" without the offending value has failed at the one job an
 * environment validator has: the reader cannot see the variable (it is in a
 * dashboard, on another machine) and cannot see what the process read, so they
 * are left guessing at exactly the characters that do not render.
 *
 * `NEXT_PUBLIC_*` values are shown in full — they are compiled into the
 * JavaScript every visitor downloads, so they are public by construction and
 * nothing is disclosed by printing one in a build log. Everything else is
 * described but never shown: a length and a diagnosis is enough to identify a
 * paste error in a connection string without putting the password in the log.
 */
export function describeEnvValue(key: string, value: string | undefined): string {
  if (value === undefined) return 'not set';

  const notes: string[] = [];
  if (value !== value.trim()) notes.push('surrounding whitespace');
  if (HAS_INVISIBLE.test(value)) notes.push('invisible characters');
  if (stripOneQuoteLayer(value.trim()) !== value.trim()) notes.push('wrapping quotes');
  if (/\s/.test(value.trim())) notes.push('an internal space or line break');
  if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(value.trim())) notes.push('no https:// scheme');

  const detail = notes.length > 0 ? ` — looks like ${notes.join(', ')}` : '';

  return key.startsWith('NEXT_PUBLIC_')
    ? `received ${JSON.stringify(value)}${detail}`
    : `received ${value.length} characters${detail}`;
}

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

/**
 * Detects and unpacks multiple environment variables that were accidentally
 * pasted into a single dashboard input field, e.g. when copying multiple lines
 * out of a .env file.
 */
export function unpackEmbeddedEnv(raw: string | undefined): {
  primary: string | undefined;
  extra: Record<string, string>;
} {
  if (!raw) return { primary: raw, extra: {} };
  const splitRegex = /(?:\r?\n|\s+)(?=[A-Z_][A-Z0-9_]*=)/;
  if (!splitRegex.test(raw)) {
    return { primary: raw, extra: {} };
  }
  const parts = raw.split(splitRegex);
  const primaryRaw = parts[0].replace(INVISIBLE, '').trim();
  const primary = stripOneQuoteLayer(primaryRaw).replace(/^['"“‘«]+|['"”’»]+$/g, '').trim();
  const extra: Record<string, string> = {};
  for (let i = 1; i < parts.length; i++) {
    const eq = parts[i].indexOf('=');
    if (eq > 0) {
      const k = parts[i].slice(0, eq).trim();
      let v = parts[i].slice(eq + 1).replace(INVISIBLE, '').trim();
      v = stripOneQuoteLayer(v).replace(/^['"“‘«]+|['"”’»]+$/g, '').trim();
      extra[k] = v;
    }
  }
  return { primary: primary.length > 0 ? primary : undefined, extra };
}

export function normaliseEnvValue(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;

  // Handle multi-variable pastes into a single field
  const { primary } = unpackEmbeddedEnv(value);
  if (primary === undefined) return undefined;

  // Invisibles first: a zero-width space between the quote and the value would
  // otherwise stop the quote from being recognised as a quote.
  const cleaned = stripOneQuoteLayer(primary.replace(INVISIBLE, '').trim()).trim();

  return cleaned.length > 0 ? cleaned : undefined;
}

/**
 * Content that must never reach a log, wherever it is found.
 *
 * This list exists because of a specific incident, and the reasoning that
 * produced it was wrong in an instructive way. The first version of this
 * function printed `NEXT_PUBLIC_*` values in full, on the argument that they
 * are compiled into the JavaScript every visitor downloads and so disclose
 * nothing. That is true of a *correctly set* public variable. It is not true of
 * a misconfigured one: a `NEXT_PUBLIC_SUPABASE_URL` field that had four
 * variables pasted into it contained a `service_role` key, and printing the
 * value put that key in a CI log.
 *
 * The rule that replaces it: a variable's name says where it is *meant* to go,
 * never what it *contains*. Redaction is by content, applied to every value
 * regardless of which schema it belongs to.
 */
const SECRET_SHAPES: readonly RegExp[] = [
  // JSON Web Tokens — Supabase anon and service_role keys, among others.
  /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g,
  // Anything introduced as a key, secret, token or password.
  /\b[A-Za-z0-9_]*(?:KEY|SECRET|TOKEN|PASSWORD|CREDENTIAL)[A-Za-z0-9_]*\s*=\s*\S+/gi,
  // Credentials embedded in a connection string.
  /:\/\/[^:@/\s]+:[^@/\s]+@/g,
];

/** A second variable assignment inside one value: the paste that caused this. */
const LOOKS_LIKE_MULTIPLE = /\s[A-Za-z_][A-Za-z0-9_]*\s*=/;

const PREVIEW_LIMIT = 60;

function redact(value: string): string {
  return SECRET_SHAPES.reduce(
    (acc, pattern) => acc.replace(pattern, '[redacted]'),
    value,
  );
}

/**
 * What to print about a value that failed validation.
 *
 * "Invalid URL" without any description of the offending value has failed at
 * the one job an environment validator has: the variable lives in a dashboard
 * on another machine, so the reader cannot see what the process read and is
 * left guessing at precisely the characters that do not render.
 *
 * So it describes, and it redacts by content first (see SECRET_SHAPES). What
 * survives is a short preview, a length, and the specific diagnosis — enough to
 * recognise a paste error, never enough to leak the thing that was pasted.
 */
export function describeEnvValue(key: string, value: string | undefined): string {
  if (value === undefined) return 'not set';

  const trimmed = value.trim();

  // Notes are taken from the original: redaction removes the very evidence
  // that identifies the mistake.
  const notes: string[] = [];
  if (LOOKS_LIKE_MULTIPLE.test(trimmed)) {
    notes.push('SEVERAL VARIABLES PASTED INTO ONE FIELD — set them separately');
  }
  if (value !== trimmed) notes.push('surrounding whitespace');
  if (HAS_INVISIBLE.test(value)) notes.push('invisible characters');
  if (stripOneQuoteLayer(trimmed) !== trimmed) notes.push('wrapping quotes');
  if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(trimmed)) notes.push('no https:// scheme');

  const safe = redact(trimmed);
  const preview =
    safe.length > PREVIEW_LIMIT ? `${safe.slice(0, PREVIEW_LIMIT)}…` : safe;

  const detail = notes.length > 0 ? `\n      looks like ${notes.join(', ')}` : '';

  // Secrets are described but never previewed, even redacted: the schema a
  // variable belongs to is a weaker signal than its content, and this is the
  // belt to redaction's braces.
  return key.startsWith('NEXT_PUBLIC_')
    ? `received ${value.length} characters: ${JSON.stringify(preview)}${detail}`
    : `received ${value.length} characters${detail}`;
}

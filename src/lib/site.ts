/**
 * The canonical origin.
 *
 * Read from the environment so that a preview deployment does not advertise
 * production URLs in its sitemap and OG tags — a preview that claims to be the
 * live site gets itself indexed in place of it.
 */
export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured && configured.length > 0) return configured.replace(/\/$/, '');
  return 'http://localhost:3000';
}

export const SITE_NAME = 'ISKCON Elites Network';

/**
 * Brand colours for contexts that cannot read CSS.
 *
 * Browser chrome, the web app manifest and OG image rendering are all consumed
 * outside the stylesheet, so a token reference is not available to them. This
 * is the ONE place those values are duplicated, and they must mirror
 * `--color-paper` and `--color-ink` in src/styles/tokens.css.
 */
export const BRAND = {
  paper: '#FAF9F7', // design-literal-allow: mirrors --color-paper
  ink: '#12110F', // design-literal-allow: mirrors --color-ink
  inkMuted: '#5B574F', // design-literal-allow: mirrors --color-ink-muted
  line: '#E4E0D8', // design-literal-allow: mirrors --color-line
  accent: '#A2571B', // design-literal-allow: mirrors --color-accent
} as const;

/**
 * Geometry for generated images.
 *
 * OG cards and icons are rasterised at fixed pixel dimensions by satori, which
 * resolves neither CSS custom properties nor rem — the output is a PNG, not a
 * document. These are the only pixel values outside tokens.css, and they exist
 * because the medium requires them.
 */
export const OG = {
  size: { width: 1200, height: 630 },
  pad: '80px', // design-literal-allow: raster output, no CSS context
  rule: { height: 8, width: 160 }, // design-literal-allow
} as const;

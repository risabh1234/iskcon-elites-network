import localFont from 'next/font/local';

/**
 * Three families, self-hosted. No request ever leaves for fonts.googleapis.com —
 * on Workers that would cost a cold connection on every render, and it leaks the
 * reader's IP to a third party for no benefit.
 *
 * Latin and Latin Extended are loaded as separate faces rather than one merged
 * file. That is deliberate: IAST transliteration of Sanskrit (ā ī ū ṛ ṣ ś ṭ ḍ ṇ ṃ ḥ)
 * lives in Latin Extended, so a member named Śrīvāsa renders correctly only if that
 * face is present. CSS font matching falls back *per glyph*, so listing the base
 * face first and the extended face second in `--font-*` means the extended file is
 * fetched only when a page actually contains one of those characters.
 */

// Text face. The only one preloaded — it is what the reader sees first.
const interLatin = localFont({
  src: './fonts/inter-latin.woff2',
  weight: '100 900',
  style: 'normal',
  display: 'swap',
  variable: '--font-inter',
  preload: true,
  adjustFontFallback: 'Arial',
  fallback: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Helvetica Neue', 'sans-serif'],
});

const interLatinExt = localFont({
  src: './fonts/inter-latin-ext.woff2',
  weight: '100 900',
  style: 'normal',
  display: 'swap',
  variable: '--font-inter-ext',
  preload: false,
  adjustFontFallback: 'Arial',
});

// Display face. Not preloaded: headings are large, so a swap is far less
// disruptive than the bytes would be on a first paint.
const newsreaderLatin = localFont({
  src: [
    { path: './fonts/newsreader-latin.woff2', style: 'normal' },
    { path: './fonts/newsreader-latin-italic.woff2', style: 'italic' },
  ],
  weight: '200 800',
  display: 'swap',
  variable: '--font-newsreader',
  preload: false,
  adjustFontFallback: 'Times New Roman',
  fallback: ['Iowan Old Style', 'Georgia', 'serif'],
});

const newsreaderLatinExt = localFont({
  src: [
    { path: './fonts/newsreader-latin-ext.woff2', style: 'normal' },
    { path: './fonts/newsreader-latin-ext-italic.woff2', style: 'italic' },
  ],
  weight: '200 800',
  display: 'swap',
  variable: '--font-newsreader-ext',
  preload: false,
  adjustFontFallback: 'Times New Roman',
});

// Devanagari companion, for Sanskrit set in its own script. Correctness, not decoration:
// without it the browser substitutes whatever it has and the conjuncts break.
const notoSerifDevanagari = localFont({
  src: './fonts/noto-serif-devanagari.woff2',
  weight: '100 900',
  style: 'normal',
  display: 'swap',
  variable: '--font-deva-face',
  preload: false,
  adjustFontFallback: 'Times New Roman',
});

/** Applied to <html> in the root layout. */
export const fontVariables = [
  interLatin.variable,
  interLatinExt.variable,
  newsreaderLatin.variable,
  newsreaderLatinExt.variable,
  notoSerifDevanagari.variable,
].join(' ');

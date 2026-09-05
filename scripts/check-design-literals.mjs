#!/usr/bin/env node
/**
 * Fails the build when a design value is hardcoded outside src/styles/tokens.css.
 *
 * Rule 2 in CLAUDE.md: never hardcode a colour, spacing value, radius or
 * duration. Tokens are the vocabulary; an inlined value is a word nobody else
 * can use and nobody will find again.
 *
 * The legacy allowlist below is the honest part. The pre-rebuild pages contain
 * hundreds of literals and Phase 5 rewrites them wholesale, so blocking on them
 * today would mean a red build for weeks and a check everyone learns to skip.
 * Instead the check is strict everywhere else and the allowlist only ever
 * shrinks — deleting an entry is part of finishing the phase that owns it.
 *
 * A single line may opt out with a `design-literal-allow` comment where a JS
 * literal is genuinely unavoidable (browser chrome, OG image rendering).
 *
 * Usage: node scripts/check-design-literals.mjs
 */

import { readFileSync } from 'node:fs';

import { join, relative } from 'node:path';
import { readdirSync, statSync } from 'node:fs';

const ROOT = process.cwd();
const SCAN_DIR = join(ROOT, 'src');

/** Files exempt because they *are* the source of truth. */
const TOKEN_FILES = new Set(['src/styles/tokens.css']);

/**
 * Pre-rebuild files, each tied to the phase that deletes or rewrites it.
 * Do not add to this list. Removing entries is the goal.
 */
const LEGACY = new Map([
  ['src/styles/legacy.css', 'Phase 5.4 — deleted with the home page marquee'],
  ['src/app/page.tsx', 'Phase 5.4'],
  ['src/app/about/page.tsx', 'Phase 5.5'],
  ['src/app/mentorship/page.tsx', 'Phase 5.5'],
  ['src/app/success-stories/page.tsx', 'Phase 5.5'],
  ['src/app/events/page.tsx', 'Phase 5.3'],
  ['src/app/events/AddEventModal.tsx', 'Phase 5.3'],
  ['src/app/events/EditEventModal.tsx', 'Phase 5.3'],
  ['src/app/directory/page.tsx', 'Phase 5.1'],
  ['src/app/directory/DirectoryClient.tsx', 'Phase 5.1'],
  ['src/app/directory/AddEntryModal.tsx', 'Phase 5.1'],
  ['src/app/directory/EditEntryModal.tsx', 'Phase 5.1'],
  ['src/app/directory/[id]/page.tsx', 'Phase 5.2'],
  ['src/app/admin/page.tsx', 'Phase 6'],
  ['src/app/admin/layout.tsx', 'Phase 6'],
  ['src/app/sign-in/[[...sign-in]]/page.tsx', 'Phase 5.5'],
  ['src/app/sign-up/[[...sign-up]]/page.tsx', 'Phase 5.5'],
  ['src/components/layout/Header.tsx', 'Phase 2'],
  ['src/components/layout/Footer.tsx', 'Phase 2'],
]);

const RULES = [
  {
    id: 'hex-colour',
    // #abc / #aabbcc / #aabbccdd
    re: /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g,
    hint: 'use a colour token',
  },
  {
    id: 'raw-px',
    // 12px, 1.5px — but not inside a var() fallback or a token definition
    re: /(?<![\w-])\d+(?:\.\d+)?px\b/g,
    hint: 'use a spacing, radius or text token',
  },
  {
    id: 'raw-duration',
    re: /(?<![\w-])\d+(?:\.\d+)?ms\b/g,
    hint: 'use a duration token',
  },
  {
    id: 'rgb-colour',
    re: /\b(?:rgba?|hsla?)\s*\(/g,
    hint: 'use a colour token',
  },
  {
    id: 'oversized-radius',
    // An arbitrary radius referencing a var() token is correct usage;
    // an arbitrary radius holding a literal length is not.
    re: /\brounded-(?:2xl|3xl|\[(?!var\()[^\]]*\])/g,
    // NB: never write a literal utility class in a hint. Tailwind scans this
    // file and will happily compile the example into real (invalid) CSS.
    hint: 'radii are 2, 4 or 6 — use a radius token, or rounded-full for pills',
  },
  {
    id: 'gradient-fill',
    re: /\bbg-gradient-to-|\blinear-gradient\(|\bradial-gradient\(/g,
    hint: 'the direction forbids gradient fills',
  },
];

const EXTENSIONS = new Set(['.ts', '.tsx', '.css', '.mjs']);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === 'node_modules' || entry === 'fonts') continue;
      walk(full, out);
    } else if ([...EXTENSIONS].some((e) => entry.endsWith(e))) {
      out.push(full);
    }
  }
  return out;
}

const violations = [];
let skipped = 0;

for (const file of walk(SCAN_DIR)) {
  const rel = relative(ROOT, file).split('\\').join('/');
  if (TOKEN_FILES.has(rel)) continue;
  if (LEGACY.has(rel)) {
    skipped += 1;
    continue;
  }

  const lines = readFileSync(file, 'utf8').split('\n');

  lines.forEach((line, i) => {
    if (line.includes('design-literal-allow')) return;

    for (const rule of RULES) {
      rule.re.lastIndex = 0;
      const match = rule.re.exec(line);
      if (match) {
        violations.push({
          file: rel,
          line: i + 1,
          rule: rule.id,
          hint: rule.hint,
          text: line.trim().slice(0, 100),
        });
      }
    }
  });
}

if (violations.length > 0) {
  console.error(`\n✖ ${violations.length} design literal(s) found outside src/styles/tokens.css\n`);
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  [${v.rule}]`);
    console.error(`    ${v.text}`);
    console.error(`    → ${v.hint}\n`);
  }
  console.error('Every colour, size, radius and duration comes from a token. Add the token.\n');
  process.exit(1);
}

console.log(`✔ no design literals outside tokens.css (${skipped} legacy files skipped, see scripts/check-design-literals.mjs)`);

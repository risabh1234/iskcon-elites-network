#!/usr/bin/env node
/**
 * Runs axe-core against the component gallery and any other route given on the
 * command line. The gallery is the highest-value target: every primitive in
 * every state on one page means one run covers the whole library.
 *
 * Usage:
 *   npm run dev                      # in another shell
 *   node scripts/a11y-check.mjs      # defaults to /design-system
 *   node scripts/a11y-check.mjs /directory /events
 */

import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';

const BASE = process.env.A11Y_BASE_URL ?? 'http://localhost:3000';
const routes = process.argv.slice(2);
const targets = routes.length > 0 ? routes : ['/design-system'];

const browser = await chromium.launch();
// axe-core/playwright requires pages created from an explicit context.
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
let failures = 0;

for (const route of targets) {
  const page = await context.newPage();
  const url = `${BASE}${route}`;

  const response = await page.goto(url, { waitUntil: 'networkidle' });
  const status = response?.status() ?? 0;

  // A 404 or a 403 still renders a page, and those pages need auditing as much
  // as any other — arguably more, since they are what people meet when
  // something has already gone wrong. Only a server error or no response at all
  // means there is nothing to scan.
  if (!response || status >= 500) {
    console.error(`✖ ${route} — HTTP ${status || 'no response'}`);
    failures += 1;
    await page.close();
    continue;
  }

  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  if (violations.length === 0) {
    console.log(`✔ ${route} — no violations${status === 200 ? '' : ` (HTTP ${status})`}`);
  } else {
    failures += violations.length;
    console.error(`\n✖ ${route} — ${violations.length} violation(s)\n`);
    for (const v of violations) {
      console.error(`  [${v.impact}] ${v.id}: ${v.help}`);
      console.error(`    ${v.helpUrl}`);
      for (const node of v.nodes.slice(0, 3)) {
        console.error(`    → ${node.target.join(' ')}`);
        console.error(`      ${node.failureSummary?.split('\n').join('\n      ')}`);
      }
      console.error('');
    }
  }

  await page.close();
}

await context.close();
await browser.close();
process.exit(failures > 0 ? 1 : 0);

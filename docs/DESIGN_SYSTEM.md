# Design system

**"Quiet Institution" — authority is demonstrated by what you leave out.**

## The one rule

Every colour, spacing value, radius, duration and easing curve comes from `src/styles/tokens.css`.
Nothing else in `src/` may contain a hex colour, a raw `px`, or a raw `ms`.

`npm run check:design` enforces it and runs first in CI. It started with 19 exempt files and now has
**none**. Two escape hatches exist, both requiring a stated reason:

- `design-literal-allow` on a single line.
- `design-literal-allow-file: <reason>` for a whole file, where the *medium* cannot reference a
  stylesheet — email HTML, which no client resolves custom properties in.

Values needed outside CSS (OG images, the manifest, browser chrome) come from `BRAND` and `OG` in
`src/lib/site.ts`, the one permitted duplication, each marked as mirroring a specific token.

The checker reads code, not comments, for *value* rules — but whole lines for *class-name* rules,
because Tailwind v4 scans comments for class candidates and really will compile one out of a
comment. That is not hypothetical; it broke every page during Phase 2.

## Tokens

| Axis | Decision |
|---|---|
| Canvas | Warm near-white `--color-paper` `#FAF9F7`. Never pure white. |
| Ink | Warm near-black `--color-ink` `#12110F`. Never `#000`. |
| Accent | One: `--color-accent` `#A2571B`. ≤1 control per viewport, ≤5% of surface, never a gradient. 5.1:1 on paper. |
| Type | Newsreader (display) · Inter (text) · Noto Serif Devanagari. Self-hosted; Latin and Latin-Ext load separately so IAST renders. |
| Space | `--spacing-1…12`. Tailwind's namespace, so `p-5` resolves to *this* scale. |
| Radii | 2 / 4 / 6px, or fully round. Nothing between. |
| Depth | 1px hairlines at ~10% ink. Two shadows, both nearly invisible, never coloured. |
| Motion | 120 / 180 / 240 / 320ms. Nothing longer. |

`--color-ink-faint` is for **disabled text and decorative icons only** — it cannot reach 4.5:1 and
stay faint. Placeholders and captions use `--color-ink-subtle`, which was darkened to `#6F6A5E`
after axe measured the original at 3.49:1.

## Components

`primitives/` are the vocabulary — behaviour and accessibility from Radix, styling ours via CVA.
**Do not install a component kit**: shadcn/ui is fine to read and copy from, but as a dependency it
imports someone else's design opinions. Combobox and Command have no Radix equivalent and are built
here on the WAI-ARIA combobox pattern.

`patterns/` composes those. Pages assemble patterns; if a page is inventing layout, the missing
thing is a pattern.

`/design-system` renders every component in every state. It is the review surface — check a change
there before checking it in a page. Dev-only: the proxy answers 404 in production.

## Non-negotiable

Delete on sight: custom cursors · gradient-filled headlines · `rounded-2xl`/`3xl` as a default ·
emoji as iconography · glassmorphism · a third typeface · **fabricated statistics or members** ·
carousels for primary content · centred paragraphs over 66ch.

That fabrication rule is load-bearing. The home page this replaced seeded itself with three invented
people complete with invented quotes. If the register cannot be read, the section renders nothing.

## Accessibility

WCAG 2.1 AA, verified with axe on every route including 404 and error pages — those are what people
meet when something has already gone wrong. Currently **zero violations across ten routes**.

Standing rules learned the hard way:

- Anchors are **underlined by default**; chrome opts out with `no-underline`. Colour alone is not a
  distinguishable link (2.62:1 failed on the sign-in page).
- Every list needs a designed empty state that suggests a next action. A dead end is a bug.
- Every skeleton matches the final geometry exactly, or it trades a blank frame for a layout shift.
- `prefers-reduced-motion` removes motion, including `::view-transition-*`, which the `*` selector
  does not reach.

`npm run check:a11y <routes…>` runs it. `npm run dev` must be up.

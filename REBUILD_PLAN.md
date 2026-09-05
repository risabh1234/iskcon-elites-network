# ISKCON Elites Network — Rebuild to International Standard

**A staged engineering + design plan, written to be executed by Claude Code.**

Version 1.0 · Prepared 5 Sep 2026
Repo: `iskcon-elites-network-main` · Next.js 15 App Router · React 19 · Prisma/Postgres · Clerk · R2/S3 · OpenNext → Cloudflare Workers

---

## How to use this document

This is not a description. It is a work order. Each phase has:

- **Why** — the failure it fixes
- **Do** — the concrete changes
- **Accept** — objective pass/fail criteria
- **Prompt** — a block you paste into Claude Code verbatim to execute that phase

Run phases **in order**. Do not start Phase 2 before Phase 1 passes acceptance. Each phase is one PR. The whole point of the sequencing is that later phases are cheap *because* earlier phases removed the need to make the same decision twice.

> **Note on provenance.** This plan was written from a complete file-tree audit (paths, sizes, structure) but the file *contents* could not be read from the authoring environment. Phase 0 exists to verify the ~8 assumptions this plan rests on. If Phase 0 contradicts something here, Phase 0 wins — amend the plan, don't work around it.

---

## Part I — Diagnosis

### Why it reads as a "$10k website"

The instinct is right, and the cause is not talent — it's the absence of a **system**. Cheapness in web design is almost never one ugly thing. It is the accumulated cost of every decision being made locally, in the file where it happens, with no shared vocabulary. The evidence is structural and visible without opening a single file:

| Signal | Evidence in the repo | What it produces |
|---|---|---|
| **No design system** | `src/app/globals.css` is **1,010 bytes** | Every page invents its own spacing, colour, type size. Nothing rhymes. |
| **No component layer** | `src/components/` contains exactly three files: `layout/Header.tsx`, `layout/Footer.tsx`, `CustomCursor.tsx` | No `Button`, `Input`, `Dialog`, `Card`, `Table`. Every surface re-solves solved problems, slightly differently. |
| **Monolithic pages** | `admin/page.tsx` = **33 KB**, `events/page.tsx` = 14 KB, `page.tsx` = 12 KB | Unreviewable, untestable, unchangeable. Nobody refines a 33 KB file — they add to it. |
| **Copy-paste duplication** | `AddEntryModal.tsx` (10,807 B) and `EditEntryModal.tsx` (10,704 B) — a 103-byte delta | Two sources of truth for one form. They will drift. |
| **Template residue** | `public/` still ships `next.svg`, `vercel.svg`, `file.svg`, `globe.svg`, `window.svg` | The literal starter kit, unremoved. This is the tell. |
| **Gimmick over craft** | `CustomCursor.tsx` (4.4 KB) | A custom cursor is the single most reliable marker of a template site. Apple, Google, Stripe, Sotheby's — none use one. |
| **No state architecture** | No `loading.tsx`, `error.tsx`, `not-found.tsx` anywhere in `src/app/` | Every slow network or failed fetch shows a blank frame. Premium products are judged on their *unhappy* paths. |
| **Fat route handlers** | `api/directory/route.ts` 4 KB, `api/users/route.ts` 3 KB, no `domain/` or `services/` layer | Auth checks, validation, business rules and SQL all in the HTTP adapter. Untestable, and authorisation gets forgotten one route at a time. |
| **No validation layer** | No zod/valibot in the tree; no `lib/validations` | Request bodies trusted. This is a security posture, not a style issue. |
| **Build output in git** | `.open-next/` is committed — 2 MB `handler.mjs`, bundled `node_modules` | Every PR diff is noise. Review dies. |
| **No agent context** | `CLAUDE.md` is **11 bytes** | Claude Code re-derives the whole project on every session. |

### The design diagnosis, stated plainly

A site feels expensive when it demonstrates **restraint under confidence**. Cheap sites are loud because loudness is cheaper than precision. Concretely, the things that will be making this feel like a template:

1. **Saturated colour used as fill.** Saffron/orange gradients across heroes and buttons. Premium brands use their accent at under 5% of visible surface area — as a rule, on one control per screen and nowhere else.
2. **Default type at default sizes.** No optical sizing, no tracking correction at display sizes, no measure discipline. Headlines set at `text-5xl font-bold` with default letter-spacing look like a framework, because they are one.
3. **Large radii everywhere.** `rounded-2xl` / `rounded-3xl` on every card reads friendly-consumer-SaaS, not institution. Serious surfaces sit at 2–6px, or fully round for pills only.
4. **Depth via shadow and glass.** Coloured shadows, blur panels, glow. Institutions use *hairlines* — 1px borders at 8–12% ink — and near-invisible shadows.
5. **No spatial rhythm.** Section padding chosen per-section. The eye reads the irregularity as amateurism even when it can't name it.
6. **No photography discipline.** Either no imagery, or mixed-source images at mixed crops and mixed colour temperature. One inconsistent grade undoes an otherwise good page.
7. **Motion that decorates rather than explains.** Hover-scale on cards, fade-in-on-scroll everywhere. Good motion is short (120–320ms), physical, and tells you where something came from.

### The engineering diagnosis

The frontend problem is visible. The backend problem is worse and will bite later:

- **Authorisation is scattered.** With `api/users/[id]/role`, `api/users/[id]/permissions`, `api/directory/[id]/approve` and `actions/admin.ts` all existing separately and no policy module, the permission rules live in N places. The Nth+1 endpoint is where the breach happens.
- **No boundary between HTTP and domain.** Route handlers talking to Prisma directly means business rules cannot be unit-tested, reused by Server Actions, or invoked from a script.
- **No caching model.** On Cloudflare Workers with OpenNext, an uncached directory query per request is both slow and expensive. There is no tag-based revalidation in evidence.
- **No search infrastructure.** A directory is a search product. `WHERE name ILIKE '%q%'` does not scale past a few hundred rows and cannot rank.
- **No observability.** When it breaks in production for a member in Melbourne at 3am, you will find out from a WhatsApp message.

---

## Part II — The target

### Positioning

This is not a community website. It is the **register of an institution** — a curated network of accomplished people who share a tradition. The nearest reference points are not other nonprofit sites. They are:

- **Monocle / The Row** — editorial restraint, serif authority, generous air
- **Sotheby's / Christie's** — the directory-as-catalogue, photography-forward, dense but calm
- **Stripe / Linear** — interaction craft, state completeness, motion discipline
- **Apple Newsroom** — typographic hierarchy that works at every breakpoint without decoration

### Design direction: **"Quiet Institution"**

The governing idea: *authority is demonstrated by what you leave out.*

| Axis | Decision |
|---|---|
| **Canvas** | Warm near-white paper (`#FAF9F7`), never pure white. Ink is warm near-black (`#12110F`), never `#000`. |
| **Accent** | A single deep saffron-copper (`#B45309`-family, desaturated). Used on ≤1 control per viewport. Never as a gradient fill. Never on large surfaces. |
| **Type** | Two families. A transitional serif for display (Newsreader or Fraunces variable, free; upgrade path to GT Sectra / Tiempos). Inter Variable for text, with `cv11`, `ss01`, tabular numerals in tables. **Noto Serif Devanagari** for Sanskrit terms — this is a correctness requirement, not a flourish. |
| **Grid** | 12 column, 1240px max, 24/32px gutters, 66ch text measure. Logical properties throughout (RTL-ready). |
| **Radii** | 2 / 4 / 6px. Pills fully round. Nothing else above 6. |
| **Depth** | Hairline borders at 10% ink. Shadows: at most two levels, both nearly invisible, never coloured. |
| **Motion** | 120 / 180 / 240 / 320ms. Standard ease `cubic-bezier(0.2, 0, 0, 1)`. Emphasised `cubic-bezier(0.05, 0.7, 0.1, 1)`. Full `prefers-reduced-motion` compliance. |
| **Imagery** | Editorial portraits, consistent 4:5 crop for people, 3:2 for events. One shared grade. Photography is the single highest-ROI investment available here. |
| **Density** | Directory and admin are *dense and calm*. Marketing pages are *sparse and slow*. Do not use one density everywhere. |

### Non-negotiable anti-patterns

Delete on sight. No exceptions, no "but ours is tasteful":

- Custom cursors
- Gradient-filled headline text
- `rounded-2xl`/`3xl` as a default
- Emoji as iconography
- Glassmorphism / backdrop-blur panels
- More than two typefaces (Devanagari companion doesn't count)
- Fake statistics, animated counters, "trusted by" logo walls without real logos
- Full-width centred paragraphs over 66ch
- Carousels for primary content
- Testimonial cards with generated avatars

---

## Part III — Target architecture

```
src/
├── app/                          # Routing + RSC composition ONLY. Thin.
│   ├── (marketing)/              # about, mentorship, success-stories, home
│   ├── (network)/                # directory, directory/[id], events  — auth-gated
│   ├── (admin)/admin/            # console, split by resource
│   ├── api/                      # thin HTTP adapters over domain services
│   ├── layout.tsx  error.tsx  not-found.tsx  loading.tsx
│   ├── sitemap.ts  robots.ts  opengraph-image.tsx
│   └── globals.css               # imports styles/*, nothing else
│
├── components/
│   ├── primitives/               # Button Input Field Select Checkbox Radio Switch
│   │                             # Dialog Sheet Popover Tooltip Toast Tabs Badge
│   │                             # Avatar Skeleton Table Pagination Command
│   ├── patterns/                 # MemberCard EventCard StoryCard FilterBar
│   │                             # EmptyState ErrorState PageHeader Section Prose
│   └── layout/                   # Header Footer Container Grid Nav
│
├── domain/                       # ← the heart. Framework-agnostic.
│   ├── member/    { schema.ts  policy.ts  repository.ts  service.ts  dto.ts }
│   ├── event/     { … }
│   ├── mentorship/{ … }
│   ├── story/     { … }
│   └── media/     { … }
│
├── server/
│   ├── env.ts                    # zod-validated environment, fails at boot
│   ├── db.ts                     # Prisma singleton
│   ├── auth.ts                   # Clerk → AppUser mapping, one place
│   ├── result.ts                 # Result<T, AppError> — no thrown strings
│   ├── errors.ts                 # typed error taxonomy
│   ├── policy.ts                 # can(actor, action, resource)
│   ├── cache.ts                  # tag helpers: memberTag(id), eventsTag()
│   ├── rate-limit.ts
│   └── logger.ts                 # structured, request-scoped
│
├── styles/
│   ├── tokens.css                # @theme — the single source of design truth
│   ├── base.css                  # reset, typography defaults, focus rings
│   └── utilities.css
│
└── lib/                          # pure helpers only. No IO. No React.
```

**The rule that keeps this honest:** `app/` may import from `components/`, `domain/`, `server/`. `domain/` may import from `server/` and `lib/`. `domain/` may **never** import from `app/` or `components/`. Enforce it with an ESLint boundary rule in Phase 3.

### Request lifecycle (the pattern every mutation follows)

```
Server Action / Route Handler          ← adapter: parse, authenticate
        ↓  zod .safeParse()            ← validate at the boundary, once
   domain/<x>/service.ts               ← business rules, orchestration
        ↓  policy.can(actor, …)        ← authorise here, not in the adapter
   domain/<x>/repository.ts            ← the ONLY file that touches Prisma
        ↓
   revalidateTag(memberTag(id))        ← cache invalidation is the service's job
        ↓
   Result<Dto, AppError>               ← never throw across the boundary
```

Every one of those lines removes a class of bug. The policy line removes the breach.

---

## Part IV — The phases

---

### Phase 0 — Audit & baseline

**Why.** This plan makes assumptions from structure. Verify them, and establish the numbers you'll be judged against.

**Do.**

1. Capture a baseline: full-page screenshots of every route at 390px / 768px / 1440px, before any change. Store in `docs/baseline/`.
2. Run Lighthouse on Home, Directory, a member profile, Events. Record LCP, CLS, INP, TBT, a11y score. Store in `docs/baseline/lighthouse.json`.
3. Verify these assumptions and write findings to `docs/AUDIT.md`:
   - Tailwind version (v4 assumed from the 94-byte `postcss.config.mjs`)
   - Whether `globals.css` contains any design tokens at all
   - Clerk integration surface — where role/permission claims live
   - The current Prisma models, relations, and which fields lack indexes
   - Whether the directory list is server-rendered or client-fetched on mount
   - Whether any API route is missing an auth check (list them explicitly)
   - Whether `AddEntryModal` and `EditEntryModal` truly duplicate a shared form
   - Whether S3 client points at R2 or actual AWS
4. `git rm -r --cached .open-next` and add to `.gitignore`. Same for any stray build output.
5. Delete `public/next.svg`, `vercel.svg`, `file.svg`, `globe.svg`, `window.svg`.
6. Write a real `CLAUDE.md` (currently 11 bytes) containing: stack, the import-boundary rule, the design token rule ("never hardcode a colour, size, or duration — use a token"), commands, and deploy model.
7. Add `docs/DECISIONS.md` — an ADR log. Every non-obvious choice from here gets three sentences.

**Accept.**
- `docs/AUDIT.md` answers all eight questions with file:line citations.
- Baseline screenshots and Lighthouse numbers committed.
- `git status` clean; `.open-next` untracked; no starter SVGs in `public/`.
- `CLAUDE.md` > 1 KB and accurate.

**Prompt.**
```
Read this repo end to end and produce docs/AUDIT.md answering, with file:line
citations: (1) exact Tailwind version and config location; (2) full contents and
purpose of src/app/globals.css; (3) how Clerk roles/permissions are read, and
every place a role string is compared; (4) the complete Prisma model list with
relations and existing indexes; (5) for each route in src/app, whether it is a
Server Component, and where its data is fetched; (6) every API route handler and
Server Action, with a table of whether it authenticates AND authorises — flag any
that do neither; (7) a diff summary of AddEntryModal.tsx vs EditEntryModal.tsx;
(8) whether src/lib/s3.ts targets Cloudflare R2 or AWS S3.

Then: git rm -r --cached .open-next and gitignore it; delete the Next.js starter
SVGs from public/; write a real CLAUDE.md documenting stack, commands, deploy
model, and these two rules — (a) domain/ may never import from app/ or
components/, (b) never hardcode a colour, spacing value, radius, or duration.

Do not change any application code in this phase.
```

---

### Phase 1 — Foundation: tokens, type, reset

**Why.** Every subsequent decision either references a token or invents one. Build the vocabulary first, and the rest of the work collapses in size.

**Do.**

1. **Delete `CustomCursor.tsx`** and every reference to it.
2. Create `src/styles/tokens.css` as the single source of design truth (full starter below — tune the accent to brand, keep the structure).
3. Create `src/styles/base.css`: modern reset, `:focus-visible` rings on the accent, `text-wrap: balance` on headings and `pretty` on paragraphs, `font-variant-numeric: tabular-nums` on tabular contexts, `prefers-reduced-motion` global guard.
4. Wire fonts via `next/font/local` (self-hosted variable WOFF2 — do **not** use the Google CDN; Workers cold-start and privacy both argue against it). Load Newsreader Variable, Inter Variable, Noto Serif Devanagari. Set `font-display: swap`, subset aggressively, preload only the text face.
5. Add `src/server/env.ts` — zod-validated env, imported at the top of `db.ts` so a missing var fails at boot, not at 2am.
6. Rebuild `layout.tsx`: correct `metadata` export with title template, `openGraph`, `twitter`, `alternates.canonical`, `manifest`; `<html lang>` set from a locale constant; skip-to-content link; the three font variables on `<html>`.
7. Add root `loading.tsx`, `error.tsx`, `not-found.tsx` with designed states — not the framework defaults.

**`src/styles/tokens.css` — starter**

```css
@import "tailwindcss";

@theme {
  /* ── Colour ─────────────────────────────────────────────
     Warm neutrals. Never pure white, never pure black.       */
  --color-paper:        #FAF9F7;
  --color-paper-raised: #FFFFFF;
  --color-paper-sunken: #F2F0EC;

  --color-ink:          #12110F;   /* headings */
  --color-ink-muted:    #5B574F;   /* body */
  --color-ink-subtle:   #8A857A;   /* meta, captions */
  --color-ink-faint:    #B8B3A8;   /* placeholders */

  --color-line:         #E4E0D8;   /* hairline, ~10% ink */
  --color-line-strong:  #CFC9BE;

  /* Accent — deep saffron-copper. ≤5% of any viewport.       */
  --color-accent:       #A2571B;
  --color-accent-hover: #8A4915;
  --color-accent-quiet: #F5EBE0;   /* tint for backgrounds only */
  --color-accent-ink:   #FFFFFF;   /* text on accent */

  --color-success:      #2F6B4F;
  --color-warning:      #8A6410;
  --color-danger:       #9B2C22;

  /* ── Type ───────────────────────────────────────────────  */
  --font-display: "Newsreader Variable", "Iowan Old Style", Georgia, serif;
  --font-text:    "Inter Variable", -apple-system, "Segoe UI", sans-serif;
  --font-deva:    "Noto Serif Devanagari", var(--font-display), serif;
  --font-mono:    "JetBrains Mono", ui-monospace, monospace;

  /* Fluid scale. Display sizes carry negative tracking.      */
  --text-2xs:   0.6875rem;  /* 11 */
  --text-xs:    0.75rem;    /* 12 */
  --text-sm:    0.8125rem;  /* 13 — UI default */
  --text-base:  0.9375rem;  /* 15 — body default */
  --text-lg:    1.0625rem;  /* 17 */
  --text-xl:    1.3125rem;  /* 21 */
  --text-2xl:   clamp(1.5rem,   1.2rem + 1.2vw, 1.875rem);
  --text-3xl:   clamp(1.875rem, 1.4rem + 2.0vw, 2.625rem);
  --text-4xl:   clamp(2.375rem, 1.6rem + 3.2vw, 3.75rem);
  --text-5xl:   clamp(3rem,     1.8rem + 5.0vw, 5.25rem);

  --tracking-display: -0.022em;
  --tracking-tight:   -0.012em;
  --tracking-normal:  0em;
  --tracking-wide:    0.08em;   /* eyebrows / small caps only */

  --leading-display: 1.04;
  --leading-tight:   1.18;
  --leading-body:    1.6;
  --leading-prose:   1.72;

  --measure-prose: 66ch;
  --measure-lede:  52ch;

  /* ── Space ──────────────────────────────────────────────
     4px base for components, 8px rhythm for layout.          */
  --space-1: 0.25rem;  --space-2: 0.5rem;   --space-3: 0.75rem;
  --space-4: 1rem;     --space-5: 1.5rem;   --space-6: 2rem;
  --space-7: 2.5rem;   --space-8: 3rem;     --space-9: 4rem;
  --space-10: 5rem;    --space-11: 6rem;    --space-12: 8rem;

  --section-y:       clamp(4rem, 3rem + 5vw, 8rem);
  --section-y-large: clamp(6rem, 4rem + 8vw, 11rem);

  /* ── Structure ──────────────────────────────────────────  */
  --container-max: 77.5rem;   /* 1240 */
  --container-pad: clamp(1.25rem, 0.75rem + 2.5vw, 2.5rem);
  --grid-gutter:   clamp(1rem, 0.5rem + 1.5vw, 2rem);

  --radius-xs: 2px;  --radius-sm: 4px;  --radius-md: 6px;
  --radius-pill: 999px;

  --border-hairline: 1px;

  /* Barely-there. If you can see the shadow, it's too big.   */
  --shadow-raised: 0 1px 2px rgb(18 17 15 / 0.04),
                   0 1px 1px rgb(18 17 15 / 0.03);
  --shadow-overlay: 0 8px 24px rgb(18 17 15 / 0.08),
                    0 2px 6px  rgb(18 17 15 / 0.04);

  /* ── Motion ─────────────────────────────────────────────  */
  --ease-standard:   cubic-bezier(0.2, 0, 0, 1);
  --ease-emphasised: cubic-bezier(0.05, 0.7, 0.1, 1);
  --ease-exit:       cubic-bezier(0.3, 0, 1, 1);

  --dur-instant: 120ms;
  --dur-fast:    180ms;
  --dur-normal:  240ms;
  --dur-slow:    320ms;

  --z-header: 50;  --z-overlay: 100;  --z-toast: 200;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

**Accept.**
- Zero hex colours, raw px, or ms values anywhere outside `tokens.css`. Enforce with a lint rule or a `rg` check in CI.
- `CustomCursor.tsx` deleted; zero references remain.
- Fonts self-hosted; no request to `fonts.googleapis.com` in the network panel.
- `pnpm build` fails when a required env var is absent.
- Root `loading` / `error` / `not-found` render designed states.
- Lighthouse a11y ≥ 95 on Home before any page redesign (focus rings, landmarks, skip link).

**Prompt.**
```
Phase 1 — Foundation.
1. Delete src/components/CustomCursor.tsx and every reference.
2. Create src/styles/tokens.css exactly as specified in REBUILD_PLAN.md §Phase 1,
   then src/styles/base.css with a modern reset, :focus-visible rings using
   --color-accent, text-wrap balance/pretty, and a prefers-reduced-motion guard.
   src/app/globals.css should import these two and contain nothing else.
3. Self-host Newsreader Variable, Inter Variable and Noto Serif Devanagari via
   next/font/local into src/app/fonts.ts. No Google CDN requests.
4. Create src/server/env.ts using zod to validate every environment variable at
   module load, and import it from src/server/db.ts so boot fails loudly.
5. Rewrite src/app/layout.tsx: metadata with title template, openGraph, twitter,
   canonical, manifest; lang attribute; skip-to-content link; font variables on
   <html>. Add designed loading.tsx, error.tsx, not-found.tsx at the app root.
6. Delete the public/ starter SVGs if still present.

Constraint: after this phase, no file outside tokens.css may contain a hex colour,
a raw px value, or a raw ms duration. Add a CI check that greps for violations.
```

---

### Phase 2 — Primitive component library

**Why.** 33 KB of admin page exists because there was no `<Table>` to reach for. Build the twenty components once and every page after this is assembly, not invention.

**Do.**

1. Install `radix-ui` primitives (behaviour + a11y, unstyled), `class-variance-authority`, `tailwind-merge`, `clsx`. **Do not install a component kit.** shadcn/ui as a *source to copy from* is fine; as a dependency it imports someone else's design opinions and you will spend longer fighting them than writing your own.
2. Build `src/components/primitives/`, each with CVA variants, forwarded refs, full keyboard support, and every state — default, hover, active, focus-visible, disabled, loading, error:

   `Button` (primary/secondary/ghost/danger × sm/md/lg) · `Input` · `Textarea` · `Select` · `Combobox` · `Checkbox` · `Radio` · `Switch` · `Field` (label + hint + error, wires `aria-describedby`) · `Dialog` · `Sheet` · `Popover` · `Tooltip` · `Toast` · `Tabs` · `Badge` · `Avatar` (with initials fallback — never a generated face) · `Skeleton` · `Table` (sortable, sticky header, tabular-nums) · `Pagination` · `Command` (⌘K)

3. Build `src/components/patterns/`: `PageHeader`, `Section`, `Container`, `Prose`, `EmptyState`, `ErrorState`, `FilterBar`, `MemberCard`, `EventCard`, `StoryCard`.
4. Add a private route `/_design` (dev-only, blocked in prod middleware) rendering every component in every state, light and dark. This is your review surface — it is how you catch inconsistency before it ships.

**Accept.**
- All 20 primitives exist, each exercised in `/_design` in ≥4 states.
- Full keyboard traversal of `/_design`; visible focus ring on every interactive element; no focus trap escapes.
- Zero `className="..."` colour/spacing literals inside primitives — everything via CVA + tokens.
- axe-core reports zero violations on `/_design`.

**Prompt.**
```
Phase 2 — Primitives.
Install radix-ui, class-variance-authority, tailwind-merge, clsx. Do NOT install a
component library.

Build src/components/primitives/ with: Button, Input, Textarea, Select, Combobox,
Checkbox, Radio, Switch, Field, Dialog, Sheet, Popover, Tooltip, Toast, Tabs,
Badge, Avatar, Skeleton, Table, Pagination, Command.

Requirements per component: CVA variants, forwardRef, exhaustive states (default,
hover, active, focus-visible, disabled, loading, error), full keyboard support,
correct ARIA. Style exclusively with tokens from tokens.css — no literals.
Avatar falls back to initials, never a generated image.

Then src/components/patterns/: PageHeader, Section, Container, Prose, EmptyState,
ErrorState, FilterBar, MemberCard, EventCard, StoryCard.

Add a dev-only /_design route rendering every component in every state, and block
it in middleware when NODE_ENV === 'production'. Run axe-core against it and fix
every violation.
```

---

### Phase 3 — Backend re-architecture

**Why.** This is the phase that makes the product maintainable and secure. It is also the least visible — do it anyway, and do it before the pages, so the pages consume a clean API rather than being retrofitted onto one.

**Do.**

1. **`src/server/result.ts`** — a `Result<T, E>` type. Services return it. Nothing throws across a boundary.
2. **`src/server/errors.ts`** — typed taxonomy: `Unauthenticated`, `Forbidden`, `NotFound`, `Validation`, `Conflict`, `RateLimited`, `Internal`. Each maps to an HTTP status and a user-safe message in exactly one place.
3. **`src/server/auth.ts`** — one function, `getActor()`, that resolves Clerk session → `Actor { id, clerkId, role, permissions, memberId }`. Every other file uses this. No file outside it calls `auth()` from Clerk.
4. **`src/server/policy.ts`** — the authorisation core:
   ```ts
   type Action = 'member:read' | 'member:update' | 'member:approve'
               | 'event:create' | 'event:update' | 'event:delete'
               | 'mentorship:request' | 'admin:access' | ...
   export function can(actor: Actor, action: Action, resource?: Resource): boolean
   ```
   Every service call starts with `can()`. Every existing scattered role comparison is deleted and replaced. **This is the single highest-value change in the whole plan.**
5. **`src/domain/<entity>/`** for member, event, mentorship, story, media — each with `schema.ts` (zod, shared by client and server), `dto.ts` (what leaves the server — never a raw Prisma model, or you will leak `email` and `clerkId` to the client), `repository.ts` (the only Prisma consumer), `service.ts` (rules + policy + cache invalidation), `policy.ts` (entity-specific rules).
6. **Rewrite every route handler as a thin adapter** — under 30 lines each: parse → `getActor()` → call service → map `Result` to `Response`.
7. **Prefer Server Actions** for same-app mutations; keep REST only where an external client genuinely needs it.
8. **`src/server/cache.ts`** — tag helpers (`memberTag(id)`, `membersListTag()`, `eventsTag()`). Reads wrap in `unstable_cache` with tags; services call `revalidateTag` after writes.
9. **`src/server/rate-limit.ts`** — Cloudflare Rate Limiting binding or Upstash. Apply to all mutations, uploads, and auth-adjacent routes.
10. **`src/server/logger.ts`** — structured JSON logs with a request id. Never log PII.
11. **ESLint boundary rule** enforcing the import direction stated in Part III.
12. **Vitest** unit tests for every `policy.ts` and every `service.ts`. Policy tests are non-optional: one test per (role × action × ownership) combination.

**Accept.**
- No `PrismaClient` import outside `domain/*/repository.ts` and `server/db.ts`.
- No Clerk `auth()` import outside `server/auth.ts`.
- Every route handler under 30 lines.
- Every service method's first statement is a `can()` check.
- No route returns a raw Prisma model — all responses are DTOs.
- Policy unit tests cover every action × role combination; coverage on `domain/` ≥ 80%.
- ESLint fails the build on a boundary violation.

**Prompt.**
```
Phase 3 — Backend re-architecture. Read docs/AUDIT.md first.

Create src/server/: result.ts (Result<T,E>), errors.ts (typed taxonomy →
HTTP status + safe message), auth.ts (single getActor() resolving Clerk to an
Actor type), policy.ts (can(actor, action, resource) covering every action in the
app), cache.ts (tag helpers), rate-limit.ts, logger.ts (structured, request-scoped,
no PII).

Create src/domain/{member,event,mentorship,story,media}/ each with schema.ts (zod),
dto.ts, repository.ts (sole Prisma consumer), service.ts, policy.ts.

Migrate every existing API route and Server Action to be a thin adapter over these
services — target under 30 lines each. Delete every scattered role-string
comparison and replace with can(). Services must revalidateTag after writes.
Responses must be DTOs, never raw Prisma models.

Add an ESLint rule enforcing: domain/ must not import from app/ or components/.
Write Vitest tests covering every (role × action × ownership) permutation in
policy.ts, and unit tests for each service. Target 80% coverage on domain/.

List in your summary every authorisation gap you found and closed.
```

---

### Phase 4 — Data model & search

**Why.** A directory is a search product. The current schema (2.2 KB) predates the ambition.

**Do.**

1. Redesign `prisma/schema.prisma`. Target shape:

   - `User` — mirror of Clerk (`clerkId` unique, `email`, `role`, `status`, timestamps)
   - `Member` — the directory entity: `slug` (unique, stable, human-readable URL), `legalName`, `initiatedName`, `headline`, `bio`, `city`, `countryCode`, `timezone`, `visibility` enum, `status` enum (`DRAFT|PENDING|APPROVED|REJECTED|ARCHIVED`), `approvedAt`, `approvedById`
   - `Expertise` + `MemberExpertise` — many-to-many, controlled vocabulary. Free-text tags become unsearchable noise within six months.
   - `Organization` + `MemberRole` — where they work, with title and date range
   - `Link` — polymorphic external links with a `kind` enum (linkedin/site/x/…), never a JSON blob
   - `Event` — `startsAt` (UTC), `timezone` (IANA), `venue`, `mode` enum (`IN_PERSON|ONLINE|HYBRID`), `capacity`, `status`; `EventRegistration` with a unique `(eventId, userId)`
   - `MentorshipProfile` (offering, capacity, focus areas), `MentorshipRequest` (`status` enum, message, decidedAt)
   - `SuccessStory` — `status`, `publishedAt`, `authorId`, `memberId?`, `coverAssetId`
   - `MediaAsset` — `key`, `bucket`, `mime`, `bytes`, `width`, `height`, `blurhash`, `uploadedById`
   - `AuditLog` — `actorId`, `action`, `entity`, `entityId`, `before` / `after` JSON, `ip`, `at`. **Every admin mutation writes one.**
   - `Invitation` — for controlled onboarding

2. **Indexes.** Every foreign key. Every enum you filter on. Composite `(status, createdAt DESC)` for every list query. Verify with `EXPLAIN ANALYZE` on a seeded 10k-row table.
3. **Search.** Migration adding `pg_trgm` and a generated `tsvector` column on `Member` (weighted: name A, headline B, expertise C, bio D) with a GIN index. Rank with `ts_rank_cd`, fall back to trigram similarity for typo tolerance. A single well-indexed Postgres query beats a search SaaS at this scale, and costs nothing.
4. **Seeds.** `prisma/seed.ts` producing ~200 realistic members, 30 events, 20 stories. You cannot design a directory against three rows — density is a design input.
5. **Soft delete** via `deletedAt` + a repository-level filter. Never hard-delete a member record.
6. **Migration discipline.** Named migrations, forward-only, tested against a scratch branch (use the Supabase branching workflow if this is Supabase).

**Accept.**
- `EXPLAIN ANALYZE` on directory list + search shows index scans, no sequential scans, p95 under 50ms on 10k rows.
- Seed produces ≥200 members; every page is designable against realistic density.
- Every admin mutation writes an `AuditLog` row (assert in tests).
- Typo tolerance works: searching "bhaktivedanata" returns "Bhaktivedanta" results.

**Prompt.**
```
Phase 4 — Data model & search. Read docs/AUDIT.md §4 first.

Redesign prisma/schema.prisma per REBUILD_PLAN.md §Phase 4: User, Member (with
slug, status/visibility enums, approval audit fields), Expertise +
MemberExpertise, Organization + MemberRole, Link (kind enum, not JSON),
Event (UTC startsAt + IANA timezone + mode enum) + EventRegistration,
MentorshipProfile + MentorshipRequest, SuccessStory, MediaAsset (with blurhash),
AuditLog, Invitation. Add deletedAt soft-delete everywhere and filter it in the
repository layer.

Index every foreign key, every filtered enum, and add composite
(status, createdAt DESC) indexes for list queries.

Write a raw SQL migration enabling pg_trgm and adding a generated tsvector column
on Member weighted name:A headline:B expertise:C bio:D with a GIN index. Implement
search in member/repository.ts using ts_rank_cd with trigram fallback for typos.

Write prisma/seed.ts generating 200 realistic members, 30 events, 20 stories with
plausible international distribution. Then run EXPLAIN ANALYZE on the directory
list and search queries and paste the plans into docs/DECISIONS.md — I want proof
of index scans, not sequential scans.

Make every admin mutation write an AuditLog row, and assert it in tests.
```

---

### Phase 5 — Surface rebuild

**Why.** Now, and only now, the pages. With tokens, primitives, and a clean service layer, each page becomes composition.

Rebuild in this order — the Directory first, because it is the product:

#### 5.1 Directory (`/directory`) — the crown jewel

The current implementation is `DirectoryClient.tsx` (9 KB) presumably fetching on mount. Replace with:

- Server Component list, streamed, with `Suspense` + skeleton
- Filters in the **URL** (`?q=&expertise=&country=&sort=`) via `nuqs` or `searchParams` — shareable, back-button correct, SSR-able
- Debounced search box (200ms) with instant client-side optimistic filtering over the loaded page, server round-trip for the full result
- Two view modes: **Gallery** (portrait-led, 4:5 crop, 3-up desktop) and **Index** (dense table — name, role, org, city — for people who know who they're looking for). Persist the choice.
- Cursor pagination, not offset. Offset pagination degrades and duplicates rows under concurrent writes.
- A designed `EmptyState` for zero results that suggests adjacent queries
- Skeletons that match final layout exactly — no layout shift, CLS 0

#### 5.2 Member profile (`/directory/[slug]`)

- Move from `[id]` to `[slug]` with a permanent redirect from the old ID route
- Editorial layout: large portrait, name in display serif, headline, then structured facts in a definition list — not a wall of paragraphs
- `generateMetadata` with a per-member OG image via `next/og`
- JSON-LD `Person` schema
- Related members ("also in Mumbai", "also in technology") — this is what makes a directory feel alive

#### 5.3 Events (`/events`)

- Split the 14 KB monolith. Upcoming / Past tabs.
- **All times rendered in the viewer's timezone** with the event's own timezone shown alongside. For an international network this is not a nicety; getting it wrong is the difference between attending and not.
- "Add to calendar" generating a real `.ics`
- Registration with optimistic UI and capacity handling

#### 5.4 Home (`/`)

Rebuild the 12 KB page as four movements, no more:

1. **Statement** — one sentence of real substance, display serif, huge, generous air. No gradient. No hero image behind text.
2. **Proof** — a live slice of the directory. Actual members, actual faces. This is the strongest asset the product has; lead with it.
3. **What the network does** — three columns, restrained, each linking somewhere real.
4. **Entry** — one clear action. Apply / request an invitation.

Delete anything that is not one of those four.

#### 5.5 Mentorship, Success Stories, About

- Mentorship: mentor index + a request flow with clear states (requested → accepted → scheduled → completed), not a mailto link
- Stories: proper editorial article layout, `Prose` pattern, 66ch measure, pull quotes, real bylines and dates
- About: the institution's case. Short. Confident.

**Accept.**
- Directory: filters live in the URL and survive refresh and share.
- CLS = 0 on every route; LCP under 2.0s on 4G throttle.
- Every route has designed loading, empty, and error states.
- Event times correct in at least three timezones (test IST, PT, CET).
- No page component exceeds 200 lines.
- Keyboard-only traversal completes every primary flow.

**Prompt.**
```
Phase 5 — Surface rebuild. Rebuild in this order using only Phase 2 primitives and
Phase 3 services. No page component may exceed 200 lines — extract to
components/patterns/ instead.

5.1 /directory — Server Component with streamed Suspense list, filter state in the
URL (q, expertise, country, sort), cursor pagination (not offset), two view modes
(Gallery 4:5 portraits / dense Index table) persisted per user, 200ms debounced
search, skeletons that exactly match final layout so CLS is 0, and a designed
empty state suggesting adjacent queries.

5.2 /directory/[slug] — migrate from [id] to slug with a 308 redirect from the old
route. Editorial layout, definition-list facts, generateMetadata with a per-member
next/og image, JSON-LD Person, and a related-members section.

5.3 /events — split the monolith. Upcoming/Past tabs. Render every time in the
VIEWER's timezone via Intl with the event's own IANA timezone shown alongside.
Real .ics download. Optimistic registration with capacity handling.

5.4 / — four movements only: Statement, Proof (live directory slice with real
faces), What the network does, Entry. Delete everything else.

5.5 /mentorship with a real request state machine; /success-stories with editorial
article layout at 66ch; /about.

Every route gets designed loading.tsx, error.tsx and empty states.
```

---

### Phase 6 — Admin console

**Why.** `admin/page.tsx` is 33,126 bytes. That is the most dangerous file in the repository — it is where permissions live and where nobody wants to look.

**Do.**

1. Split into `app/(admin)/admin/{members,events,stories,users,media,audit}/page.tsx`, each under 150 lines.
2. Persistent admin shell: sidebar nav, breadcrumb, global ⌘K command palette.
3. **Members queue** — the approval workflow as a proper review surface: pending list, side-by-side diff of submitted vs current, approve/reject with a required reason, bulk actions with confirmation.
4. **Users & roles** — role assignment through the Phase 3 policy layer only. Guard rails: cannot remove your own admin, cannot leave zero admins.
5. **Audit log** viewer — filterable by actor, entity, date. This is what makes an admin console trustworthy.
6. Every destructive action: confirmation naming the object, and undo where feasible (soft delete makes this cheap).
7. Every table: sortable, keyboard-navigable, sticky header, tabular numerals, URL-persisted state.

**Accept.**
- No admin file exceeds 150 lines.
- Every mutation goes through a domain service; zero direct Prisma calls in `app/(admin)/`.
- Every mutation writes an `AuditLog` row.
- A non-admin hitting any `/admin/*` route or admin action gets 403 — proven by an e2e test per route.
- Cannot remove the last admin; cannot demote yourself.

**Prompt.**
```
Phase 6 — Admin console. src/app/admin/page.tsx is 33KB; decompose it.

Create app/(admin)/admin/{members,events,stories,users,media,audit}/ with a shared
admin shell (sidebar, breadcrumbs, ⌘K command palette). No file over 150 lines.

Members: a proper approval queue — pending list, side-by-side diff of submitted vs
current values, approve/reject with required reason, bulk actions behind
confirmation. Users: role assignment through policy.ts only, with guard rails
preventing removal of the last admin and self-demotion. Audit: a filterable log
viewer (actor, entity, date range).

Every table sortable, keyboard-navigable, sticky-header, tabular-nums, with state
in the URL. Every destructive action confirms by naming the object and offers undo
via soft delete.

Zero direct Prisma calls under app/(admin)/. Write Playwright tests proving a
non-admin receives 403 on every admin route and every admin action.
```

---

### Phase 7 — Craft pass

**Why.** This phase is the entire difference between "well built" and "premium". Budget real time for it; it is not polish, it is the product.

**Do.**

1. **Motion.** Page transitions via View Transitions API where supported. Dialogs scale-and-fade from origin. List items stagger at 20ms intervals, capped at 8 items. Nothing over 320ms. Everything respects reduced-motion.
2. **Imagery pipeline.** R2 + Cloudflare Images. Enforced aspect ratios (4:5 people, 3:2 events, 16:9 stories). `blurhash` placeholders from `MediaAsset`. AVIF with WebP fallback. Client-side crop tool on upload — do not let members upload badly cropped portraits, because inconsistent crops are the fastest way back to looking cheap.
3. **Internationalisation scaffold.** `next-intl` with `en` complete and `hi` stubbed. All dates/numbers/relative-times via `Intl`. Logical CSS properties throughout so RTL is a locale flip, not a rewrite. Devanagari renders in `--font-deva`.
4. **Accessibility to WCAG 2.1 AA.** Contrast audit against final tokens (verify the accent passes 4.5:1 on paper). Landmarks, heading order, `aria-live` on async results, focus restoration after dialog close, 44px minimum touch targets.
5. **SEO.** `sitemap.ts` (dynamic from published members/events/stories), `robots.ts`, per-route `generateMetadata`, `next/og` images for members and events, JSON-LD (`Organization`, `Person`, `Event`, `Article`).
6. **Email.** Transactional templates (React Email + Resend): invitation, approval, rejection with reason, mentorship request/accept, event confirmation with `.ics`. Designed to the same standard as the site.
7. **Dark mode** — only if you'll maintain it. Tokens already support it; add `@media (prefers-color-scheme: dark)` overrides on the token block alone. If you can't commit to auditing every surface in both, ship light-only and say so.
8. **Micro-craft sweep.** Selection colour. Scrollbar styling. `::marker` colour. Print stylesheet for member profiles. Favicon set + `manifest.json` + Apple touch icons. `theme-color`. Custom 404 with a directory search box.

**Accept.**
- Lighthouse ≥ 95 across Performance, Accessibility, Best Practices, SEO on all primary routes.
- axe-core: zero violations site-wide.
- All member portraits identical aspect ratio and grade.
- Full keyboard operation of every flow, verified manually.
- OG images render correctly in the Twitter/LinkedIn/Slack validators.
- Reduced-motion setting genuinely removes all motion.

**Prompt.**
```
Phase 7 — Craft pass.

Motion: View Transitions API for route changes, dialogs scale+fade from origin,
list stagger at 20ms capped at 8 items, nothing over 320ms, all reduced-motion safe.

Images: R2 + Cloudflare Images with enforced aspect ratios (4:5 people, 3:2 events,
16:9 stories), blurhash placeholders from MediaAsset, AVIF with WebP fallback, and
a client-side crop tool in the upload flow so portrait crops are consistent.

i18n: next-intl with en complete and hi stubbed. Every date, number and relative
time through Intl. Logical CSS properties throughout. Devanagari via --font-deva.

A11y: WCAG 2.1 AA. Verify accent contrast ≥4.5:1 on paper, fix landmarks and
heading order, aria-live on async results, focus restoration after dialog close,
44px touch targets. Get axe-core to zero.

SEO: dynamic sitemap.ts and robots.ts, per-route generateMetadata, next/og images
for members and events, JSON-LD Organization/Person/Event/Article.

Email: React Email + Resend templates for invitation, approval, rejection with
reason, mentorship request/accept, event confirmation with .ics attachment.

Micro-craft: selection colour, scrollbar, ::marker, print stylesheet for member
profiles, full favicon set, manifest.json, theme-color, and a 404 page with a
directory search box.

Target Lighthouse ≥95 on all four axes across every primary route.
```

---

### Phase 8 — Operations

**Why.** Everything above is undone by the first silent production failure.

**Do.**

1. **Observability.** Sentry (errors + traces, PII scrubbed). Web Vitals → analytics. Structured logs to Cloudflare Logpush. An uptime check on `/api/health`.
2. **CI** (`.github/workflows/ci.yml`, separate from `deploy.yml`): typecheck → lint → unit tests → build → Playwright e2e → Lighthouse CI with **budgets that fail the build** (LCP < 2.0s, CLS < 0.05, INP < 200ms, JS < 180 KB gzipped per route).
3. **Preview environments** per PR on Cloudflare, with a branched database (Supabase branching or a scratch Postgres).
4. **Security.** CSP with nonces, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`. Dependabot. `pnpm audit` in CI. Rate limits verified by test.
5. **Backups.** Automated daily Postgres backup with a **restore drill actually performed once** and documented. An untested backup is not a backup.
6. **Docs.** `docs/ARCHITECTURE.md`, `docs/DESIGN_SYSTEM.md`, `docs/RUNBOOK.md` (deploy, rollback, common incidents), `docs/DECISIONS.md`.

**Accept.**
- CI blocks merge on any failing gate, budgets included.
- A deliberately thrown error appears in Sentry within 60s with a usable stack trace.
- Restore drill completed and written up.
- CSP active with zero console violations.

**Prompt.**
```
Phase 8 — Operations.
Add Sentry with PII scrubbing, Web Vitals reporting, and /api/health.
Create .github/workflows/ci.yml separate from deploy.yml running typecheck, lint,
unit tests, build, Playwright e2e, and Lighthouse CI with budgets that FAIL the
build: LCP < 2.0s, CLS < 0.05, INP < 200ms, JS < 180KB gzipped per route.
Configure per-PR Cloudflare preview deployments with a branched database.
Add CSP with nonces plus HSTS, X-Content-Type-Options, Referrer-Policy and
Permissions-Policy headers; enable Dependabot; run pnpm audit in CI.
Set up automated daily Postgres backups, perform one restore drill, and document it.
Write docs/ARCHITECTURE.md, docs/DESIGN_SYSTEM.md, docs/RUNBOOK.md.
```

---

## Part V — Sequencing & effort

| Phase | Effort (solo, focused) | Blocks | Visible to users |
|---|---|---|---|
| 0 · Audit | 0.5 day | everything | no |
| 1 · Foundation | 1.5 days | 2, 5 | subtly |
| 2 · Primitives | 3 days | 5, 6 | no |
| 3 · Backend | 4 days | 4, 5, 6 | no |
| 4 · Data & search | 2.5 days | 5 | indirectly |
| 5 · Surfaces | 6 days | 7 | **yes — the transformation** |
| 6 · Admin | 3 days | — | to staff |
| 7 · Craft | 4 days | — | **yes — the premium feel** |
| 8 · Ops | 2 days | — | no |

**≈ 27 focused days.** With Claude Code executing phase prompts and you reviewing, realistically 3–4 calendar weeks.

**If you have only one week:** Phases 0, 1, 2, and 5.1 (Directory) + 5.4 (Home). That alone changes the perception entirely, because tokens + primitives + the two pages people actually see is where nearly all the visible value sits. Then continue.

**Do not** skip Phase 3 permanently. The authorisation consolidation is a security fix, not a refactor.

---

## Part VI — The premium checklist

Run this before calling any phase done. Every "no" is a reason it still feels like a template.

**Typography**
- [ ] Exactly two families (plus Devanagari companion)
- [ ] Display sizes carry negative tracking; small caps carry positive
- [ ] Body measure never exceeds 66ch
- [ ] Numerals are tabular in every table and stat
- [ ] `text-wrap: balance` on headings, `pretty` on paragraphs
- [ ] No text over an unblurred photograph

**Colour**
- [ ] Accent occupies under 5% of any viewport
- [ ] No gradient fills anywhere
- [ ] Neutrals are warm-tinted, not pure grey
- [ ] Every pair passes 4.5:1 (3:1 for large text)

**Space & structure**
- [ ] Every spacing value comes from the token scale
- [ ] Section rhythm is consistent within a page type
- [ ] Radii ≤ 6px, or fully round
- [ ] Depth via 1px hairlines, not shadows

**States**
- [ ] Every list has a designed empty state that suggests a next action
- [ ] Every async surface has a skeleton matching final layout exactly
- [ ] Every error state names what failed and offers a retry
- [ ] Every destructive action confirms by naming the object
- [ ] Every form field shows validation inline, on blur, not on submit

**Motion**
- [ ] Nothing longer than 320ms
- [ ] Nothing animates without explaining a change in state
- [ ] `prefers-reduced-motion` genuinely removes motion
- [ ] No hover-scale on cards

**Craft**
- [ ] Focus ring visible and consistent on every interactive element
- [ ] Full keyboard operation of every flow
- [ ] All portraits identical crop and grade
- [ ] Dates render in the viewer's timezone
- [ ] 404 and 500 pages are designed
- [ ] Selection colour, scrollbar, and `::marker` are styled
- [ ] Print stylesheet exists for member profiles

**Engineering**
- [ ] Zero design literals outside `tokens.css`
- [ ] Zero Prisma imports outside repositories
- [ ] Every service call authorises before acting
- [ ] No component file over 200 lines
- [ ] CLS = 0, LCP < 2.0s, INP < 200ms on every primary route

---

## Part VII — Open decisions for you

Four things this plan cannot decide without you. Answer them before Phase 1:

1. **The accent colour.** I've specified a desaturated saffron-copper (`#A2571B`). If ĀRK or the network has an existing palette, substitute it — but keep the discipline (one accent, ≤5% surface, no gradients).
2. **Photography.** Do you have, or can you commission, consistent member portraits? This is the highest-leverage single investment available. A directory of 200 people shot to one standard looks like an institution; the same 200 in mixed selfies looks like a form.
3. **Display typeface.** Newsreader/Fraunces are free and good. A licensed face (GT Sectra, Canela, Tiempos — roughly $400–900) is the clearest single upgrade in perceived value. Worth it if this is a long-lived property.
4. **Dark mode.** Ship it only if you'll audit every surface in both. Light-only, done impeccably, beats two modes done at 80%.

---

*Execute in order. Verify each phase against its acceptance criteria before moving on. Amend this document as Phase 0 findings land — it is meant to be edited, not obeyed.*

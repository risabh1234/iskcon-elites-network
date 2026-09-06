@AGENTS.md

# ISKCON Elites Network

The register of an institution: a curated directory of accomplished people who share a tradition,
plus the events, mentorship and stories around it. Not a community site — treat every surface as a
catalogue entry, not a feed.

Currently mid-rebuild. **`REBUILD_PLAN.md` is the work order and it is executed in phase order.**
`docs/AUDIT.md` records the verified state of the codebase as of Phase 0; where it contradicts
`REBUILD_PLAN.md`, the audit wins. `docs/DECISIONS.md` is the ADR log — every non-obvious choice
gets three sentences there.

## Stack

| | |
|---|---|
| Framework | Next.js **16.2.9**, App Router, React 19.2.4 |
| Styling | Tailwind CSS **v4** — CSS-first, **no `tailwind.config`**; tokens live in `src/styles/tokens.css` |
| Fonts | Self-hosted variable WOFF2 in `src/app/fonts/`, wired in `src/app/fonts.ts`. Newsreader (display), Inter (text), Noto Serif Devanagari. Latin and Latin-Ext load as separate faces so IAST (ā ṛ ṣ ḥ) renders |
| Env | `src/server/env.ts` validates with zod at module load; `src/lib/prisma.ts` imports it so boot fails loudly |
| Auth | **First-party.** Email + password (PBKDF2 via Web Crypto) and optional Google Sign-In. No auth SaaS |
| Database | Postgres on Supabase, via Prisma 7 with the `@prisma/adapter-pg` driver adapter |
| Storage | Supabase Storage today (bucket `profiles`); Cloudflare R2 configured but unused — see `docs/AUDIT.md` §8 |
| Deploy | OpenNext → Cloudflare Workers, via `.github/workflows/deploy.yml` on push to `main` |
| Package manager | **npm** (`package-lock.json`) — not pnpm, despite what the plan's prose says |

## Commands

```bash
npm run dev              # next dev
npm run build            # prisma generate && next build
npm run lint             # eslint .
npm run check:design     # fails on any hardcoded colour/px/ms/radius/gradient
npm run check:a11y       # axe-core against /design-system (needs `npm run dev` running)
npm run test             # vitest
npm run test:coverage    # vitest with the 80% domain threshold
npm run db:migrate       # prisma migrate deploy
npm run db:seed          # 200 members, 30 events, 20 stories — deterministic
node scripts/set-password.mjs <email> <password> [--superadmin]
npm run ci               # check:design + lint + build
npm run build:cloudflare # opennextjs-cloudflare build  (output: .open-next/, gitignored)
npx prisma generate      # after any schema change
npx prisma migrate dev   # named migrations — prisma/migrations/ does not exist yet, Phase 4 creates it
```

Env vars are documented in `.env.example`. `DATABASE_URL` is the pooled Supabase URL (port 6543);
`DIRECT_URL` is the direct one (5432) and is what `prisma.config.ts` hands the CLI for migrations.

## The two rules

**1. `domain/` may never import from `app/` or `components/`.**
The dependency direction is one-way and enforced by ESLint from Phase 3 onward:

```
app/  ──▶  components/, domain/, server/
domain/  ──▶  server/, lib/
domain/  ──✗──▶  app/, components/
```

Concretely: `PrismaClient` is imported only in `domain/*/repository.ts` and `src/lib/prisma.ts`;
sessions and password hashing are reached only through the auth layer; every mutation authorises through
`server/policy.ts`'s `can(actor, action, resource)` as the first statement of the service method,
never in the route handler; and nothing crosses a boundary by throwing — services return
`Result<T, AppError>`. Route handlers are adapters: parse, get the actor, call the service, map the
result. Under 30 lines.

**2. Never hardcode a colour, a spacing value, a radius, or a duration.**
Every one of them comes from a token in `src/styles/tokens.css`. No hex literals, no raw `px`, no
raw `ms` anywhere else — including inside `className` strings, inline `style` objects, and
`framer-motion` props. If the value you need does not exist as a token, add the token; do not
inline the exception. `npm run check:design` enforces this and runs first in CI.

The check exempts `src/styles/tokens.css` (it *is* the source of truth) and the nineteen
pre-rebuild files listed in `scripts/check-design-literals.mjs`, each tagged with the phase that
rewrites it. **Never add to that list** — removing an entry is part of finishing a phase. A single
line may opt out with a `design-literal-allow` comment where a JS literal is genuinely unavoidable,
such as the `themeColor` in `viewport`.

## Components

`src/components/primitives/` is the vocabulary — Button, Field, Input, Textarea, Checkbox, Radio,
Switch, Select, Combobox, Dialog, Sheet, Popover, Tooltip, Toast, Tabs, Badge, Avatar, Skeleton,
Table, Pagination, Command. Behaviour and accessibility come from Radix; the styling is ours, via
CVA and tokens. **Do not install a component kit** — shadcn/ui is fine to read and copy from, but as
a dependency it imports someone else's design opinions and you will spend longer fighting them.
Combobox and Command have no Radix equivalent and are built here on the WAI-ARIA combobox pattern.

`src/components/patterns/` composes those into Container, Section, PageHeader, Prose, EmptyState,
ErrorState, FilterBar, MemberCard, EventCard, StoryCard. Pages assemble patterns; if a page is
inventing layout, the missing thing is a pattern.

`/design-system` renders every component in every state. It is the review surface — check a change
there before checking it in a page, and run `npm run check:a11y` against it. It is dev-only:
`notFound()` in production, and excluded from the proxy matcher. It is **not** `/_design`, because a
leading underscore marks a private folder that the App Router excludes from routing entirely.

## Backend

```
Route handler / Server Action     adapter: parse, getActor(), map the Result. Under 30 lines.
        ↓
domain/<x>/service.ts             can() FIRST, then rules, then revalidate tags
        ↓
domain/<x>/repository.ts          the only file that touches Prisma
        ↓
Result<Dto, AppError>             never throw across the boundary
```

- `server/policy.ts` holds every authorisation rule in one `can(actor, action, resource)`. It is
  pure — no database, no session — which is why every (role × action × ownership) combination is
  covered by tests. **Never write a role comparison anywhere else.**
- `server/auth.ts` is the only module that resolves a request to an identity. `getActor()` reads the
  session cookie and returns an `Actor`.
- `server/auth/password.ts` (hashing), `server/auth/session.ts` (cookies and the Session table) and
  `server/auth/google.ts` (OAuth) are reached only through `domain/auth/service.ts`. ESLint enforces
  it. Never hash a password or mint a session anywhere else.
- Sessions store only the SHA-256 of the cookie value. A password change revokes every session.
- `scripts/set-password.mjs <email> <password> [--superadmin]` is the way back in when nobody can
  sign in; password reset by email does not exist yet (ADR-0017).
- `server/errors.ts` maps each error kind to an HTTP status and a message safe to show a stranger.
  `cause` is for logs and is never serialised.
- Mutating services short-circuit on `actor.kind !== 'user'` before any query (ADR-0015).
- Responses are DTOs. Password hashes never leave the server; contact email is member-visible only.

## Design direction — "Quiet Institution"

Authority is demonstrated by what you leave out. Warm near-white paper, never pure white; warm
near-black ink, never `#000`. One desaturated saffron-copper accent on at most one control per
viewport, never as a gradient fill. Radii 2–6px, or fully round for pills — nothing between.
Depth via 1px hairlines at ~10% ink, not shadows. Motion 120–320ms and only to explain a change of
state. Directory and admin are dense and calm; marketing pages are sparse and slow.

**Delete on sight, no exceptions:** custom cursors, gradient-filled headline text, `rounded-2xl`/`3xl`
as a default, emoji as iconography, backdrop-blur glass panels, a third typeface, fake statistics
or invented members, carousels for primary content, centred paragraphs over 66ch.

## Working here

- Read `node_modules/next/dist/docs/` before writing Next.js code. This version has breaking changes
  from what you remember — see `AGENTS.md`. Two that have already bitten: `error.tsx` receives
  `unstable_retry`, not `reset`; and the `middleware` convention is renamed to `proxy` (`src/proxy.ts`,
  exporting `proxy`).
- Tailwind v4 scans the whole project for class candidates, **including comments and Markdown**. A
  class name written as an example in a code comment compiles into real CSS; `scripts/` and `docs/`
  are excluded in `globals.css` for exactly this reason.
- Contrast is checked, not eyeballed. `--color-ink-faint` is for disabled text and decorative icons
  only; placeholders and captions use `--color-ink-subtle`.
- Every list needs a designed empty state; every async surface needs a skeleton that matches the
  final layout exactly; every error state names what failed and offers a retry. Premium products
  are judged on their unhappy paths.
- No page component over 200 lines, no admin file over 150. If it is growing, the missing thing is
  a component in `components/patterns/`.
- Times are stored UTC with an IANA timezone alongside, and rendered in the *viewer's* timezone via
  `Intl`. This network is international; getting it wrong is the difference between attending and
  not.
- Never return a raw Prisma model from a route — DTOs only, or `email` and `passwordHash` leak to
  the client.
- Every admin mutation writes an `AuditLog` row.

## Known-dangerous files (Phase 0 findings, not yet fixed)

`promote.mjs` and `promote.ts` promote **every** user to SUPERADMIN — `updateMany` with no `where`.
These were all removed in the Phase 0 security hotfix; the note stays as a record of what to look
for. See `docs/AUDIT.md` §6.

## Surfaces

- `/directory` — server-rendered, filters in the URL (`src/lib/search-params.ts`), cursor
  pagination, gallery and index views. A text query uses ranked search; everything else is a
  filtered list.
- `/directory/[slug]` — slugs are canonical. A UUID in the segment 308-redirects to the slug.
- `/events` — upcoming/past tabs, real `.ics` download, optimistic registration with capacity.
- `/leadership` — the people behind the initiative: portrait, prose bio, what they speak on, what
  they have built, plus published photographs and PDFs. Editable in the console; nothing on it is
  hardcoded in a component.
- `/` — four movements only: Statement, Proof, What the network does, Entry. **Never seed it with
  invented members**; if the register cannot be read, the Proof section simply does not render.
- Every route has a designed loading, error and empty state. No page component over 200 lines
  (`src/app/admin` excepted until Phase 6).

## The console

`src/app/(admin)/admin/{members,events,stories,leadership,users,media,audit}` with a shared shell —
sidebar, breadcrumb, ⌘K palette. Rules that hold here:

- **No file over 150 lines. No Prisma.** The console calls services like everything else.
- The gate is `can(actor, 'admin:access')` in the layout, not the proxy. The proxy only checks that
  a cookie exists; a forged one gets past it and is refused here (ADR-0029).
- **Every destructive action confirms by naming the object** — `ConfirmButton` takes an
  `objectName`. Rejection requires a reason, which goes into the audit trail.
- Deletion is archival. Nothing in the console destroys a row.
- Role changes go through the policy layer, which refuses self-demotion, refuses an ADMIN acting on
  a SUPERADMIN, and refuses to leave the register with no administrator. The UI disables what it
  can, but **a disabled control is a courtesy, not a control**.
- Filters and tabs live in the URL so a reviewer can send a colleague the exact view they are on.
- Components never read the clock — ask a service (ADR-0030).

`npm run e2e` runs the Playwright specs proving the console refuses everyone who is not a reviewer.

## Operations

- `npm run ci` is the gate: design tokens → lint → tests+coverage → build. `ci.yml` adds e2e and
  the a11y sweep. The Lighthouse `budgets` job is `if: false` until CI has a seeded database
  (ADR-0037) — an empty directory passes every budget and proves nothing.
- **CSP lives in `src/proxy.ts`**, not `next.config.mjs`, because it carries a per-request nonce.
  Inline `style` attributes need `style-src-attr`, which CSP3 treats separately from `style-src`.
- **The console can run on its own subdomain.** Set `NEXT_PUBLIC_ADMIN_HOST` to a hostname (not a
  URL) and point it at the same deployment: the bare subdomain opens `/admin`, public paths on it
  bounce to the public host, and `/admin` on the public host 308s across. Unset — the state until a
  domain exists — every rule is a no-op. It **redirects and never rewrites** (ADR-0041), so URLs
  stay `admin.example.org/admin/…` and no link has to know which host rendered it. `robots.ts`
  returns `Disallow: /` on that host. Set `SESSION_COOKIE_DOMAIN` to the parent domain if one
  sign-in should cover both, and register the extra Google redirect URI.
- `/api/health` checks the database, so a 200 means the app can actually serve. Point the uptime
  monitor at it and alert on 503.
- Errors go through `server/observability/report.ts`, which scrubs connection strings, email
  addresses and tokens from message **and** stack before writing. That is the seam where Sentry
  goes (ADR-0036).
- **The backup restore drill has never been run** (ADR-0038). `docs/RUNBOOK.md` has the procedure
  and an empty drill log. Do it before this carries real member data.

## Craft rules

- **Motion** comes from tokens: `--dur-*`, `--ease-*`, `--animate-*`. Nothing over 320ms. The
  `.stagger` utility takes `--i` per child and caps the delay at eight items. Reduced-motion
  removes animation, including `::view-transition-*`, which the `*` selector does not reach.
- **SEO** is generated, never hand-maintained: `sitemap.ts`, `robots.ts`, `opengraph-image.tsx`,
  `icon.tsx`, `manifest.ts`. The sitemap is built **as an anonymous reader** so it can only ever
  contain what a stranger may see.
- **Colours outside CSS** (OG images, manifest, theme colour) come from `BRAND` in `src/lib/site.ts`
  — the one permitted duplication, each value marked as mirroring a token.
- **Email** lives in `src/server/email/`. Inline styles only; escape everything; `sendQuietly` never
  fails the action that triggered it.
- `npm run check:a11y <routes…>` audits any route, including 404 and error pages — those are what
  people meet when something has already gone wrong.

## Data model

One `Member` table with a `kind` enum — `Alumnus` and `Speaker` are gone. Key rules:

- **Slugs, not ids, in URLs.** `slugify` folds diacritics, so Śrīvāsa becomes `srivasa` rather than
  `sr-v-sa`. Slugs are never reused, including by archived rows.
- **Soft delete everywhere.** `deletedAt` is filtered in the repository. Nothing above that layer
  can read a deleted row, and nothing destroys a profile.
- **Status enums, not booleans.** `MemberStatus`, `EventStatus`, `StoryStatus`.
- **Events are a UTC instant plus an IANA zone.** Never a local time alone. Validate zones with the
  schema's `ianaTimezone`, which rejects ambiguous abbreviations like `IST` (ADR-0022).
- **Every admin mutation writes an `AuditLog` row** via `domain/audit/service.ts`. Long prose is
  recorded as a length, never as a diff — see `leadership.update`.
- **Leadership profiles are their own table**, not `Member` rows with a flag (ADR-0039). `bio`,
  `focusAreas` and `initiatives` are plain text: blank lines separate paragraphs, one item per line
  makes a list, and `domain/leadership/dto.ts` is the only place that parses either (ADR-0040).
- **Every upload records a `MediaAsset` row** and returns its id (ADR-0043). Images and PDFs both;
  `assetUrl()` in `src/lib/assets.ts` is the one place a bucket and key become a URL.
- **Search** is a weighted `tsvector` generated column plus `pg_trgm` for typo tolerance, queried
  with raw SQL in `member/repository.ts`. Expertise is filtered through its indexed join rather than
  being in the vector — see ADR-0021 for why.

## Auth setup

Email and password works with no configuration. For Google Sign-In, add to `.env.local`:

```
GOOGLE_CLIENT_ID="…apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="…"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
```

In Google Cloud Console → APIs & Services → Credentials → OAuth client ID → Web application, add
the authorised redirect URI `<origin>/api/auth/google/callback` for every origin you use. The
button stays hidden until both keys are present, so nothing breaks before they are.

**The first account to register becomes SUPERADMIN.** That is a bootstrap for a fresh install, not a
promotion path — register yourself first.

**Two addresses hold the register by standing arrangement** — they are listed in
`src/server/administrators.ts`, are SUPERADMIN from their first request whether they sign in with a
password or with Google, and have the role reasserted at every sign-in (ADR-0042). The console
therefore refuses to change or delete them, and says why rather than showing a dead control.
`ADMIN_EMAILS` adds addresses per deployment; it cannot remove those two.

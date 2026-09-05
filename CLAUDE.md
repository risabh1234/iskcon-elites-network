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
| Auth | Clerk (`@clerk/nextjs` v7) |
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

Concretely: `PrismaClient` is imported only in `domain/*/repository.ts` and `server/db.ts`; Clerk's
`auth()` is imported only in `server/auth.ts`; every mutation authorises through
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
  from what you remember — see `AGENTS.md`.
- Every list needs a designed empty state; every async surface needs a skeleton that matches the
  final layout exactly; every error state names what failed and offers a retry. Premium products
  are judged on their unhappy paths.
- No page component over 200 lines, no admin file over 150. If it is growing, the missing thing is
  a component in `components/patterns/`.
- Times are stored UTC with an IANA timezone alongside, and rendered in the *viewer's* timezone via
  `Intl`. This network is international; getting it wrong is the difference between attending and
  not.
- Never return a raw Prisma model from a route — DTOs only, or `email` and `clerkId` leak to the
  client.
- Every admin mutation writes an `AuditLog` row.

## Known-dangerous files (Phase 0 findings, not yet fixed)

`promote.mjs` and `promote.ts` promote **every** user to SUPERADMIN — `updateMany` with no `where`.
`/api/backfill` mass-approves the whole directory with no authentication. `DELETE /api/directory`
authenticates but does not authorise. Do not run the scripts, and see `docs/AUDIT.md` §6 before
touching the routes.

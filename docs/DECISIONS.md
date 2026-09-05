# Architecture Decision Record

One entry per non-obvious choice. Three sentences: what we decided, why, and what it costs.
Newest last. Never edit a decision — supersede it with a new one and link back.

---

## ADR-0001 — Adopt `REBUILD_PLAN.md` as a phased work order
**Date:** 2026-09-05 · **Status:** Accepted

The site is rebuilt in eight sequenced phases (tokens → primitives → backend → data → surfaces →
admin → craft → ops) rather than page by page, because the audit confirmed that every visible
symptom traces to a missing shared vocabulary: no design tokens, no component layer, no policy
module. Doing surfaces first would mean re-deciding spacing, colour and authorisation once per
page, which is exactly how the current codebase reached 21 duplicated role checks and a 33 KB admin
file. The cost is that Phases 1–4 produce almost nothing a user can see, so roughly the first third
of the work has to be taken on faith.

## ADR-0002 — Phase 0 findings override the plan where they conflict
**Date:** 2026-09-05 · **Status:** Accepted

`REBUILD_PLAN.md` was written from a file-tree audit without reading file contents, so it carries
eight explicit assumptions; `docs/AUDIT.md` verifies each with file:line citations and wins wherever
the two disagree. Six assumptions were confirmed, one was mixed (`/directory` is a Server Component,
not a client fetch — but `force-dynamic` disables caching, which is the same problem by another
route) and one was worse than described (two divergent role authorities, not one scattered set).
The cost is that the plan is now a living document that must be re-read alongside the audit rather
than followed straight through.

## ADR-0003 — Keep npm; the plan's `pnpm` references are prose, not instruction
**Date:** 2026-09-05 · **Status:** Accepted

The repo ships `package-lock.json` and `.github/workflows/deploy.yml` runs `npm ci`, so every
`pnpm build` in the plan is read as `npm run build`. Switching package managers mid-rebuild would
churn the lockfile and the deploy workflow for no benefit to any acceptance criterion. The cost is
nil; this note exists only so the discrepancy is not "fixed" by someone later.

## ADR-0004 — Patch the three critical authorisation holes as a hotfix, ahead of Phase 3
**Date:** 2026-09-05 · **Status:** Accepted — implemented

`docs/AUDIT.md` §6 found three issues exploitable today on the deployed site by an anonymous or
newly-registered visitor: `GET /api/backfill` mass-approves the entire directory with no auth at
all, `GET /api/directory` serves unapproved members' contact emails to the public, and
`DELETE /api/directory` authenticates without authorising so any signed-in user can destroy any
profile. Phase 3 will absorb all three into the policy layer, but it is four phases and roughly two
weeks away, and these are live rather than latent. The recommendation is a small hotfix PR now —
delete `/api/backfill`, add the `isApproved` filter to the public GET, add the admin check to the
DELETE — accepting that the code will be rewritten again in Phase 3.

## ADR-0005 — Delete the repo-root maintenance scripts rather than repair them
**Date:** 2026-09-05 · **Status:** Accepted — implemented

`promote.mjs`, `promote.ts`, `remove-admins.ts`, `list-users.ts` and `clerk_exports.txt` sit in the
project root, are referenced by no npm script, and two of them run `updateMany` with no `where`
clause — executing `promote.mjs` makes every user in the database a SUPERADMIN. Role changes belong
in the admin console behind the policy layer (Phase 6), where they are authorised and audited, so
there is no lasting need for hand-run scripts that bypass both. The cost is losing the one-off
bootstrap path for the very first admin, which Phase 4's seed script should replace deliberately.

## ADR-0006 — Open questions carried into Phase 1
**Date:** 2026-09-05 · **Status:** Open

Four choices from `REBUILD_PLAN.md` Part VII are the owner's and block Phase 1's token file: the
accent colour (plan proposes `#A2571B`; the existing brand is `#D98A29` saffron / `#C5A059` gold),
whether consistent member photography can be commissioned, whether to license a display typeface
over free Newsreader/Fraunces, and whether dark mode ships at all. A fifth surfaced in the audit:
`globals.css` currently pins all five Tailwind breakpoints to 1024px, giving the site exactly two
layouts, and Phase 1 must either keep that deliberately or restore a real scale — which changes
every `md:`/`lg:` utility already written. Until they are answered the token file can be structured
but not finalised.

## ADR-0007 — The hotfix removes the first-caller-becomes-SUPERADMIN bootstrap outright
**Date:** 2026-09-05 · **Status:** Accepted — implemented

Three code paths auto-created the calling user as SUPERADMIN whenever `prisma.user.count() === 0`,
which meant that emptying the `User` table — something `remove-admins.ts` existed to do — handed
the next visitor full control of the register. All three now create `role: 'USER'` with
`canCreateEvents: false`, because a self-service escalation path is not an acceptable way to
bootstrap an institution's admin set. The cost is that a genuinely empty database now has no way to
mint its first admin from the UI; Phase 4's seed script must do it explicitly, and until then it is
a manual `UPDATE` against the database.

## ADR-0008 — The hotfix does not change which fields the public directory API returns
**Date:** 2026-09-05 · **Status:** Accepted, with an open question

`GET /api/directory` now filters to `isApproved: true` for non-admins, which closes the audited
hole — unreviewed profiles were being served to anonymous callers — but it still returns the same
columns as before, including each approved member's `email`. Whether an approved member's contact
address should be readable by anonymous visitors is a product decision that predates this rebuild,
not a bug, so the hotfix leaves it alone rather than silently removing a feature. **Open question
for the owner:** should member email be public, signed-in-only, or opt-in per member? Phase 3's DTO
layer is where the answer gets encoded.

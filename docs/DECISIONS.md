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

## ADR-0009 — Accent, display face and colour-mode chosen for Phase 1
**Date:** 2026-09-05 · **Status:** Accepted

The accent is the plan's desaturated saffron-copper `#A2571B` rather than the existing brand saffron
`#D98A29`, because the existing one measures roughly 2.8:1 against white on the cream paper and so
cannot legally carry body-size text, which would have forced an accent-plus-a-second-accent system
on day one; `#A2571B` measures 5.1:1 on paper and carries white at 5.4:1, doing the whole job alone. The display face is self-hosted
Newsreader Variable — free, genuinely good at display sizes, and swappable for a licensed face later
by changing one token — and the product ships **light only**, because two modes maintained at 80%
read worse than one held to standard. The costs: existing collateral in brand saffron will look
slightly warmer than the site, and anyone expecting a dark toggle will not get one.

## ADR-0010 — Restore a real breakpoint scale
**Date:** 2026-09-05 · **Status:** Accepted

The previous `globals.css` pinned `sm`, `md`, `lg`, `xl` and `2xl` all to 1024px, so the site had
exactly two layouts and every `md:`/`lg:`/`xl:` utility in the codebase fired at the same width —
meaning much of the existing responsive markup is not doing what it reads as doing. `tokens.css`
restores the conventional 640/768/1024/1280/1536 scale, which the directory's gallery grid and the
dense admin tables both need in order to work at tablet widths. The cost is that every existing
`md:`/`lg:` utility now behaves differently and must be re-checked as each page is rebuilt; Phase 5
and Phase 6 rewrite those pages anyway, and the legacy pages are visually unchanged above 1024px
and below 640px.

## ADR-0011 — The design-literal check ships with a shrinking legacy allowlist
**Date:** 2026-09-05 · **Status:** Accepted

`scripts/check-design-literals.mjs` fails the build on any hardcoded colour, px value, duration,
oversized radius or gradient outside `tokens.css`, but exempts the nineteen pre-rebuild files that
Phase 5 and Phase 6 rewrite wholesale. Enforcing against them today would mean a red build for
several weeks, and a gate that is always red is a gate everyone learns to skip — whereas a gate that
is green today and blocks every *new* violation actually holds the line. The cost is that the rule is
not yet true of the whole tree; each allowlist entry names the phase that deletes it, and removing
the entry is part of finishing that phase.

## ADR-0012 — The component gallery lives at /design-system, not /_design
**Date:** 2026-09-05 · **Status:** Accepted

`REBUILD_PLAN.md` Phase 2 asks for a dev-only route at `/_design`, but in the App Router a directory
whose name begins with an underscore is a *private folder* and is excluded from routing entirely —
the page would never have resolved to a URL. The gallery is therefore at `/design-system`, excluded
from the proxy matcher (it needs no session, and routing it through Clerk only buys a handshake
redirect), and it calls `notFound()` when `NODE_ENV` is production. The cost is that the production
block now lives in the page rather than in the proxy, which is the more reliable of the two places
anyway since it cannot be defeated by editing a matcher.

## ADR-0013 — Contrast failures found by axe are fixed in the tokens, not worked around
**Date:** 2026-09-05 · **Status:** Accepted

The first axe run against the gallery failed `--color-ink-subtle` (#8A857A measured 3.49:1 on paper,
against the 4.5:1 small-text threshold), so the token was darkened to #6F6A5E at 5.1:1 rather than
the usage being restricted to large text — meta and caption text is exactly what that token is for.
`--color-ink-faint` cannot pass 4.5:1 and remain faint, so it is now documented as disabled-text and
decorative-icon only, and every placeholder moved to `--color-ink-subtle`: disabled controls are
exempt from the contrast requirement, placeholders are not. The same run found two genuine bugs in
the existing footer — social links with no accessible name, and white on the old brand saffron at
2.75:1 — which were fixed in place because they affect every page today.

## ADR-0014 — Caching stays on `unstable_cache` until Cache Components is a deliberate choice
**Date:** 2026-09-05 · **Status:** Accepted

Next 16 supersedes `unstable_cache` with the `use cache` directive, but `use cache` is a Cache
Components feature gated behind `cacheComponents: true`, which changes rendering and caching
semantics for the entire application — including the seven legacy pages Phase 5 has not reached.
`src/server/cache.ts` therefore wraps the documented previous model, and every call site goes
through `cached()` and `invalidate()` so the migration is a change to one file rather than thirty.
The one Next 16 change adopted immediately is the two-argument `revalidateTag(tag, 'max')`: the
single-argument form is deprecated, and `'max'` gives stale-while-revalidate so a write does not
make the next reader wait on a cold query.

## ADR-0015 — Anonymous mutations are refused before the database is touched
**Date:** 2026-09-05 · **Status:** Accepted

Ownership cannot be evaluated without reading the record, so `updateMember`, `deleteMember` and
their equivalents load the row and then call `can()`. A live smoke test showed the cost of that
ordering: with the database unreachable, anonymous requests to those endpoints returned 500 rather
than 401, because the query ran before anyone asked whether the caller could possibly be permitted.
Each mutating service now short-circuits on `actor.kind !== 'user'` first — an anonymous caller can
never own anything — which makes the status correct and means an unauthenticated flood costs a
comparison rather than a query. The cost is one extra line per mutation, and the rule that it must
be added to every new one.

## ADR-0016 — Member contact addresses are visible to signed-in members
**Date:** 2026-09-05 · **Status:** Accepted, revisitable

ADR-0008 left open who may see a member's email after the hotfix stopped serving unapproved
profiles publicly. The DTO layer now answers it: any signed-in member can see another member's
address, and anonymous visitors cannot — the register exists so that the network can reach itself,
but a public page that lists addresses is a harvesting target. This lives in exactly one function,
`canSeeContact` in `src/domain/member/dto.ts`, so narrowing it to owner-and-admin or opening it to
everyone is a one-line change. Worth confirming with the network's own expectations.

## ADR-0017 — Authentication is first-party; Clerk is removed
**Date:** 2026-09-05 · **Status:** Accepted

Clerk is gone from the dependency tree, the schema, the CSP and the deploy workflow, replaced by
email-and-password sign-in with optional Google Sign-In, both owned by this codebase. Identity now
lives in the same database as everything else, which removes the two-authorities problem the audit
found (`docs/AUDIT.md` §3), makes the actor available without a network call, and ends the monthly
per-seat cost — at the price of owning the security of it, which is a real cost and not a small one.
Phase 3's boundary is what made this affordable: `getActor()` changed, and policy, services and
adapters did not.

**What is implemented:** PBKDF2-HMAC-SHA256 at 600,000 iterations via Web Crypto (bcrypt and argon2
are native modules that do not exist on Cloudflare Workers); random 32-byte session tokens stored
only as SHA-256 hashes; HttpOnly, Secure, SameSite=Lax cookies; rate limiting on both auth
endpoints; identical responses and timings for "no such account" and "wrong password"; transparent
rehash when the cost factor rises; all sessions revoked on password change; and Google OAuth with
`state` and PKCE, linking to an existing account only when Google reports the address verified.

**What is deliberately not implemented yet, and matters:** email verification for password
registration, password reset, and a sweep for expired session rows. Until reset exists, a locked-out
user needs `scripts/set-password.mjs`. These should land before the site takes real registrations.

## ADR-0018 — Existing accounts cannot sign in until a password is set
**Date:** 2026-09-05 · **Status:** Accepted, with an action for the owner

The credential for every existing user lived with the old provider and did not come with the
migration, so those rows now have `passwordHash = NULL` and no way in. There is no automated remedy
that is also safe: emailing a reset link requires the password-reset flow that does not exist yet,
and silently accepting a blank password would be a back door. The migration therefore leaves those
accounts intact but locked, `scripts/set-password.mjs` exists to restore the first administrator,
and everyone else either re-registers or signs in with Google on the same verified address — which
links to their existing row rather than creating a second one.

## ADR-0019 — The proxy checks for a session cookie, not a session
**Date:** 2026-09-05 · **Status:** Accepted

`src/proxy.ts` redirects to `/sign-in` when an `/admin` request arrives with no session cookie, and
does nothing more: it does not validate the token or read a role. The proxy runs on every request,
and a database round trip there would tax the entire site to answer a question the services already
answer correctly. A forged or expired cookie therefore gets past the proxy and is refused by the
admin layout's `can(actor, 'admin:access')` and by every service beneath it. The cost is that the
redirect is a convenience rather than a control, which is worth stating plainly so nobody later
mistakes it for the security boundary.

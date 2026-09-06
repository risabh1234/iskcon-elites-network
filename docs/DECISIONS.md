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

## ADR-0020 — One Member table replaces Alumnus and Speaker
**Date:** 2026-09-05 · **Status:** Accepted

`Alumnus` and `Speaker` held the same entity with different column names, and every read merged
them in application code while every write branched on a category string — the cause of the
branching in all four directory routes. They are now one `Member` with a `kind` enum, a stable
`slug`, a `status` enum replacing the `isApproved` boolean, approval audit fields, and structured
`Expertise`, `Organization` and `Link` relations in place of free text and a JSON blob. The
migration copies both tables into `Member` before dropping them — the generated diff dropped them
first, which would have discarded the entire register — and derives slugs across both tables at once
so an alumnus and a speaker sharing a name do not collide. The cost is that this migration is
destructive and has no down path: take a backup.

## ADR-0021 — Search is Postgres, and the tsvector omits expertise
**Date:** 2026-09-05 · **Status:** Accepted

A weighted `tsvector` generated column plus a `pg_trgm` index gives ranked full-text search with
typo tolerance, which `WHERE name ILIKE '%q%'` cannot do at any size — it cannot rank, cannot use an
index for a leading wildcard, and returns nothing for a misspelling. At this scale a well-indexed
Postgres query beats a search service and costs nothing.

**Deviation from the plan, deliberately:** the plan specifies expertise at weight C, but a generated
column may only reference columns of its own row and expertise lives in a join table. Maintaining
the vector by trigger would mean two triggers — on `Member` and on `MemberExpertise` — that can
silently drift out of step, and a stale search index is worse than a narrower one. Expertise is
instead filtered through its own indexed join, which is more precise than full-text for a controlled
vocabulary. `city` takes weight C in its place, because "cardiologist in Mumbai" is a real query.
Names use the `simple` dictionary rather than `english`: stemming a proper noun helps nobody and
mangles transliterated Sanskrit.

## ADR-0022 — Timezones are validated by shape, not by membership
**Date:** 2026-09-05 · **Status:** Accepted

`Event` now stores a UTC `startsAt` plus an IANA `timezone`, replacing a date column and a free-text
time with no zone at all — which could not be rendered correctly for any reader outside the
organisers' own zone. Validating the zone turned out to need two checks: `Intl.DateTimeFormat`
accepts the ambiguous abbreviations `IST` and `EST` (IST is Indian, Irish *and* Israel Standard
Time), so an identifier must also carry a region or be exactly `UTC`. Membership in
`Intl.supportedValuesOf('timeZone')` is **not** used, because that list is canonical-only and the
ICU shipped with Node contains `Asia/Calcutta` but not `Asia/Kolkata` — the spelling most people
type. Rejecting the modern name for India would have been a poor outcome for this register in
particular.

## ADR-0023 — Deletion is archival, and every admin mutation is audited
**Date:** 2026-09-05 · **Status:** Accepted

Members, events and stories carry `deletedAt` and are filtered at the repository, so nothing above
that layer can accidentally read a deleted row and no admin mistake destroys a profile — the
register's history is part of the register. Every administrative mutation writes an `AuditLog` row
recording actor, action, entity and the before/after of what changed. `record()` deliberately never
throws and never returns a failure: an action that succeeded must not be reported as failed because
the log write did, so a failure is logged loudly to stderr and the mutation stands. The audit view
is admin-only and drops the actor's email, because a log viewer is not a place to re-expose contact
details.

## ADR-0024 — Directory filter state lives in the URL
**Date:** 2026-09-06 · **Status:** Accepted

`q`, `kind`, `expertise`, `country`, `sort`, `view` and `cursor` are all query parameters, parsed
and serialised by one module (`src/lib/search-params.ts`) so the server and the client cannot
disagree about what `?sort=recent` means. That is what makes a filtered view shareable, bookmarkable
and correct under the back button — none of which component state can do. `nuqs` was not added: the
parsing is thirty lines, and a dependency that owns URL state is a dependency that owns navigation.
Unknown values fall back to defaults rather than throwing, because a URL is user input and may have
been hand-edited or truncated.

Two consequences worth stating. Any filter change clears the cursor, since page three of the old
result set is meaningless in the new one. And a text query goes through ranked search while
everything else is a filtered list — the branch is explicit in the page rather than hidden in the
repository, because only one of the two can be cursor-paginated.

## ADR-0025 — The header and footer were rebuilt, not patched
**Date:** 2026-09-06 · **Status:** Accepted

Both were designed for a dark site that no longer exists. On the light pages the header measured
**1.05:1** — invisible rather than merely low-contrast — and axe failed every route because of it.
The footer carried a newsletter box wired to nothing, a social row whose links all pointed at `#`,
and a "Knowledge Centre" that was never built; links to pages that do not exist are worse than no
links, because they teach people the site is careless. Both are now built from the primitives, and
the header is no longer fixed-position: a sticky bar costs vertical space on every phone screen and
buys nothing on pages people scroll through once.

## ADR-0026 — Anchors are underlined by default
**Date:** 2026-09-06 · **Status:** Accepted

`src/styles/base.css` set a text-decoration *colour* but never a decoration *line*, so inline links
were distinguished from body copy by colour alone at 2.62:1 — a WCAG failure axe caught on the
sign-in page. Anchors now carry `text-decoration-line: underline` globally, and chrome that should
not look like prose (nav, cards, buttons) opts out with `no-underline`. Defaulting to underlined and
opting out is the right way round: forgetting the opt-out makes a link look like a link, whereas
forgetting to add one makes a link invisible.

## ADR-0027 — Mentorship states where it stands rather than mocking a mentor list
**Date:** 2026-09-06 · **Status:** Accepted

`MentorshipProfile` and `MentorshipRequest` exist in the schema, but the request state machine and
seeded mentor data do not, so `/mentorship` explains how requests will work and points at the
directory instead of rendering an invented list of mentors. This rebuild removed three fabricated
members from the home page for exactly this reason; replacing them with fabricated mentors would
have been the same mistake in a different room. The page ships honest and thin, and the feature
lands when the state machine does.

## ADR-0028 — The approval queue has no diff, because there is nothing to diff
**Date:** 2026-09-06 · **Status:** Accepted

`REBUILD_PLAN.md` Phase 6 asks the members queue for a side-by-side diff of submitted versus current
values. There is no such pair: the schema has no revision or draft model, so a pending entry **is**
the current row rather than a proposed change to one, and a "before" column would have to be
invented. The queue therefore shows the submission itself with approve, reject-with-reason and
archive. A revision model is the prerequisite and was not part of Phase 4's schema; adding one is a
real piece of work — a `MemberRevision` table, a merge-on-approve path, and a way to show an entry
that has both a live and a proposed state — and it should be scoped deliberately rather than
improvised to satisfy a checklist.

## ADR-0029 — The console fails closed, and the proxy is not the control
**Date:** 2026-09-06 · **Status:** Accepted

`src/proxy.ts` redirects a request with no session cookie, but it does not validate the token or
read a role: the proxy runs on every request and a database round trip there would tax the whole
site. The control is `can(actor, 'admin:access')` in the admin layout, re-checked by every service
beneath it. A Playwright spec proves the distinction directly — a **forged** session cookie gets
past the proxy and renders no console navigation, no table and no data.

One consequence worth recording: when the database is unreachable, `getActor()` throws and the admin
route answers 500 rather than rendering the denial page. That fails closed, which is the right
direction, so it is left as is. The e2e assertion is written as an absence — no console navigation,
no table — precisely so it holds under both outcomes rather than pinning to whichever page happens
to render.

## ADR-0030 — Components never read the clock
**Date:** 2026-09-06 · **Status:** Accepted

`Date.now()` inside a Server Component makes it impure: it renders differently on every pass, which
defeats caching and produced a `react-hooks/purity` error on the audit page. Time-dependent
questions — "the last 7 days", "how many are upcoming" — now belong to services (`listAudit`'s
`withinDays`, `countEvents`), which are already the layer that talks to the outside world. The cost
is one more service function per question; the benefit is that a page is a pure function of its
inputs, which is what makes it cacheable and testable.

## ADR-0031 — Shared-element transitions wait for React to ship them
**Date:** 2026-09-06 · **Status:** Accepted

The plan asks for View Transitions on route changes, and the strongest use here is morphing a
member's portrait from the directory card into the profile hero — the reader sees that the page
they landed on is the person they clicked. React's `<ViewTransition>` is the component that does
this, and it is **not** exported by React 19.2.4; it ships only in canary builds. Pinning this
project's React to a canary release for an animation is a bad trade: it moves the whole runtime onto
an unstable channel to buy one effect.

What ships instead is the CSS half — `view-transition-name` is set on both the card portrait and the
profile hero, and `::view-transition-*` durations come from the motion tokens — so the morph is one
import away the day React makes the component stable. The staggered list entrance and the dialog and
sheet animations are unaffected and work today.

## ADR-0032 — The design-literal check gained a file-level exemption
**Date:** 2026-09-06 · **Status:** Accepted

Transactional email must carry inline pixel values on every element: no mail client resolves CSS
custom properties and several ignore `rem`, so the tokens physically cannot reach that output.
Thirteen per-line markers would have been noise, and re-opening the legacy allowlist would have
confused two different things — that list was *debt*, and this is a permanent property of the
medium. `design-literal-allow-file:` takes a required reason on the same line; a bare marker does
not exempt anything. The checker also now tracks multi-line block comments, because CSS documents
itself in them and prose *about* the rules kept being flagged as a breach of them.

## ADR-0033 — Generated images and manifests read BRAND, not tokens
**Date:** 2026-09-06 · **Status:** Accepted

OG cards, favicons, the web app manifest and the browser theme colour are all consumed outside a
stylesheet — satori rasterises to PNG, and the manifest is JSON read by the operating system. None
of them can resolve a CSS custom property. `BRAND` and `OG` in `src/lib/site.ts` are the single
place those values are duplicated, each marked and each documented as mirroring a specific token.
One duplication in one file is maintainable; the same values scattered across six generated assets
is how palettes drift.

## ADR-0034 — Email templates are hand-written strings, not React Email
**Date:** 2026-09-06 · **Status:** Accepted

The plan specifies React Email plus Resend. Email clients are a 1998 rendering target — Outlook uses
Word's layout engine, Gmail strips `<style>` blocks — so every rule has to be inlined on the element
regardless of how the markup is authored; a React renderer produces the same inline styles through
more dependencies. There is also no mail provider configured to send with, so adding a client SDK
would add a dependency that cannot be exercised.

`src/server/email/send.ts` logs what would have been sent and returns cleanly, and `sendQuietly`
never throws: a member whose entry was approved must not see an error because the mail queue was
down. Wiring a provider is one function body. The templates themselves are real and tested,
including that user-supplied names are escaped — a member's own name reaches the template, and an
unescaped one is an injection into every inbox that receives it.

## ADR-0035 — Content-Security-Policy moved to the proxy, with a per-request nonce
**Date:** 2026-09-06 · **Status:** Accepted

The policy was a static header in `next.config.mjs` allowing `'unsafe-inline'` and `'unsafe-eval'`
on `script-src`, which gives away most of what CSP is for — an injected inline script is exactly
what the header exists to stop. It is now built in `src/proxy.ts` with a fresh nonce per request,
passed to Next through the `x-nonce` request header so it stamps its own script tags, and extended
with `'strict-dynamic'` so the allowlist need not enumerate chunk filenames.

Two things had to be right, and both were verified in a real browser: `style-src-attr
'unsafe-inline'` is required and is *separate* from `style-src` in CSP3, because this app sets
element styles from React props (the stagger index, `view-transition-name`) and without it every
such element silently loses its style; and `'unsafe-eval'` is development-only, since React uses
`eval` there to rebuild server stacks. Verified: nonces differ between requests, every injected
script carries one, zero CSP violations across four routes, hydration completes and the mobile menu
opens.

## ADR-0036 — Observability is a seam, not a half-wired SDK
**Date:** 2026-09-06 · **Status:** Accepted

`REBUILD_PLAN.md` Phase 8 specifies Sentry, and its acceptance criterion is that a deliberately
thrown error appears there within 60 seconds. There is no DSN and no account, so that criterion
cannot be met by installing the SDK either — and a half-wired reporting SDK is worse than an
explicit gap, because it *looks* like observability while reporting nothing.

`src/server/observability/report.ts` is where `Sentry.captureException` goes. What it does today is
structured JSON to stderr, which Cloudflare Logpush collects with no further work. The scrubbing is
the part that had to exist regardless and is tested: Prisma puts the whole connection string into a
failed-connection message, and that message goes straight to a log aggregator. Connection strings,
email addresses and credential-shaped tokens are redacted from both message and stack — the stack is
scrubbed rather than dropped, because the stack is the whole value of a report.

## ADR-0037 — Performance budgets are configured but not yet enforced
**Date:** 2026-09-06 · **Status:** Accepted, with an action for the owner

`lighthouserc.json` carries the plan's budgets as hard failures — LCP < 2.0s, CLS < 0.05, INP <
200ms, script weight < 180KB, and ≥95 on all four Lighthouse categories — and they are deliberately
absolute rather than relative to a previous run, because a budget that ratchets against yesterday
accepts any amount of slow decline.

The `budgets` job in `ci.yml` is `if: false`. Measuring an empty directory would pass every budget
and prove nothing: the numbers only mean something against the seeded 200 members, and CI has no
database yet. Turning it on is one line once CI has one, and it should be turned on before the
budgets are treated as protection rather than intent.

## ADR-0038 — The restore drill has not been performed, and that is recorded as a gap
**Date:** 2026-09-06 · **Status:** Open — blocking real member data

The plan is explicit that an untested backup is not a backup, and it is right. `docs/RUNBOOK.md`
carries the dump and restore procedure and a drill log with **no entries**, because no database was
available in the environment where this was written and running the drill against a description of
a database proves nothing.

The step most likely to fail is not the dump: it is whether `Member.searchVector` — a Postgres
generated column that Prisma does not manage — survives the round trip along with its GIN index.
Losing it silently disables search rather than erroring. That check is written into the drill steps
for exactly that reason.

## ADR-0039 — Leadership is its own entity, not a `Member` with a flag
**Date:** 2026-09-06 · **Status:** Accepted

The page naming the people behind the network could have been two rows in `Member` with a `kind` of
`LEADER`. It is a separate `LeadershipProfile` table instead, because the two entities answer
different questions and are governed by different rules: a directory entry is *submitted* by its
subject and *reviewed*, while a leadership profile is written by reviewers and speaks in the
institution's own voice. It carries published documents, which no directory entry does, and it must
never appear in a directory query.

Folding them together would mean every directory filter, the search vector, the approval queue and
the sitemap growing a "…and not the leaders" exception. That is precisely the category branching
the `Alumnus`/`Speaker` unification removed (ADR-0011), and re-introducing it for a page with one
row would be trading a table for a permanent tax on every query.

The policy layer reflects the difference: `leadership:update` has no ownership branch at all. There
is no "my own" version of a page that speaks for the institution.

## ADR-0040 — The profile is plain text with two rendering rules, not a rich-text editor
**Date:** 2026-09-06 · **Status:** Accepted

`bio`, `focusAreas` and `initiatives` are plain `Text`. A blank line separates paragraphs; one item
per line makes a list. Both rules are stated on the field in the console, and both are applied in
`domain/leadership/dto.ts` so that no component ever parses prose.

A WYSIWYG field would have been friendlier for about a week. It is also a sanitisation surface that
has to be maintained forever, a second serialisation format to migrate, and a reliable source of
pasted `<span style>` from Word that fights the type scale. What is actually being edited is four
paragraphs and two lists.

The cost is honest and worth recording: there is no way to bold a word, and adding one later means
choosing a markup format and a renderer, not just swapping the input.

## ADR-0041 — The console's subdomain redirects; it never rewrites paths
**Date:** 2026-09-06 · **Status:** Accepted

`NEXT_PUBLIC_ADMIN_HOST` puts the console on its own hostname. Unset — which is the state until a
domain exists — every rule is a no-op and the app behaves exactly as before.

The tempting implementation is to rewrite `/` to `/admin` on that host, so the console lives at
`admin.example.org/members`. It was rejected. A rewrite means every link in the console has to know
which hostname it was rendered on, and the first one that forgets sends a reviewer to a 404 on a
domain that cannot be reproduced locally. `src/server/hosting.ts` therefore only ever *redirects*:
the bare subdomain opens `/admin`, public paths on the admin host bounce to the public host,
`/admin` on the public host is 308'd to the subdomain. URLs read `admin.example.org/admin/members`,
which is mildly redundant and completely predictable.

Two consequences that are easy to miss and are handled: a session cookie set on the public host is
not sent to a subdomain, so `/sign-in` is served on the admin host too and `SESSION_COOKIE_DOMAIN`
exists for deployments that would rather share one session across both; and `robots.ts` returns
`Disallow: /` on the admin host, because serving the public site's robots.txt there invites the
indexing of a hostname that only ever answers with a sign-in form.

The rules are pure and unit-tested in `src/domain/__tests__/hosting.test.ts`. That is not
belt-and-braces: no domain exists yet, so the tests are the only thing standing between the
configuration and a reviewer locked out of a host nobody can reach.

## ADR-0042 — Two designated administrator addresses, reconciled at every sign-in
**Date:** 2026-09-06 · **Status:** Accepted

`src/server/administrators.ts` names two addresses that hold the register by standing arrangement.
An account created with one of them is SUPERADMIN from its first request, by password or by Google,
and the role is reasserted on every subsequent sign-in.

Reconciling on sign-in rather than only at registration is the point: it covers an account that
existed before the list did, a restored backup, and an accidental demotion. "The first account to
register becomes SUPERADMIN" remains, but it is a bootstrap that works exactly once on an empty
database and answers nothing about who is in charge afterwards.

Because the role is reasserted, the console must not offer to change it — a control that appears to
work and silently reverts at the next sign-in is worse than one that refuses. `can()` refuses via
`targetIsProtected`, which the caller computes; the policy module stays pure and never learns what
an email address is. The users table shows the reason next to the name rather than presenting a
dead control.

`ADMIN_EMAILS` can add addresses per deployment but cannot remove the two: an environment variable
is not where "who runs this institution" should be decided.

## ADR-0043 — Every upload now records a `MediaAsset` row
**Date:** 2026-09-06 · **Status:** Accepted

Uploads previously wrote an object to the bucket and returned a URL, recording nothing. `MediaAsset`
existed in the schema, was referenced by three foreign keys, and had never held a row — so
`/admin/media` listed a table that could not be populated, and an uploaded file had no owner, no
size and no way to be found again.

`domain/media/service.ts` now writes the row as part of the upload and returns its id, which is what
`LeadershipMedia` stores. Two follow-ons worth stating: rows predating this change do not exist and
will not be back-filled, because inventing an uploader and a date for them would be inventing
audit data; and a failure between the object write and the row write leaves an orphan object in the
bucket, which is the correct way round — an unreferenced file costs storage, a row pointing at a
file that was never stored costs a broken page.

## ADR-0044 — Environment values are normalised before they are validated
**Date:** 2026-09-06 · **Status:** Accepted

The Cloudflare build failed with `NEXT_PUBLIC_SUPABASE_URL: Invalid URL`. The URL was correct; it
was wrapped in quotes. `.env.local` is parsed by dotenv, which strips them — a hosting dashboard is
a plain text field, which does not. Copying the line out of one and into the other is the obvious
thing to do and produces an error message that points at the URL rather than at the two characters
around it.

`src/server/env-value.ts` now trims and strips one layer of matching quotes from every declared
variable before the schema sees it, and blank-after-trimming is read as absent. Stripping is safe
because no value this app reads legitimately begins and ends with the same quote character; it is
deliberately not extended to guessing a missing scheme, because `abc.supabase.co` could become
`https://` or `http://` and silently pointing the app at a host nobody named is worse than failing.
The error message now names both pitfalls.

It is a separate module from `env.ts` because `env.ts` validates on import and throws: a pure string
helper must not be reachable only through a module that can refuse to load, which is also what makes
it testable.

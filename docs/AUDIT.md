# docs/AUDIT.md — Phase 0 Baseline Audit

**Date:** 2026-09-05
**Commit audited:** `25fdbe4` (branch `main`, working tree with untracked `.env.example`, `REBUILD_PLAN.md`)
**Scope:** whole repository, read end to end. No application code was changed in this phase.

> **Environment caveat, stated up front:** `node_modules/` is not installed in this checkout
> (`ls node_modules/.bin` → no such directory). Version numbers below are therefore read from
> `package.json` ranges + `package-lock.json`, not from resolved installs. This also means the
> baseline screenshots and Lighthouse runs required by Phase 0 could **not** be produced here —
> see [§9](#9-baseline-artefacts-not-captured--action-required) for the exact blocker and the
> commands to run.

---

## 1. Tailwind version and config location

| Question | Answer |
|---|---|
| Version | **Tailwind CSS v4** — `package.json:36` `"tailwindcss": "^4"`, with `package.json:26` `"@tailwindcss/postcss": "^4"` |
| Config file | **None.** There is no `tailwind.config.{js,ts,mjs}` anywhere in the repo. |
| How it is wired | `postcss.config.mjs:1-7` registers only `@tailwindcss/postcss`. Configuration is CSS-first via the `@theme` block in `src/app/globals.css:3-21`. |

The plan's assumption (v4, inferred from the 94-byte `postcss.config.mjs`) is **confirmed**.
v4's CSS-first `@theme` model is exactly what Phase 1's `src/styles/tokens.css` needs — no config
migration is required, only a much larger token block.

## 2. `src/app/globals.css` — full contents and purpose

53 lines, 1,010 bytes. It does four things:

| Lines | What |
|---|---|
| `globals.css:1` | `@import "tailwindcss"` |
| `globals.css:3-21` | `@theme inline` — 4 brand colours, 2 font vars, 5 breakpoint overrides |
| `globals.css:23-35` | `:root` background/foreground pair + a `body` rule |
| `globals.css:37-53` | A `marquee` keyframe animation and its `.animate-marquee` / `:hover` pause |

**Design tokens present:** four colours only —
`--color-brand-navy: #0C1A30`, `--color-brand-cream: #FDFBF7`, `--color-brand-saffron: #D98A29`,
`--color-brand-gold: #C5A059` (`globals.css:7-10`).

**Design tokens absent:** every spacing value, every radius, every shadow, every duration, every
easing curve, every type size, every tracking/leading value, every z-index. There is no scale of
any kind. This is the structural cause of the "no system" diagnosis, and it is confirmed.

**One notable finding not in the plan** — `globals.css:15-20` collapses *all five* Tailwind
breakpoints to `1024px`:

```css
--breakpoint-sm: 1024px;  --breakpoint-md: 1024px;  --breakpoint-lg: 1024px;
--breakpoint-xl: 1024px;  --breakpoint-2xl: 1024px;
```

The site therefore has exactly two layouts, and every `md:`/`lg:`/`xl:` utility in the codebase
fires at the same width. Any `sm:` utility written expecting ~640px is silently a desktop-only
rule. This must be an explicit decision in Phase 1, not an inherited accident.

## 3. How Clerk roles/permissions are read — **two divergent authorities**

There is no single source of truth for authorisation. Two independent mechanisms exist:

**Authority A — the Prisma `User.role` enum (used by 15 of 16 call sites).**
`prisma/schema.prisma:17` `role Role @default(USER)`, enum `USER | ADMIN | SUPERADMIN`
(`schema.prisma:30-34`). Every check re-queries the DB by `clerkId` and compares uppercase strings.

**Authority B — Clerk `sessionClaims.metadata.role` (used by exactly one route).**
`src/app/api/admin/upload/route.ts:9-16` reads `sessionClaims?.metadata as { role?: string }` and
compares against the **lowercase** literal `"admin"`.

Nothing in the repository ever *writes* Clerk `publicMetadata`/`privateMetadata` — the only two
references to `sessionClaims` in `src/` are the two lines above. So unless that metadata is set by
hand in the Clerk dashboard, `POST /api/admin/upload` returns 403 for every caller including
SUPERADMINs. It is, in effect, dead code guarding a second and incompatible role vocabulary.

### Every place a role string is compared

| # | Location | Comparison |
|---|---|---|
| 1 | [src/app/admin/layout.tsx:43](src/app/admin/layout.tsx#L43) | `role !== 'ADMIN' && role !== 'SUPERADMIN'` |
| 2 | [src/app/directory/page.tsx:22](src/app/directory/page.tsx#L22) | `role === 'ADMIN' \|\| role === 'SUPERADMIN'` |
| 3 | [src/app/api/directory/route.ts:48](src/app/api/directory/route.ts#L48) | auto-approve if admin |
| 4 | [src/app/api/directory/route.ts:65](src/app/api/directory/route.ts#L65) | auto-approve if admin |
| 5 | [src/app/api/directory/[id]/route.ts:11](src/app/api/directory/%5Bid%5D/route.ts#L11) | PUT guard |
| 6 | [src/app/api/directory/[id]/route.ts:76](src/app/api/directory/%5Bid%5D/route.ts#L76) | DELETE guard |
| 7 | [src/app/api/directory/[id]/approve/route.ts:14](src/app/api/directory/%5Bid%5D/approve/route.ts#L14) | PATCH guard |
| 8 | [src/app/api/users/route.ts:38](src/app/api/users/route.ts#L38) | GET guard |
| 9 | [src/app/api/users/[id]/route.ts:12](src/app/api/users/%5Bid%5D/route.ts#L12) | DELETE guard |
| 10 | [src/app/api/users/[id]/route.ts:31](src/app/api/users/%5Bid%5D/route.ts#L31) | admin-cannot-delete-superadmin |
| 11 | [src/app/api/users/[id]/role/route.ts:14](src/app/api/users/%5Bid%5D/role/route.ts#L14) | PATCH guard |
| 12 | [src/app/api/users/[id]/role/route.ts:21](src/app/api/users/%5Bid%5D/role/route.ts#L21) | payload role validation (hand-rolled) |
| 13 | [src/app/api/users/[id]/role/route.ts:37](src/app/api/users/%5Bid%5D/role/route.ts#L37) | admin-cannot-demote-superadmin |
| 14 | [src/app/api/users/[id]/permissions/route.ts:12](src/app/api/users/%5Bid%5D/permissions/route.ts#L12) | PATCH guard |
| 15 | [src/app/api/events/route.ts:15](src/app/api/events/route.ts#L15) | admins see unapproved |
| 16 | [src/app/api/events/route.ts:45](src/app/api/events/route.ts#L45) | POST guard (+ `canCreateEvents`) |
| 17 | [src/app/api/events/[id]/route.ts:12](src/app/api/events/%5Bid%5D/route.ts#L12) | DELETE guard (+ `canCreateEvents`) |
| 18 | [src/app/api/events/[id]/route.ts:34](src/app/api/events/%5Bid%5D/route.ts#L34) | PATCH guard (+ `canCreateEvents`) |
| 19 | [src/app/api/admin/upload/route.ts:14](src/app/api/admin/upload/route.ts#L14) | **Clerk metadata, lowercase `"admin"`** |
| 20 | [src/app/events/page.tsx:47](src/app/events/page.tsx#L47) | client-side UI gate |
| 21 | [src/app/admin/page.tsx:542-578](src/app/admin/page.tsx#L542-L578) | client-side UI gates + badge colours |
| 22 | [src/app/api/users/route.ts:31,66](src/app/api/users/route.ts#L31) | bootstrap: first user → `SUPERADMIN` |
| 23 | [src/app/api/users/me/route.ts:38](src/app/api/users/me/route.ts#L38) | bootstrap: first user → `SUPERADMIN` |

**21 server-side comparisons across 12 files.** Every one is `dbUser.role !== 'ADMIN' && dbUser.role !== 'SUPERADMIN'`
written out longhand, each preceded by its own `prisma.user.findUnique({ where: { clerkId } })`.
There is no `can()`, no shared guard, no helper. Phase 3's `server/policy.ts` replaces all 21.

Clerk `auth()` is imported in **16 files** (`src/middleware.ts` plus 15 route/action/page files) —
Phase 3's rule that only `server/auth.ts` may import it means 15 files change.

## 4. Prisma models, relations and indexes

`prisma/schema.prisma`, 98 lines, 5 models, 1 enum. **`prisma/migrations/` does not exist** — the
schema has never been migrated; it is presumably pushed with `db push`. Phase 4's "named,
forward-only migrations" starts from zero history.

`datasource db` (`schema.prisma:5-7`) declares **no `url`** — the connection string is injected by
`prisma.config.ts:12` (`DIRECT_URL || DATABASE_URL`). That works for CLI but means the schema file
alone is not self-describing.

| Model | Fields | Relations | Indexes |
|---|---|---|---|
| `User` (`:12-28`) | `id`, `clerkId`, `email`, `username?`, `role`, `createdAt`, `canCreateEvents` | 1-to-many → `Alumnus`, `Speaker`, `Testimonial`, `Event` | `@unique` on `clerkId` (`:14`), `email` (`:15`). **No others.** |
| `Alumnus` (`:39-55`) | `name`, `category`, `cohort`, `bio`, `avatarUrl?`, `videoUrl?`, `socialLinks Json?`, `email?`, `story?`, `recommendation?`, `isApproved`, `createdAt` | `addedBy → User` (`:52`) | **None — not even on the `addedById` FK.** |
| `Speaker` (`:57-68`) | `name`, `title`, `bio`, `avatarUrl?`, `email?`, `isApproved`, `createdAt` | `addedBy → User` (`:65`) | **None.** |
| `Testimonial` (`:70-80`) | `authorName`, `role`, `content`, `videoUrl?`, `createdAt` | `addedBy → User` (`:78`) | **None.** Model is written but **never read or written by any code in `src/`.** |
| `Event` (`:85-98`) | `title`, `location`, `date DateTime`, `time String`, `description?`, `imageUrl?`, `isHighlighted`, `isApproved`, `createdAt` | `addedBy → User` (`:95`) | **None.** |

**Zero `@@index` declarations exist in the entire schema.** Every foreign key is unindexed. Every
`isApproved` filter (the single most common predicate in the app) is a sequential scan. Every
`orderBy: { name: 'asc' }` / `{ createdAt: 'desc' }` / `{ date: 'asc' }` sorts unindexed.

Further modelling defects relevant to Phase 4:

- **`Alumnus` and `Speaker` are the same entity** split into two tables, then re-merged in
  application code at [directory/page.tsx:38-67](src/app/directory/page.tsx#L38-L67) and again at
  [page.tsx:21-24](src/app/page.tsx#L21-L24). Every route that touches the directory branches on a
  `category`/`roleType`/`type` string to pick a table. This is the root cause of the duplicated
  branching across `api/directory/*`.
- **`Event.date DateTime` + `Event.time String`** (`schema.prisma:89-90`) — the time of an event is
  stored as free text with no timezone anywhere. For an international network this cannot render
  correctly for any viewer. Phase 4's `startsAt` UTC + IANA `timezone` is a correctness fix.
- `Alumnus.socialLinks Json?` (`:47`) — the untyped blob the plan predicted.
- `Alumnus.category` and `Speaker.title` are free-text with no controlled vocabulary.
- No `slug`, no `deletedAt`, no `status` enum (only a boolean `isApproved`), no `updatedAt` on any
  model, no `AuditLog`, no `MediaAsset`.

## 5. Per-route rendering model and data-fetch location

| Route | File | Component kind | Where data comes from |
|---|---|---|---|
| `/` | [src/app/page.tsx:1](src/app/page.tsx#L1) | **Client** (`"use client"`) | `fetch('/api/directory')` in `useEffect` ([page.tsx:17-40](src/app/page.tsx#L17-L40)), seeded with **three hardcoded fake members** ([page.tsx:9-14](src/app/page.tsx#L9-L14)) |
| `/directory` | [src/app/directory/page.tsx:14](src/app/directory/page.tsx#L14) | **Server** (`force-dynamic`, `:12`) | Direct Prisma in the page ([:29-36](src/app/directory/page.tsx#L29-L36)), passed to `DirectoryClient` |
| `/directory/[id]` | [src/app/directory/[id]/page.tsx:40](src/app/directory/%5Bid%5D/page.tsx#L40) | **Server** | Direct Prisma ([:47-51](src/app/directory/%5Bid%5D/page.tsx#L47-L51)); `generateMetadata` re-queries the same rows ([:15-18](src/app/directory/%5Bid%5D/page.tsx#L15-L18)) — **4 queries per page view** |
| `/events` | [src/app/events/page.tsx:1](src/app/events/page.tsx#L1) | **Client** | `fetch('/api/events')` + `fetch('/api/users/me')` on mount ([:31,43](src/app/events/page.tsx#L31)) |
| `/admin` | [src/app/admin/page.tsx:1](src/app/admin/page.tsx#L1) | **Client** | Three `useEffect` fetches: `/api/directory`, `/api/users`, `/api/events` ([:89-127](src/app/admin/page.tsx#L89-L127)) |
| `/admin` (layout) | [src/app/admin/layout.tsx:6](src/app/admin/layout.tsx#L6) | **Server** | Direct Prisma for the role gate ([:41](src/app/admin/layout.tsx#L41)) |
| `/about` | src/app/about/page.tsx | **Server** | Static content |
| `/mentorship` | src/app/mentorship/page.tsx | **Client** | Static content (client-only for `framer-motion`) |
| `/success-stories` | src/app/success-stories/page.tsx | **Client** | Static content (client-only for `framer-motion`) |
| `/sign-in`, `/sign-up` | catch-all routes | **Server** | Clerk components |

**The plan's assumption is confirmed and is worse than stated.** The home page and admin console
both client-fetch on mount. The directory list *is* server-rendered — but `export const dynamic = "force-dynamic"`
([directory/page.tsx:12](src/app/directory/page.tsx#L12)) disables caching outright, so every
request runs two unindexed table scans. There is no `unstable_cache`, no `revalidateTag`, and no
`Suspense` boundary anywhere in `src/`.

**There are zero `loading.tsx`, `error.tsx` and `not-found.tsx` files in the entire `src/app` tree**
(verified by `find`). Confirmed.

## 6. Authentication and authorisation, per endpoint

Middleware ([src/middleware.ts:4](src/middleware.ts#L4)) protects only `/admin(.*)` and
`/api/admin(.*)`. **Every other API route is reachable unauthenticated** and relies entirely on its
own in-handler checks.

| Endpoint | Method | Authenticates? | Authorises? | Verdict |
|---|---|---|---|---|
| `/api/backfill` | GET | ❌ | ❌ | 🔴 **CRITICAL** |
| `/api/directory` | GET | ❌ | ❌ | 🔴 **CRITICAL** (data exposure) |
| `/api/directory` | DELETE | ✅ | ❌ | 🔴 **CRITICAL** |
| `/api/directory` | POST | ✅ | n/a (self-submit) | 🟡 no validation |
| `/api/directory/[id]` | PUT | ✅ | ✅ admin | 🟡 no validation |
| `/api/directory/[id]` | DELETE | ✅ | ✅ admin | ✅ |
| `/api/directory/[id]/approve` | PATCH | ✅ | ✅ admin | ✅ |
| `/api/events` | GET | optional | n/a | ✅ |
| `/api/events` | POST | ✅ | ✅ admin \| `canCreateEvents` | 🟡 no validation |
| `/api/events/[id]` | DELETE | ✅ | ✅ admin \| `canCreateEvents` | 🟠 over-broad |
| `/api/events/[id]` | PATCH | ✅ | ✅ admin \| `canCreateEvents` | 🟠 over-broad |
| `/api/users` | GET | ✅ | ✅ admin | 🟠 side-effecting GET |
| `/api/users/me` | GET | ✅ | n/a (self) | 🟠 privilege bootstrap |
| `/api/users/[id]` | DELETE | ✅ | ✅ admin (+ self/superadmin guards) | ✅ |
| `/api/users/[id]/role` | PATCH | ✅ | ✅ admin (+ self/superadmin guards) | 🟡 last-admin unguarded |
| `/api/users/[id]/permissions` | PATCH | ✅ | ✅ admin | 🟡 no validation |
| `/api/upload` | POST | ✅ | ❌ any signed-in user | 🟠 unrestricted upload |
| `/api/admin/upload` | POST | ✅ | ⚠️ Clerk metadata (divergent) | 🟠 dead + divergent |
| `createDirectoryEntry` (action) | — | ✅ | ❌ any signed-in user | 🟠 |

### The findings that matter

**🔴 1. `GET /api/backfill` — unauthenticated mass mutation.**
[api/backfill/route.ts:4-24](src/app/api/backfill/route.ts#L4-L24). No `auth()` call at all. Two
bare `updateMany({ data: { isApproved: true } })` — **no `where` clause**. Any anonymous visitor
who requests this URL approves and publishes every alumnus and every speaker in the database,
including rejected and pending ones. It is a GET, so a prefetch, a crawler, or an image tag is
enough to fire it. This route should be deleted, not fixed.

**🔴 2. `GET /api/directory` — unapproved member data served to the public.**
[api/directory/route.ts:79-88](src/app/api/directory/route.ts#L79-L88) does
`findMany({ orderBy })` with **no `isApproved` filter and no auth**, returning full rows —
including the `email` contact field and unpublished `story`/`recommendation` text — for every
pending and rejected profile. The home page then filters `isApproved !== false` *on the client*
([page.tsx:21-22](src/app/page.tsx#L21-L22)), which hides the rows visually while shipping them in
the network response. Meanwhile the server-rendered `/directory` page *does* filter correctly
([directory/page.tsx:27](src/app/directory/page.tsx#L27)) — so the two paths disagree, and the
insecure one is the one the public home page uses.

**🔴 3. `DELETE /api/directory?id=&category=` — authenticated but not authorised.**
[api/directory/route.ts:90-118](src/app/api/directory/route.ts#L90-L118) checks `userId` and then
deletes. **Any signed-in user can hard-delete any profile in the directory** with a single request.
The sibling route `DELETE /api/directory/[id]` at [:70-101](src/app/api/directory/%5Bid%5D/route.ts#L70)
does the admin check correctly — this is precisely the "the Nth+1 endpoint is where the breach
happens" failure the plan predicts, and it has already happened.

**🟠 4. Privilege bootstrap: first-caller-becomes-SUPERADMIN.**
Three places auto-create the calling user with `role: isFirstUser ? 'SUPERADMIN' : 'USER'` where
`isFirstUser = (await prisma.user.count()) === 0`:
[api/users/me/route.ts:25-40](src/app/api/users/me/route.ts#L25-L40),
[api/users/route.ts:18-34](src/app/api/users/route.ts#L18-L34), and again inside the sync loop at
[api/users/route.ts:47-68](src/app/api/users/route.ts#L47-L68). If the `User` table is ever emptied
— and `remove-admins.ts` in the repo root exists to delete users — the next person to load any page
that calls `/api/users/me` silently becomes SUPERADMIN. `GET /api/users/me` requires only a valid
session, which anyone can create via the open sign-up page.

**🟠 5. `GET /api/users` performs writes.** [api/users/route.ts:42-73](src/app/api/users/route.ts#L42-L73)
runs an unbounded `clerkClient().users.getUserList()` and upserts every Clerk user into Postgres —
inside a GET handler, on every admin dashboard load, with no pagination (Clerk's default page size
is 10, so the sync is also silently incomplete). A GET must not mutate.

**🟠 6. `canCreateEvents` grants delete and edit rights over *other people's* events.**
[api/events/[id]/route.ts:12,34](src/app/api/events/%5Bid%5D/route.ts#L12) — the permission reads
as "may create events" but is checked for DELETE and PATCH with no ownership test, so any user
granted it can modify or destroy every event in the system.

**🟠 7. `POST /api/upload` — any signed-in user, no constraints.**
[api/upload/route.ts:19-45](src/app/api/upload/route.ts#L19-L45). No file-type allowlist, no size
limit, no rate limit; `contentType` is taken from the client and the file lands in a public
Supabase bucket whose URL is returned. Filename is `Date.now()`-prefixed
([:36](src/app/api/upload/route.ts#L36)) — concurrent uploads of the same name in the same
millisecond collide, and `upsert: false` makes that a hard failure.

**🟡 8. No request-body validation anywhere.** There is no zod/valibot dependency in
`package.json` and no `lib/validations` directory. Every handler destructures `await req.json()`
and passes fields to Prisma. [api/events/[id]/route.ts:47](src/app/api/events/%5Bid%5D/route.ts#L47)
even builds `const dataToUpdate: any = {}`. Confirmed as stated in the plan.

**🟡 9. Routes return raw Prisma models.** `POST /api/directory` returns the created row verbatim
([:51,68](src/app/api/directory/route.ts#L51)); `GET /api/users` selects `clerkId` and `email`
into the client payload ([:77-85](src/app/api/users/route.ts#L77-L85)). No DTO layer exists.

**🟡 10. `PATCH /api/users/[id]/role` blocks self-demotion ([:27](src/app/api/users/%5Bid%5D/role/route.ts#L27))
but nothing prevents demoting the *last* remaining admin** — two admins can lock each other out.

### Repo-root scripts that are part of the same problem

- **`promote.mjs:10-12`** — `prisma.user.updateMany({ data: { role: 'SUPERADMIN' } })` with **no
  `where`**. Running it makes every user in the database a SUPERADMIN. `promote.ts:9-13` does the
  same in a loop.
- **`remove-admins.ts:5-8`** — hardcodes two real personal email addresses and deletes those users.
- **`list-users.ts`** — dumps every user's email and role to stdout.
- **`clerk_exports.txt`** — 53 lines of UTF-16 scratch output listing Clerk's exported component
  names. Contains no credentials, but is committed noise.

These four files are committed to `main` and are not referenced by `package.json` scripts. They
should be deleted or moved to an ignored `scripts/` directory with `where` clauses added.

## 7. `AddEntryModal.tsx` vs `EditEntryModal.tsx`

**Confirmed duplication.** 10,807 B vs 10,704 B; `diff` reports **185 changed lines out of ~250** —
but that number overstates the difference, because the bulk of it is whitespace: the Edit variant
drops the `!isSignedIn` branch, so its entire form body is de-indented by one level.

The genuine, semantic deltas are five:

| # | Delta | Lines |
|---|---|---|
| 1 | Props: `{ isSignedIn }` vs `{ member: DirectoryMember }` | Add:8-12 / Edit:8-12 |
| 2 | `useState('')` initialisers vs `useState(member.x ?? '')` | Add:18-26 / Edit:18-26 |
| 3 | `POST /api/directory` vs `PUT /api/directory/${member.id}` (+ `roleType` in body) | Add:59 / Edit:54 |
| 4 | Add wraps the form in a `!isSignedIn → <SignIn routing="hash" />` branch | Add:109-116 |
| 5 | Add has a `try/catch` around `res.json()`; **Edit does not** — a non-JSON error response (a 500 HTML page, a 413) throws an unhandled rejection and the modal hangs in `isUploading` | Add:39-45 vs Edit:41 |

Everything else — every label, every input, every className string, the upload handler, the error
display, the submit button — is byte-identical. Item 5 is a live bug that exists *because* of the
copy-paste: the fix was applied to one copy only.

`AddEventModal.tsx` / `EditEventModal.tsx` are the same story at smaller scale (29 differing lines).

**Phase 2 consequence:** one `<MemberForm mode="create" | "edit" defaultValues>` component replaces
both pairs. Four files become two.

## 8. `src/lib/s3.ts` — R2 or AWS?

**Cloudflare R2 idiom, but it is not the live upload path.**

[src/lib/s3.ts:7-14](src/lib/s3.ts#L7-L14) constructs `new S3Client({ region: "auto", endpoint: process.env.S3_ENDPOINT, … })`.
`region: "auto"` with an explicit custom `endpoint` is R2's documented configuration; genuine AWS
S3 requires a real region and no endpoint override. `.env.example:27` labels the block
`"Optional / Cloudflare R2 or S3"` and ships `S3_ENDPOINT=""`, so the endpoint is what decides it
at runtime and it is currently unset.

The important finding is that **the app has two storage backends and uses the wrong one**:

- `s3Client` is imported by exactly one file — [api/admin/upload/route.ts:5](src/app/api/admin/upload/route.ts#L5),
  which presigns a `PutObjectCommand`. That route is the one gated behind the unreachable Clerk-metadata
  check (§3), so **the R2/S3 path is effectively dead code**.
- Every actual upload in the UI — both entry modals, both event modals, the admin console — posts
  to `POST /api/upload`, which writes to a **public Supabase Storage bucket named `profiles`**
  ([api/upload/route.ts:39-55](src/app/api/upload/route.ts#L39-L55)) using the service-role key.

So R2 is configured, S3 credentials are wired through CI (`deploy.yml:37-40`), and neither is used.
Phase 7's "R2 + Cloudflare Images" pipeline should be treated as a migration off Supabase Storage,
not as new configuration. `next.config.mjs:32-36` already allows both hostnames.

## 9. Baseline artefacts — not captured, action required

Phase 0 asks for full-page screenshots at 390/768/1440 and Lighthouse runs on four routes. **Neither
could be produced in this session**, for three compounding reasons:

1. `node_modules/` is not installed — there is no `next`, no build, no dev server.
2. No browser automation is available in this environment (no Playwright, no Chrome, no `lighthouse` binary).
3. Even with those, every meaningful route needs a live `DATABASE_URL` and Clerk keys; `/directory`
   is `force-dynamic` against Postgres and `/admin` requires an authenticated SUPERADMIN session.

`docs/baseline/README.md` contains the exact commands to generate both artefacts. This is the one
Phase 0 acceptance criterion that is **not** met, and it should be closed before Phase 1 begins —
without a before-state there is nothing to measure the rebuild against.

## 10. Additional findings not anticipated by the plan

These emerged from reading and are worth folding into the plan before Phase 1.

**A. `/directory/[id]` is styled for a dark theme that no longer exists.** The page paints
`text-white` on `h1` ([:88](src/app/directory/%5Bid%5D/page.tsx#L88)), `text-slate-400` body
([:105](src/app/directory/%5Bid%5D/page.tsx#L105)) and a `bg-slate-900/40` card
([:67](src/app/directory/%5Bid%5D/page.tsx#L67)) — all sitting on the cream `#FDFBF7` body set in
[layout.tsx:46](src/app/layout.tsx#L46). White heading text on a cream background is invisible or
near-invisible. Both entry modals are likewise dark-themed (`bg-black/40 text-white`) while the rest
of the app is light. The recent commit `8c2be4e` ("implement light theme") appears to have converted
some surfaces and missed these. **This is a live visual defect on a primary route, not a taste issue.**

**B. `/directory/[id]` serves unapproved profiles.** [:47-51](src/app/directory/%5Bid%5D/page.tsx#L47-L51)
looks up by id with no `isApproved` and no auth check, so any pending or rejected profile is
publicly readable at its direct URL.

**C. The home page ships fabricated members.** [page.tsx:9-14](src/app/page.tsx#L9-L14) seeds state
with three invented people ("Dr. Arvind Ramesh, Senior Scientist, ISRO"; "David Chen, VP of
Engineering, Google") complete with invented quotes. They render on every first paint before the
fetch resolves, and permanently whenever the fetch fails or the directory is empty. Presenting
fictional people as members of a real institution's register is a credibility and integrity
problem well before it is a design problem. Remove in Phase 5.4; do not carry the pattern forward.

**D. `next.config.mjs` already ships a strong CSP** (`:2-26`) including HSTS, `X-Frame-Options`,
`Referrer-Policy` and `Permissions-Policy` — Phase 8 item 4 is roughly half done. Caveats: the
policy allows `'unsafe-eval'` and `'unsafe-inline'` on `script-src` (`:4`), so nonces are still the
real work; `font-src 'self' data:` will need no change once fonts are self-hosted in Phase 1; and
`connect-src` (`:9`) does **not** include Supabase, which is why uploads must proxy through
`/api/upload` rather than going direct.

**E. `Testimonial` is a dead model.** Declared at `schema.prisma:70-80`, never referenced anywhere
in `src/`. Meanwhile `/success-stories` renders hardcoded content. Phase 4's `SuccessStory` should
replace it and the page should read from the database.

**F. `framer-motion` forces four pages to be Client Components** — `/`, `/mentorship`,
`/success-stories`, `/events` are all `"use client"` and ship the whole animation runtime, mostly
for entrance fades. Phase 7's motion budget should reckon with removing this dependency rather than
building on it; CSS animations plus the View Transitions API cover the specified motion set.

**G. `wrangler.toml:13-14` sets `[observability] enabled = false`** — Cloudflare's own logs are
switched off. Phase 8 should turn this on first; it is a one-line change.

**H. `README.md` is still the unmodified `create-next-app` boilerplate.** Same class of tell as
the starter SVGs.

---

## Verification summary

| # | Plan assumption | Verdict |
|---|---|---|
| 1 | Tailwind v4 | ✅ Confirmed (`^4`, no config file, `@theme` in `globals.css`) |
| 2 | `globals.css` holds no real tokens | ✅ Confirmed — 4 colours, nothing else; plus all breakpoints pinned to 1024px |
| 3 | Clerk role/permission surface | ⚠️ Worse — **two** divergent authorities, 21 scattered comparisons |
| 4 | Prisma models lack indexes | ✅ Confirmed — **zero** `@@index` in the schema; also zero migrations |
| 5 | Directory client-fetches on mount | ⚠️ Mixed — `/directory` is a Server Component but `force-dynamic`; `/` and `/admin` do client-fetch |
| 6 | Some API routes miss auth | ✅ Confirmed — 3 critical: `/api/backfill`, `GET /api/directory`, `DELETE /api/directory` |
| 7 | Add/Edit modals duplicate one form | ✅ Confirmed — 5 semantic deltas, one of them a bug fixed in only one copy |
| 8 | `s3.ts` targets R2 | ✅ Confirmed R2 idiom — but unused; live uploads go to Supabase Storage |

**Where Phase 0 overrides the plan:** the plan sequences Phase 3 (authorisation) fourth. Findings
🔴1–🔴3 above are exploitable on the deployed site today by an anonymous or newly-signed-up
visitor. They should be patched as a hotfix before Phase 1 begins, independently of the Phase 3
refactor that will later absorb them. See `docs/DECISIONS.md` ADR-0004.

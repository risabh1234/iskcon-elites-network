# Architecture

**Next.js 16 (App Router) · React 19 · Postgres via Prisma 7 · OpenNext → Cloudflare Workers**

## The shape

```
src/
├── app/            Routing and RSC composition. Thin — no business rules.
│   ├── (admin)/    The console. Its own layout gate.
│   ├── api/        HTTP adapters over services. Under 30 lines each.
│   └── …           Public surfaces.
│
├── components/
│   ├── primitives/ 21 components. Radix for behaviour, ours for style.
│   ├── patterns/   Composites: PageHeader, MemberCard, EmptyState…
│   └── layout/     Header, Footer.
│
├── domain/         The heart. Framework-agnostic.
│   └── <entity>/   schema.ts · dto.ts · repository.ts · service.ts
│
├── server/         Cross-cutting: auth, policy, result, errors, cache,
│                   rate-limit, logger, email, observability.
│
├── styles/         tokens.css (the single source of design truth) · base.css
│
└── lib/            Pure helpers. No IO, no React.
```

## The rule that keeps it honest

```
app/     ──▶  components/, domain/, server/, lib/
domain/  ──▶  server/, lib/
domain/  ──✗──▶  app/, components/
```

Enforced by ESLint (`eslint.config.mjs`), verified by deliberate-violation probes. Note that flat
config does **not** merge rule options — the last matching block wins outright — so each exemption
re-declares the whole restriction. A new block that sets `no-restricted-imports` without doing so
would silently switch the others off.

Three imports are funnelled:

| Import | Permitted in | Why |
|---|---|---|
| `@/lib/prisma`, `@prisma/client` | `domain/*/repository.ts` | One place to cache, index and audit queries |
| `@/server/auth/session`, `@/server/auth/password` | the auth layer | "Who is the caller" has exactly one answer |
| UI (`@/app`, `@/components`) | never, from `domain/` | Business rules must be testable without React |

## Request lifecycle

```
Route handler / Server Action     parse → getActor() → call service → map Result
        ↓
domain/<x>/service.ts             can() FIRST, then rules, then invalidate tags
        ↓
domain/<x>/repository.ts          the only file that touches Prisma
        ↓
Result<Dto, AppError>             never throw across a boundary
```

Every mutating service begins with `actor.kind !== 'user'` → `Unauthenticated`, before any query. An
anonymous caller can never own anything, so the database is never touched to tell them no
(ADR-0015).

## Authorisation

`server/policy.ts` holds every rule in one pure `can(actor, action, resource)` — no database, no
session, no request, which is what makes every (role × action × ownership) combination testable. It
replaced 21 hand-written role comparisons across 12 files, three of which had no authorisation at
all.

Defence in depth, outermost first:

1. `src/proxy.ts` — redirects when no session cookie exists. **Not a control**: it cannot tell a
   forged cookie from a real one without a per-request database round trip.
2. The admin layout — `can(actor, 'admin:access')` with a resolved Actor. **This is the control.**
3. Every service method — `can()` again, with the resource in hand.

A Playwright spec proves the distinction: a forged cookie gets past (1) and renders no console.

## Data

One `Member` table with a `kind` enum; `Alumnus`/`Speaker` are gone. Soft delete (`deletedAt`)
filtered at the repository, so nothing above it can read a deleted row. Status enums, not booleans.
Events store a UTC instant plus an IANA timezone.

Search is a weighted `tsvector` generated column (name A, headline B, city C, bio D) plus `pg_trgm`
for typo tolerance, queried with raw SQL. Expertise is filtered through its indexed join rather than
being in the vector — a generated column cannot reference another table, and a trigger-maintained
one drifts (ADR-0021).

## Rendering and caching

The root layout reads the session, which makes every route dynamic — the standing cost of a
session-aware header. `server/cache.ts` wraps the previous caching model (`unstable_cache` +
two-argument `revalidateTag`); `use cache` needs `cacheComponents: true`, which changes semantics
app-wide and is a deliberate future decision (ADR-0014).

## Deploy

OpenNext → Cloudflare Workers, on push to `main`. Runtime constraints that shaped real decisions:

- **No native modules.** Password hashing is PBKDF2 via Web Crypto because bcrypt and argon2 do not
  exist there.
- **Per-isolate memory.** The rate limiter is in-process and resets on redeploy; it raises the cost
  of a script, and is not a distributed limiter. Phase 8's replacement is a Durable Object.

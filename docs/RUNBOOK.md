# Runbook

## Local setup

```bash
npm ci
cp .env.example .env.local          # fill in DATABASE_URL at minimum
npx prisma generate
npm run db:migrate                  # prisma migrate deploy
npm run db:seed                     # 200 members, 30 events, 20 stories
node scripts/set-password.mjs you@example.com '<a long passphrase>' --superadmin
npm run dev
```

The seeded admin (`admin@example.com`) has **no password** on purpose — a seeded credential has a
way of surviving into production. Use `set-password.mjs`.

## Deploy

Push to `main`. `.github/workflows/deploy.yml` builds with OpenNext and deploys to Cloudflare
Workers. `ci.yml` runs independently on every pull request and push.

### Rollback

```bash
npx wrangler deployments list
npx wrangler rollback --message "reason"
```

Rolling back code does **not** roll back a migration. If the bad deploy included one, restore the
database first (below), then roll back.

## Checks

```bash
npm run ci            # design tokens → lint → tests+coverage → build
npm run check:a11y    # axe, needs a server running
npm run e2e           # Playwright access-control specs
curl -s /api/health   # 200 ok · 503 degraded (database unreachable)
```

Point the uptime monitor at `/api/health` and alert on 503 or on two consecutive timeouts. It checks
the database, so a 200 means the app can actually serve — which is the only useful definition.

## Common incidents

**Nobody can sign in.** Check `/api/health`. If degraded, it is the database, not auth. If healthy,
check that `DATABASE_URL` and the Google keys survived the last deploy — `src/server/env.ts` fails
the build on a missing var, so a *running* app has them.

**An administrator is locked out.** `node scripts/set-password.mjs <email> <pw> --superadmin`. This
also revokes their existing sessions, which is the point.

**The last admin was demoted.** The service refuses this, so it should be impossible. If it happened
through direct SQL, use `set-password.mjs --superadmin` to restore one.

**A member's entry is wrong or malicious.** Console → Members → Archive. Nothing is destroyed;
`deletedAt` is set and the row leaves every query.

**Slow directory.** Check the indexes exist:
`\d+ "Member"` should list `Member_searchVector_idx` (GIN), `Member_name_trgm_idx` (GIN) and
`Member_live_idx` (partial). If `EXPLAIN ANALYZE` shows a sequential scan, the search migration did
not run.

**CSP is blocking something.** The policy is in `src/proxy.ts`, not `next.config.mjs`. Inline
`style` attributes need `style-src-attr`, which is separate from `style-src` in CSP3.

## Backups

Supabase takes automated daily backups on paid plans (Settings → Database → Backups). Retention
depends on the plan; confirm it is at least 7 days.

For an independent copy — a backup inside the same account as the database is not a backup against
account loss:

```bash
pg_dump "$DIRECT_URL" --format=custom --no-owner --no-privileges \
  --file "ien-$(date +%Y%m%d).dump"
```

### Restore

```bash
createdb ien_restore_test
pg_restore --dbname "postgresql://…/ien_restore_test" --no-owner --clean --if-exists ien-YYYYMMDD.dump
psql "postgresql://…/ien_restore_test" -c 'SELECT count(*) FROM "Member";'
```

### ⚠ The restore drill has NOT been performed

**An untested backup is not a backup.** This procedure is written from the documented behaviour of
`pg_dump`/`pg_restore` and has not been executed against this database — there was no database
available in the environment where it was written.

Before this system carries real member data, someone must:

1. Take a dump with the command above.
2. Restore it into a scratch database.
3. Confirm row counts for `User`, `Member`, `Event` and `AuditLog` match the source.
4. Confirm the generated `searchVector` column and its GIN index survived the round trip — a
   generated column is the part most likely to be lost, and losing it silently disables search.
5. Record the date, the duration, and anything that went wrong, below.

**Drill log**

| Date | By | Duration | Outcome |
|---|---|---|---|
| _not yet performed_ | | | |

# Baseline artefacts — how to capture them

**Status: NOT CAPTURED.** This is the one Phase 0 acceptance criterion that is unmet. Capture it
before starting Phase 1 — without a before-state there is nothing to measure the rebuild against.

## Why it could not be done in the audit session

1. `node_modules/` is not installed in the working checkout, so there is no dev server to point a
   browser at.
2. No browser automation was available in that environment — no Playwright, no headless Chrome, no
   `lighthouse` binary.
3. The routes that matter need live credentials regardless: `/directory` is `force-dynamic` against
   Postgres, and `/admin` needs an authenticated SUPERADMIN session.

## What to capture

**Screenshots** — every route at 390 / 768 / 1440 px, full page, into `docs/baseline/screens/`:

| Route | Notes |
|---|---|
| `/` | signed out |
| `/directory` | signed out **and** signed in — the two states differ |
| `/directory/[id]` | pick a member with an avatar and one without |
| `/events` | |
| `/mentorship`, `/success-stories`, `/about` | |
| `/admin` | signed in as SUPERADMIN |
| `/sign-in` | |

**Lighthouse** — `/`, `/directory`, a member profile, `/events`. Record LCP, CLS, INP, TBT and the
accessibility score into `docs/baseline/lighthouse.json`.

## Commands

```bash
npm ci
cp .env.example .env.local     # then fill in real values
npm run build && npm start     # measure the production build, not `next dev`

# screenshots
npx playwright install chromium
node docs/baseline/capture.mjs   # write this against the table above

# lighthouse, per route
npx lighthouse http://localhost:3000/ \
  --output=json --output-path=docs/baseline/lighthouse-home.json \
  --preset=desktop --quiet
```

Run Lighthouse against `npm start`, not `npm run dev` — dev-mode numbers are meaningless as a
baseline. Note in the JSON which routes were captured signed in, since auth changes both payload
and layout.

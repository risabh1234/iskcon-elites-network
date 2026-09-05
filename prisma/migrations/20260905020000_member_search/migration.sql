-- Full-text and fuzzy search over the register.
--
-- A directory is a search product. `WHERE name ILIKE '%q%'` cannot rank, cannot
-- use an index for a leading wildcard, and cannot survive a typo — and every
-- one of those matters when the thing being searched is a person's name.
--
-- Two mechanisms, used together:
--   1. A weighted tsvector for ranked full-text matching.
--   2. Trigram similarity for typo tolerance, so "bhaktivedanata" still finds
--      "Bhaktivedanta". ts_rank_cd alone returns nothing for a misspelling.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── 1. Weighted search vector ────────────────────────────────────────────
--
-- Generated rather than trigger-maintained: a generated column cannot go stale,
-- needs no trigger to keep in step, and is recomputed by Postgres exactly when
-- the row changes.
--
-- DEVIATION FROM THE PLAN, deliberately: the plan asks for expertise at weight
-- C, but a generated column may only reference columns of its own row, and
-- expertise lives in a join table. Maintaining it by trigger would mean two
-- triggers (Member and MemberExpertise) that can silently drift. Expertise is
-- instead filtered through its own indexed join, which is more precise than
-- full-text for a controlled vocabulary anyway. City takes weight C, since
-- "cardiologist in Mumbai" is a real query and city is on the row.
--
--   A  name (legal and initiated)   — what people actually search for
--   B  headline                     — role and organisation
--   C  city
--   D  bio                          — matched, but never outranks a name

ALTER TABLE "Member"
  ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce("legalName", '')), 'A') ||
    setweight(to_tsvector('simple', coalesce("initiatedName", '')), 'A') ||
    setweight(to_tsvector('english', coalesce("headline", '')), 'B') ||
    setweight(to_tsvector('simple', coalesce("city", '')), 'C') ||
    setweight(to_tsvector('english', coalesce("bio", '')), 'D')
  ) STORED;

-- 'simple' for names and cities, 'english' for prose: an English stemmer would
-- mangle transliterated Sanskrit, and stemming a proper noun helps nobody.

CREATE INDEX "Member_searchVector_idx" ON "Member" USING GIN ("searchVector");

-- ── 2. Trigram index for typo tolerance ──────────────────────────────────
--
-- GIN over the concatenated names. This is what answers a misspelling, and it
-- also makes an unanchored ILIKE fall back to an index scan instead of a
-- sequential one.

CREATE INDEX "Member_name_trgm_idx" ON "Member"
  USING GIN ((coalesce("legalName", '') || ' ' || coalesce("initiatedName", '')) gin_trgm_ops);

-- ── 3. Partial index for the common case ─────────────────────────────────
--
-- Almost every directory query is "approved, not deleted, newest first". A
-- partial index over exactly that predicate is far smaller than the full one
-- and keeps the whole working set in cache.

CREATE INDEX "Member_live_idx" ON "Member" ("createdAt" DESC)
  WHERE "status" = 'APPROVED' AND "deletedAt" IS NULL;

CREATE INDEX "Event_live_idx" ON "Event" ("startsAt")
  WHERE "status" = 'PUBLISHED' AND "deletedAt" IS NULL;

CREATE INDEX "SuccessStory_live_idx" ON "SuccessStory" ("publishedAt" DESC)
  WHERE "status" = 'PUBLISHED' AND "deletedAt" IS NULL;

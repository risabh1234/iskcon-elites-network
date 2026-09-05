-- Replace the external auth provider with first-party accounts and sessions.
--
-- Written by hand rather than taken verbatim from `prisma migrate diff`: the
-- generated script emits `ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL` with no
-- default, which fails on any table that already has rows.
--
-- IMPORTANT, before running this on a database with existing users: they have
-- no password. After this migration they cannot sign in until they either set
-- one or sign in with Google using the same (verified) address. See
-- docs/DECISIONS.md ADR-0017.

-- 1. Normalise addresses. Lookups lower-case the input, so a stored
--    "A@Example.com" would otherwise never match again.
--    If this fails on the unique index, two rows differ only by case and must
--    be merged by hand first — deliberately not resolved automatically.
UPDATE "User" SET "email" = lower("email") WHERE "email" <> lower("email");

-- 2. New columns.
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "name" TEXT,
  ADD COLUMN IF NOT EXISTS "passwordHash" TEXT,
  ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Seed a display name from whatever the old provider gave us.
UPDATE "User" SET "name" = "username" WHERE "name" IS NULL AND "username" IS NOT NULL;

-- 3. Drop the external identifier.
DROP INDEX IF EXISTS "User_clerkId_key";
ALTER TABLE "User" DROP COLUMN IF EXISTS "clerkId";

-- 4. Linked social identities.
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- 5. Sessions. Only the SHA-256 of the cookie value is stored.
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" TEXT,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Account_userId_idx" ON "Account"("userId");
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
-- Supports the sweep of expired rows.
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

CREATE INDEX "User_role_idx" ON "User"("role");

ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

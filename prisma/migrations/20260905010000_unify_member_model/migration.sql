-- Unify the directory into one Member table, and add search.
--
-- The generated diff dropped "Alumnus" and "Speaker" BEFORE creating "Member",
-- which would have discarded every profile in the register. The drops are moved
-- below, after the rows have been copied across.
--
-- Run this inside a transaction and take a backup first: it is destructive by
-- design and there is no down migration.


-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateEnum
CREATE TYPE "MemberKind" AS ENUM ('ALUMNUS', 'SPEAKER', 'GUEST');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MemberVisibility" AS ENUM ('PUBLIC', 'NETWORK', 'PRIVATE');

-- CreateEnum
CREATE TYPE "LinkKind" AS ENUM ('WEBSITE', 'LINKEDIN', 'X', 'GITHUB', 'SCHOLAR', 'ORCID', 'YOUTUBE', 'INSTAGRAM', 'OTHER');

-- CreateEnum
CREATE TYPE "EventMode" AS ENUM ('IN_PERSON', 'ONLINE', 'HYBRID');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('REGISTERED', 'WAITLISTED', 'CANCELLED', 'ATTENDED');

-- CreateEnum
CREATE TYPE "MentorshipStatus" AS ENUM ('REQUESTED', 'ACCEPTED', 'DECLINED', 'SCHEDULED', 'COMPLETED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "StoryStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- DropForeignKey
ALTER TABLE "Alumnus" DROP CONSTRAINT "Alumnus_addedById_fkey";

-- DropForeignKey
ALTER TABLE "Speaker" DROP CONSTRAINT "Speaker_addedById_fkey";

-- DropForeignKey
ALTER TABLE "Testimonial" DROP CONSTRAINT "Testimonial_addedById_fkey";

-- DropForeignKey
ALTER TABLE "Event" DROP CONSTRAINT "Event_addedById_fkey";

-- AlterTable
ALTER TABLE "Event" DROP COLUMN "addedById",
DROP COLUMN "date",
DROP COLUMN "imageUrl",
DROP COLUMN "isApproved",
DROP COLUMN "location",
DROP COLUMN "time",
ADD COLUMN     "capacity" INTEGER,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "countryCode" CHAR(2),
ADD COLUMN     "coverAssetId" TEXT,
ADD COLUMN     "createdById" TEXT NOT NULL,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "endsAt" TIMESTAMP(3),
ADD COLUMN     "mode" "EventMode" NOT NULL DEFAULT 'IN_PERSON',
ADD COLUMN     "onlineUrl" TEXT,
ADD COLUMN     "slug" TEXT NOT NULL,
ADD COLUMN     "startsAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "status" "EventStatus" NOT NULL DEFAULT 'PUBLISHED',
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'UTC',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "venue" TEXT;

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "kind" "MemberKind" NOT NULL DEFAULT 'ALUMNUS',
    "legalName" TEXT NOT NULL,
    "initiatedName" TEXT,
    "headline" TEXT,
    "bio" TEXT NOT NULL,
    "city" TEXT,
    "countryCode" CHAR(2),
    "timezone" TEXT,
    "cohort" TEXT,
    "email" TEXT,
    "story" TEXT,
    "recommendation" TEXT,
    "visibility" "MemberVisibility" NOT NULL DEFAULT 'NETWORK',
    "status" "MemberStatus" NOT NULL DEFAULT 'PENDING',
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "submittedById" TEXT NOT NULL,
    "userId" TEXT,
    "avatarAssetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expertise" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT,

    CONSTRAINT "Expertise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberExpertise" (
    "memberId" TEXT NOT NULL,
    "expertiseId" TEXT NOT NULL,

    CONSTRAINT "MemberExpertise_pkey" PRIMARY KEY ("memberId","expertiseId")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberRole" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startedOn" TIMESTAMP(3),
    "endedOn" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "MemberRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Link" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "kind" "LinkKind" NOT NULL,
    "url" TEXT NOT NULL,
    "label" TEXT,

    CONSTRAINT "Link_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventRegistration" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'REGISTERED',
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MentorshipProfile" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "isAccepting" BOOLEAN NOT NULL DEFAULT true,
    "capacity" INTEGER NOT NULL DEFAULT 3,
    "focusAreas" TEXT,
    "blurb" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MentorshipProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MentorshipRequest" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "MentorshipStatus" NOT NULL DEFAULT 'REQUESTED',
    "decidedAt" TIMESTAMP(3),
    "decisionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MentorshipRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuccessStory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "body" TEXT NOT NULL,
    "status" "StoryStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "authorId" TEXT NOT NULL,
    "memberId" TEXT,
    "coverAssetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "SuccessStory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "blurhash" TEXT,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "ip" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "invitedById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Member_slug_key" ON "Member"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Member_userId_key" ON "Member"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Member_avatarAssetId_key" ON "Member"("avatarAssetId");

-- CreateIndex
CREATE INDEX "Member_status_createdAt_idx" ON "Member"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Member_kind_status_idx" ON "Member"("kind", "status");

-- CreateIndex
CREATE INDEX "Member_countryCode_idx" ON "Member"("countryCode");

-- CreateIndex
CREATE INDEX "Member_city_idx" ON "Member"("city");

-- CreateIndex
CREATE INDEX "Member_submittedById_idx" ON "Member"("submittedById");

-- CreateIndex
CREATE INDEX "Member_approvedById_idx" ON "Member"("approvedById");

-- CreateIndex
CREATE INDEX "Member_deletedAt_idx" ON "Member"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Expertise_slug_key" ON "Expertise"("slug");

-- CreateIndex
CREATE INDEX "Expertise_category_idx" ON "Expertise"("category");

-- CreateIndex
CREATE INDEX "MemberExpertise_expertiseId_idx" ON "MemberExpertise"("expertiseId");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "MemberRole_memberId_idx" ON "MemberRole"("memberId");

-- CreateIndex
CREATE INDEX "MemberRole_organizationId_idx" ON "MemberRole"("organizationId");

-- CreateIndex
CREATE INDEX "MemberRole_memberId_isCurrent_idx" ON "MemberRole"("memberId", "isCurrent");

-- CreateIndex
CREATE INDEX "Link_memberId_idx" ON "Link"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "Link_memberId_kind_url_key" ON "Link"("memberId", "kind", "url");

-- CreateIndex
CREATE INDEX "EventRegistration_userId_idx" ON "EventRegistration"("userId");

-- CreateIndex
CREATE INDEX "EventRegistration_eventId_status_idx" ON "EventRegistration"("eventId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "EventRegistration_eventId_userId_key" ON "EventRegistration"("eventId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "MentorshipProfile_memberId_key" ON "MentorshipProfile"("memberId");

-- CreateIndex
CREATE INDEX "MentorshipProfile_isAccepting_idx" ON "MentorshipProfile"("isAccepting");

-- CreateIndex
CREATE INDEX "MentorshipRequest_profileId_status_idx" ON "MentorshipRequest"("profileId", "status");

-- CreateIndex
CREATE INDEX "MentorshipRequest_requesterId_idx" ON "MentorshipRequest"("requesterId");

-- CreateIndex
CREATE UNIQUE INDEX "SuccessStory_slug_key" ON "SuccessStory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "SuccessStory_coverAssetId_key" ON "SuccessStory"("coverAssetId");

-- CreateIndex
CREATE INDEX "SuccessStory_status_publishedAt_idx" ON "SuccessStory"("status", "publishedAt" DESC);

-- CreateIndex
CREATE INDEX "SuccessStory_authorId_idx" ON "SuccessStory"("authorId");

-- CreateIndex
CREATE INDEX "SuccessStory_memberId_idx" ON "SuccessStory"("memberId");

-- CreateIndex
CREATE INDEX "SuccessStory_deletedAt_idx" ON "SuccessStory"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_key_key" ON "MediaAsset"("key");

-- CreateIndex
CREATE INDEX "MediaAsset_uploadedById_idx" ON "MediaAsset"("uploadedById");

-- CreateIndex
CREATE INDEX "AuditLog_at_idx" ON "AuditLog"("at" DESC);

-- CreateIndex
CREATE INDEX "AuditLog_actorId_at_idx" ON "AuditLog"("actorId", "at" DESC);

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_tokenHash_key" ON "Invitation"("tokenHash");

-- CreateIndex
CREATE INDEX "Invitation_email_idx" ON "Invitation"("email");

-- CreateIndex
CREATE INDEX "Invitation_expiresAt_idx" ON "Invitation"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Event_coverAssetId_key" ON "Event"("coverAssetId");

-- CreateIndex
CREATE INDEX "Event_status_startsAt_idx" ON "Event"("status", "startsAt");

-- CreateIndex
CREATE INDEX "Event_startsAt_idx" ON "Event"("startsAt");

-- CreateIndex
CREATE INDEX "Event_createdById_idx" ON "Event"("createdById");

-- CreateIndex
CREATE INDEX "Event_deletedAt_idx" ON "Event"("deletedAt");

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_avatarAssetId_fkey" FOREIGN KEY ("avatarAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberExpertise" ADD CONSTRAINT "MemberExpertise_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberExpertise" ADD CONSTRAINT "MemberExpertise_expertiseId_fkey" FOREIGN KEY ("expertiseId") REFERENCES "Expertise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberRole" ADD CONSTRAINT "MemberRole_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberRole" ADD CONSTRAINT "MemberRole_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Link" ADD CONSTRAINT "Link_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_coverAssetId_fkey" FOREIGN KEY ("coverAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorshipProfile" ADD CONSTRAINT "MentorshipProfile_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorshipRequest" ADD CONSTRAINT "MentorshipRequest_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "MentorshipProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuccessStory" ADD CONSTRAINT "SuccessStory_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuccessStory" ADD CONSTRAINT "SuccessStory_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuccessStory" ADD CONSTRAINT "SuccessStory_coverAssetId_fkey" FOREIGN KEY ("coverAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ══════════════════════════════════════════════════════════════════════════
-- Data migration: Alumnus + Speaker -> Member
--
-- The two tables were the same entity split in half and re-merged in
-- application code on every read. Slugs are derived from the name, with a
-- numeric suffix only where two people would otherwise collide — computed
-- across BOTH source tables so an alumnus and a speaker sharing a name do not
-- fight over one URL.
-- ══════════════════════════════════════════════════════════════════════════

INSERT INTO "Member" (
  "id", "slug", "kind", "legalName", "bio", "cohort", "headline",
  "email", "story", "recommendation", "status", "visibility",
  "approvedAt", "submittedById", "createdAt", "updatedAt"
)
SELECT
  s."id",
  s."slug_base" || CASE WHEN s."rn" = 1 THEN '' ELSE '-' || s."rn"::text END,
  s."kind"::"MemberKind",
  s."name",
  s."bio",
  s."cohort",
  s."headline",
  s."email",
  s."story",
  s."recommendation",
  CASE WHEN s."isApproved" THEN 'APPROVED' ELSE 'PENDING' END::"MemberStatus",
  'NETWORK'::"MemberVisibility",
  CASE WHEN s."isApproved" THEN s."createdAt" ELSE NULL END,
  s."addedById",
  s."createdAt",
  s."createdAt"
FROM (
  SELECT
    u.*,
    ROW_NUMBER() OVER (PARTITION BY u."slug_base" ORDER BY u."createdAt", u."id") AS "rn"
  FROM (
    SELECT
      a."id",
      a."name",
      a."bio",
      a."cohort",
      NULL::text            AS "headline",
      a."email",
      a."story",
      a."recommendation",
      a."isApproved",
      a."addedById",
      a."createdAt",
      'ALUMNUS'             AS "kind",
      -- Fold to a URL-safe stem; fall back to "member" when a name is entirely
      -- non-Latin, so the slug is never empty.
      COALESCE(
        NULLIF(trim(both '-' from regexp_replace(lower(a."name"), '[^a-z0-9]+', '-', 'g')), ''),
        'member'
      ) AS "slug_base"
    FROM "Alumnus" a

    UNION ALL

    SELECT
      sp."id",
      sp."name",
      sp."bio",
      NULL::text            AS "cohort",
      sp."title"            AS "headline",
      sp."email",
      NULL::text            AS "story",
      NULL::text            AS "recommendation",
      sp."isApproved",
      sp."addedById",
      sp."createdAt",
      CASE WHEN sp."title" = 'Featured Guest' THEN 'GUEST' ELSE 'SPEAKER' END AS "kind",
      COALESCE(
        NULLIF(trim(both '-' from regexp_replace(lower(sp."name"), '[^a-z0-9]+', '-', 'g')), ''),
        'member'
      ) AS "slug_base"
    FROM "Speaker" sp
  ) u
) s;

-- Approvals predate an audit trail, so approvedById is left NULL rather than
-- attributed to whoever happens to run this migration.


-- ══════════════════════════════════════════════════════════════════════════
-- Retire the old tables.
--
-- "Testimonial" is dropped without migration: the audit confirmed it was never
-- read or written by any code path in src/, so it holds no data the product has
-- ever produced. Check it is empty before running this if you are unsure.
-- ══════════════════════════════════════════════════════════════════════════

DROP TABLE "Alumnus";
DROP TABLE "Speaker";
DROP TABLE "Testimonial";

-- Leadership profiles: the people who carry the initiative.
--
-- Two tables and two enums. "LeadershipProfile" is deliberately not a "Member"
-- with a flag on it — see the model comment in schema.prisma and ADR-0039.
--
-- The final statement seeds the first profile. Reference data belongs in a
-- migration rather than in prisma/seed.ts because seed.ts is development
-- fixture data that no production deployment runs, and this row has to exist
-- the moment the page does. It is idempotent, and the console owns every
-- subsequent edit.

-- CreateEnum
CREATE TYPE "LeadershipStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "LeadershipMediaKind" AS ENUM ('PHOTO', 'DOCUMENT');

-- CreateTable
CREATE TABLE "LeadershipProfile" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "honorific" TEXT,
    "name" TEXT NOT NULL,
    "initiatedName" TEXT,
    "role" TEXT,
    "headline" TEXT,
    "bio" TEXT NOT NULL,
    "focusAreas" TEXT,
    "initiatives" TEXT,
    "status" "LeadershipStatus" NOT NULL DEFAULT 'DRAFT',
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "portraitAssetId" TEXT,
    "portraitAlt" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "LeadershipProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadershipMedia" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "kind" "LeadershipMediaKind" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "LeadershipMedia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LeadershipProfile_slug_key" ON "LeadershipProfile"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "LeadershipProfile_portraitAssetId_key" ON "LeadershipProfile"("portraitAssetId");

-- CreateIndex
CREATE INDEX "LeadershipProfile_status_orderIndex_idx" ON "LeadershipProfile"("status", "orderIndex");

-- CreateIndex
CREATE INDEX "LeadershipProfile_deletedAt_idx" ON "LeadershipProfile"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "LeadershipMedia_assetId_key" ON "LeadershipMedia"("assetId");

-- CreateIndex
CREATE INDEX "LeadershipMedia_profileId_kind_orderIndex_idx" ON "LeadershipMedia"("profileId", "kind", "orderIndex");

-- CreateIndex
CREATE INDEX "LeadershipMedia_deletedAt_idx" ON "LeadershipMedia"("deletedAt");

-- AddForeignKey
ALTER TABLE "LeadershipProfile" ADD CONSTRAINT "LeadershipProfile_portraitAssetId_fkey" FOREIGN KEY ("portraitAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadershipProfile" ADD CONSTRAINT "LeadershipProfile_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadershipMedia" ADD CONSTRAINT "LeadershipMedia_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "LeadershipProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadershipMedia" ADD CONSTRAINT "LeadershipMedia_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "MediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed the first profile. ON CONFLICT so a re-run, or a restore that already
-- carries the row, is not an error — and so an edit made in the console is
-- never overwritten by the migration that created the row.
INSERT INTO "LeadershipProfile" (
    "id", "slug", "honorific", "name", "role", "headline",
    "bio", "focusAreas", "initiatives", "status", "orderIndex", "updatedAt"
) VALUES (
    '9f1a2c7e-4b3d-4c8a-9d61-0b7e5c2a1f30',
    'tukaram-das',
    'His Grace',
    'Tukaram Das',
    'Vice President, ISKCON Bhubaneswar',
    'Travelling monk and preacher; disciple of His Holiness Bhakti Charu Swami Mahārāja',
    'His Grace Tukaram Das is a disciple of His Holiness Bhakti Charu Swami Mahārāja and serves as Vice President of ISKCON Bhubaneswar. He holds a B.Tech in Chemical Engineering and worked with Fluor Daniel before taking to monastic life; he now travels as a preacher, mentor, counsellor and coach.

He is an eloquent speaker whose particular gift is presenting Vedic knowledge in a lucid, practical form — offering spiritual solutions to the problems people actually meet in modern life, without diluting the tradition he speaks from.

His teaching carries a distinct inclination towards Gaura-tattva as presented in the books and lectures of His Divine Grace Śrīmad Gour Govinda Swami Mahārāja, alongside Jagannātha-kathā and Gauḍīya Vaiṣṇava siddhānta, which he develops at length in seminars on Śrīmad Bhāgavatam, Śrī Caitanya-caritāmṛta and other Vaiṣṇava literature.

Under his direction the Bhubaneswar centre''s outreach has grown into standing institutions rather than occasional programmes.',
    'Presenting Vedic knowledge in a lucid, practical form
Spiritual solutions to the problems of modern life
Gaura-tattva through the books and teachings of Śrīmad Gour Govinda Swami Mahārāja
Jagannātha-kathā
Gauḍīya Vaiṣṇava siddhānta
Seminars on Śrīmad Bhāgavatam and Śrī Caitanya-caritāmṛta
Mentorship, counselling and coaching',
    'Jindal–Bhaktivedanta Library and Study Centre — study facilities for more than 1,000 students
Govinda''s Restaurant and Preaching Centre at IIT Bhubaneswar
Śrī Śrī Rādhā Nīlamādhava Eco-spiritual and Heritage Village, Bhubaneswar — in development',
    'PUBLISHED',
    0,
    CURRENT_TIMESTAMP
) ON CONFLICT ("slug") DO NOTHING;

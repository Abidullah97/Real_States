-- Additive migration: roles, review states, agent applications, featured scheduling, location hierarchy,
-- managed categories, admin notifications and expanded site settings. No existing data is removed.
-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "InquiryStatus" ADD VALUE 'READ';

-- AlterEnum
ALTER TYPE "ListingStatus" ADD VALUE 'REJECTED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Role" ADD VALUE 'OWNER';
ALTER TYPE "Role" ADD VALUE 'SUPER_ADMIN';

-- AlterTable
ALTER TABLE "AgentProfile" ADD COLUMN     "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "experienceYears" INTEGER,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "specialization" TEXT,
ADD COLUMN     "status" "AgentStatus" NOT NULL DEFAULT 'APPROVED';

-- AlterTable
ALTER TABLE "Location" ADD COLUMN     "area" TEXT,
ADD COLUMN     "province" TEXT;

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "agentId" TEXT,
ADD COLUMN     "featuredOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "featuredUntil" TIMESTAMP(3),
ADD COLUMN     "rejectionReason" TEXT;

-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN     "faviconUrl" TEXT,
ADD COLUMN     "featuredLimit" INTEGER NOT NULL DEFAULT 6,
ADD COLUMN     "heroDescription" TEXT,
ADD COLUMN     "heroHeading" TEXT,
ADD COLUMN     "heroImageUrl" TEXT,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "ogImageUrl" TEXT,
ADD COLUMN     "seoDescription" TEXT,
ADD COLUMN     "seoKeywords" TEXT,
ADD COLUMN     "seoTitle" TEXT,
ADD COLUMN     "showAgents" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showCategories" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showFeatured" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showLatest" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showLocations" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showTestimonials" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "siteName" TEXT,
ADD COLUMN     "websiteUrl" TEXT;

-- CreateTable
CREATE TABLE "PropertyCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "href" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PropertyCategory_name_key" ON "PropertyCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyCategory_slug_key" ON "PropertyCategory"("slug");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "AgentProfile_status_idx" ON "AgentProfile"("status");

-- CreateIndex
CREATE INDEX "Property_featured_featuredOrder_idx" ON "Property"("featured", "featuredOrder");

-- CreateIndex
CREATE INDEX "Property_agentId_idx" ON "Property"("agentId");

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Seed the category table from property types already in use, plus common categories.
INSERT INTO "PropertyCategory" ("id", "name", "slug", "position", "updatedAt")
SELECT 'cat_' || lower(regexp_replace(t.name, '[^a-zA-Z0-9]+', '_', 'g')), t.name,
       lower(regexp_replace(t.name, '[^a-zA-Z0-9]+', '-', 'g')), t.pos, CURRENT_TIMESTAMP
FROM (
  SELECT name, MIN(pos) AS pos FROM (
    SELECT DISTINCT "propertyType" AS name, 100 AS pos FROM "Property"
    UNION ALL VALUES ('House', 1), ('Apartment', 2), ('Villa', 3), ('Townhouse', 4), ('Commercial', 5),
                     ('Office', 6), ('Shop', 7), ('Plot', 8), ('Agricultural Land', 9), ('Land', 10), ('Other', 99)
  ) s GROUP BY name
) t
ON CONFLICT DO NOTHING;

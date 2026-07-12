-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.
ALTER TYPE "LeadSource" ADD VALUE IF NOT EXISTS 'META_ADS';
ALTER TYPE "LeadSource" ADD VALUE IF NOT EXISTS 'GOOGLE_ADS';

-- AlterTable
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "dealValue" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "pipeline_stages" ADD COLUMN IF NOT EXISTS "probability" INTEGER NOT NULL DEFAULT 0;

-- CreateTable (pre-existing schema drift found while diffing this migration — the
-- Meta/Google Ads integration model was never applied to this database, which is
-- also why ad-integrations.service.ts had a stale TypeScript error all session)
CREATE TABLE IF NOT EXISTS "ad_campaigns" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "dailyBudget" DOUBLE PRECISION,
    "lifetimeBudget" DOUBLE PRECISION,
    "spend" DOUBLE PRECISION DEFAULT 0,
    "impressions" INTEGER DEFAULT 0,
    "clicks" INTEGER DEFAULT 0,
    "leads" INTEGER DEFAULT 0,
    "ctr" DOUBLE PRECISION DEFAULT 0,
    "cpc" DOUBLE PRECISION DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ad_campaigns_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ad_campaigns_platform_idx" ON "ad_campaigns"("platform");

CREATE UNIQUE INDEX IF NOT EXISTS "ad_campaigns_tenant_id_externalId_key" ON "ad_campaigns"("tenant_id", "externalId");

DO $$ BEGIN
  ALTER TABLE "ad_campaigns" ADD CONSTRAINT "ad_campaigns_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Backfill sensible default forecast weights for the standard pipeline stages so
-- the forecast produces a real number immediately, not just for newly-seeded stages.
UPDATE "pipeline_stages" SET "probability" = 5   WHERE "status" = 'NEW';
UPDATE "pipeline_stages" SET "probability" = 10  WHERE "status" = 'CONTACTED';
UPDATE "pipeline_stages" SET "probability" = 15  WHERE "status" = 'ENGAGED';
UPDATE "pipeline_stages" SET "probability" = 25  WHERE "status" = 'QUALIFYING';
UPDATE "pipeline_stages" SET "probability" = 40  WHERE "status" = 'QUALIFIED';
UPDATE "pipeline_stages" SET "probability" = 60  WHERE "status" = 'PROPOSAL_SENT';
UPDATE "pipeline_stages" SET "probability" = 75  WHERE "status" = 'APPOINTMENT_BOOKED';
UPDATE "pipeline_stages" SET "probability" = 100 WHERE "status" = 'CONVERTED';
UPDATE "pipeline_stages" SET "probability" = 0   WHERE "status" IN ('COLD', 'LOST', 'SPAM');

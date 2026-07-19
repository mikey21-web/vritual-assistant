-- CreateEnum
CREATE TYPE "sales_target_scope" AS ENUM ('TENANT', 'PROJECT', 'TEAM', 'AGENT');

-- CreateEnum
CREATE TYPE "sales_target_metric" AS ENUM ('LEAD_RESPONSE', 'SITE_VISITS', 'BOOKINGS', 'AGREEMENT_VALUE_PAISE', 'COLLECTIONS_PAISE');

-- CreateEnum
CREATE TYPE "allied_inventory_type" AS ENUM ('PARKING', 'STORAGE', 'TERRACE', 'SERVANT_ROOM', 'OTHER');

-- CreateEnum
CREATE TYPE "allied_inventory_status" AS ENUM ('AVAILABLE', 'ALLOCATED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "inventory_release_batch_status" AS ENUM ('PLANNED', 'RELEASED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "checkout_hold_status" AS ENUM ('ACTIVE', 'CONSUMED', 'EXPIRED', 'RELEASED');

-- CreateEnum
CREATE TYPE "checkout_attempt_status" AS ENUM ('STARTED', 'PAYMENT_PENDING', 'PAYMENT_CONFIRMED', 'ABANDONED', 'FAILED');

-- CreateEnum
CREATE TYPE "payment_intent_status" AS ENUM ('CREATED', 'PENDING', 'CONFIRMED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "landing_page_status" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "suppression_channel" AS ENUM ('WHATSAPP', 'SMS', 'EMAIL', 'CALL');

-- AlterTable
ALTER TABLE "towers" ADD COLUMN     "phaseId" TEXT;

-- CreateTable
CREATE TABLE "project_phases" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_phases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_targets" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "scope" "sales_target_scope" NOT NULL,
    "projectId" TEXT,
    "userId" TEXT,
    "metric" "sales_target_metric" NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "targetValue" DOUBLE PRECISION NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "allied_inventory_items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "towerId" TEXT,
    "type" "allied_inventory_type" NOT NULL,
    "label" TEXT NOT NULL,
    "priceRupees" DOUBLE PRECISION,
    "status" "allied_inventory_status" NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "allied_inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "allied_inventory_allocations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "pricePaidPaise" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "allied_inventory_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_release_batches" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "phaseId" TEXT,
    "name" TEXT NOT NULL,
    "unitIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "releaseAt" TIMESTAMP(3) NOT NULL,
    "status" "inventory_release_batch_status" NOT NULL DEFAULT 'PLANNED',
    "approvedById" TEXT,
    "releasedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_release_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buyer_sessions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "projectId" TEXT,
    "leadId" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "name" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "buyer_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unit_shortlists" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "buyerSessionId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unit_shortlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checkout_holds" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "buyerSessionId" TEXT NOT NULL,
    "status" "checkout_hold_status" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checkout_holds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checkout_attempts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "buyerSessionId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "status" "checkout_attempt_status" NOT NULL DEFAULT 'STARTED',
    "bookingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checkout_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_intents" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "checkoutHoldId" TEXT,
    "provider" TEXT,
    "providerRef" TEXT,
    "amountPaise" BIGINT NOT NULL,
    "status" "payment_intent_status" NOT NULL DEFAULT 'CREATED',
    "webhookEventId" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_intents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "digital_sales_events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "buyerSessionId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "unitId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "digital_sales_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "landing_pages" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "projectId" TEXT,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" JSONB NOT NULL DEFAULT '{}',
    "status" "landing_page_status" NOT NULL DEFAULT 'DRAFT',
    "utmDefaults" JSONB NOT NULL DEFAULT '{}',
    "publishedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "landing_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audience_segments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "filters" JSONB NOT NULL DEFAULT '{}',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audience_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppression_entries" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "channel" "suppression_channel" NOT NULL,
    "contactRef" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suppression_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_spend_imports" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "projectId" TEXT,
    "source" TEXT NOT NULL,
    "campaign" TEXT,
    "spendDate" TIMESTAMP(3) NOT NULL,
    "amountPaise" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_spend_imports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_onboarding_steps" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "stepKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "completedAt" TIMESTAMP(3),
    "completedById" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_onboarding_steps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_phases_tenant_id_idx" ON "project_phases"("tenant_id");

-- CreateIndex
CREATE INDEX "project_phases_projectId_idx" ON "project_phases"("projectId");

-- CreateIndex
CREATE INDEX "sales_targets_tenant_id_idx" ON "sales_targets"("tenant_id");

-- CreateIndex
CREATE INDEX "sales_targets_projectId_idx" ON "sales_targets"("projectId");

-- CreateIndex
CREATE INDEX "sales_targets_userId_idx" ON "sales_targets"("userId");

-- CreateIndex
CREATE INDEX "sales_targets_periodStart_periodEnd_idx" ON "sales_targets"("periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "allied_inventory_items_tenant_id_idx" ON "allied_inventory_items"("tenant_id");

-- CreateIndex
CREATE INDEX "allied_inventory_items_projectId_idx" ON "allied_inventory_items"("projectId");

-- CreateIndex
CREATE INDEX "allied_inventory_items_status_idx" ON "allied_inventory_items"("status");

-- CreateIndex
CREATE UNIQUE INDEX "allied_inventory_allocations_itemId_key" ON "allied_inventory_allocations"("itemId");

-- CreateIndex
CREATE INDEX "allied_inventory_allocations_tenant_id_idx" ON "allied_inventory_allocations"("tenant_id");

-- CreateIndex
CREATE INDEX "allied_inventory_allocations_bookingId_idx" ON "allied_inventory_allocations"("bookingId");

-- CreateIndex
CREATE INDEX "inventory_release_batches_tenant_id_idx" ON "inventory_release_batches"("tenant_id");

-- CreateIndex
CREATE INDEX "inventory_release_batches_projectId_idx" ON "inventory_release_batches"("projectId");

-- CreateIndex
CREATE INDEX "inventory_release_batches_status_idx" ON "inventory_release_batches"("status");

-- CreateIndex
CREATE INDEX "buyer_sessions_tenant_id_idx" ON "buyer_sessions"("tenant_id");

-- CreateIndex
CREATE INDEX "buyer_sessions_leadId_idx" ON "buyer_sessions"("leadId");

-- CreateIndex
CREATE INDEX "unit_shortlists_tenant_id_idx" ON "unit_shortlists"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "unit_shortlists_buyerSessionId_unitId_key" ON "unit_shortlists"("buyerSessionId", "unitId");

-- CreateIndex
CREATE INDEX "checkout_holds_tenant_id_status_idx" ON "checkout_holds"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "checkout_holds_unitId_status_idx" ON "checkout_holds"("unitId", "status");

-- CreateIndex
CREATE INDEX "checkout_holds_expiresAt_idx" ON "checkout_holds"("expiresAt");

-- CreateIndex
CREATE INDEX "checkout_attempts_tenant_id_status_idx" ON "checkout_attempts"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "checkout_attempts_buyerSessionId_idx" ON "checkout_attempts"("buyerSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_intents_webhookEventId_key" ON "payment_intents"("webhookEventId");

-- CreateIndex
CREATE INDEX "payment_intents_tenant_id_status_idx" ON "payment_intents"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "payment_intents_checkoutHoldId_idx" ON "payment_intents"("checkoutHoldId");

-- CreateIndex
CREATE INDEX "digital_sales_events_tenant_id_eventType_idx" ON "digital_sales_events"("tenant_id", "eventType");

-- CreateIndex
CREATE INDEX "digital_sales_events_buyerSessionId_idx" ON "digital_sales_events"("buyerSessionId");

-- CreateIndex
CREATE INDEX "landing_pages_tenant_id_status_idx" ON "landing_pages"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "landing_pages_tenant_id_slug_key" ON "landing_pages"("tenant_id", "slug");

-- CreateIndex
CREATE INDEX "audience_segments_tenant_id_idx" ON "audience_segments"("tenant_id");

-- CreateIndex
CREATE INDEX "suppression_entries_tenant_id_idx" ON "suppression_entries"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "suppression_entries_tenant_id_channel_contactRef_key" ON "suppression_entries"("tenant_id", "channel", "contactRef");

-- CreateIndex
CREATE INDEX "ad_spend_imports_tenant_id_idx" ON "ad_spend_imports"("tenant_id");

-- CreateIndex
CREATE INDEX "ad_spend_imports_projectId_spendDate_idx" ON "ad_spend_imports"("projectId", "spendDate");

-- CreateIndex
CREATE INDEX "tenant_onboarding_steps_tenant_id_idx" ON "tenant_onboarding_steps"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_onboarding_steps_tenant_id_stepKey_key" ON "tenant_onboarding_steps"("tenant_id", "stepKey");

-- CreateIndex
CREATE INDEX "towers_phaseId_idx" ON "towers"("phaseId");

-- AddForeignKey
ALTER TABLE "project_phases" ADD CONSTRAINT "project_phases_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_phases" ADD CONSTRAINT "project_phases_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_targets" ADD CONSTRAINT "sales_targets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_targets" ADD CONSTRAINT "sales_targets_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_targets" ADD CONSTRAINT "sales_targets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "towers" ADD CONSTRAINT "towers_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "project_phases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allied_inventory_items" ADD CONSTRAINT "allied_inventory_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allied_inventory_items" ADD CONSTRAINT "allied_inventory_items_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allied_inventory_items" ADD CONSTRAINT "allied_inventory_items_towerId_fkey" FOREIGN KEY ("towerId") REFERENCES "towers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allied_inventory_allocations" ADD CONSTRAINT "allied_inventory_allocations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allied_inventory_allocations" ADD CONSTRAINT "allied_inventory_allocations_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "allied_inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allied_inventory_allocations" ADD CONSTRAINT "allied_inventory_allocations_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_release_batches" ADD CONSTRAINT "inventory_release_batches_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_release_batches" ADD CONSTRAINT "inventory_release_batches_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_release_batches" ADD CONSTRAINT "inventory_release_batches_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "project_phases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_release_batches" ADD CONSTRAINT "inventory_release_batches_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buyer_sessions" ADD CONSTRAINT "buyer_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buyer_sessions" ADD CONSTRAINT "buyer_sessions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buyer_sessions" ADD CONSTRAINT "buyer_sessions_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_shortlists" ADD CONSTRAINT "unit_shortlists_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_shortlists" ADD CONSTRAINT "unit_shortlists_buyerSessionId_fkey" FOREIGN KEY ("buyerSessionId") REFERENCES "buyer_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_shortlists" ADD CONSTRAINT "unit_shortlists_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkout_holds" ADD CONSTRAINT "checkout_holds_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkout_holds" ADD CONSTRAINT "checkout_holds_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkout_holds" ADD CONSTRAINT "checkout_holds_buyerSessionId_fkey" FOREIGN KEY ("buyerSessionId") REFERENCES "buyer_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkout_attempts" ADD CONSTRAINT "checkout_attempts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkout_attempts" ADD CONSTRAINT "checkout_attempts_buyerSessionId_fkey" FOREIGN KEY ("buyerSessionId") REFERENCES "buyer_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkout_attempts" ADD CONSTRAINT "checkout_attempts_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkout_attempts" ADD CONSTRAINT "checkout_attempts_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_checkoutHoldId_fkey" FOREIGN KEY ("checkoutHoldId") REFERENCES "checkout_holds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digital_sales_events" ADD CONSTRAINT "digital_sales_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digital_sales_events" ADD CONSTRAINT "digital_sales_events_buyerSessionId_fkey" FOREIGN KEY ("buyerSessionId") REFERENCES "buyer_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landing_pages" ADD CONSTRAINT "landing_pages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landing_pages" ADD CONSTRAINT "landing_pages_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audience_segments" ADD CONSTRAINT "audience_segments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppression_entries" ADD CONSTRAINT "suppression_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_spend_imports" ADD CONSTRAINT "ad_spend_imports_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_spend_imports" ADD CONSTRAINT "ad_spend_imports_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_onboarding_steps" ADD CONSTRAINT "tenant_onboarding_steps_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


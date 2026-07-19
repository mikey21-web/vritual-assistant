-- CreateEnum
CREATE TYPE "journey_status" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "journey_step_type" AS ENUM ('WAIT', 'SEND_TEMPLATE', 'CREATE_TASK', 'WEBHOOK', 'EXIT_CONDITION');

-- CreateEnum
CREATE TYPE "journey_enrollment_status" AS ENUM ('ACTIVE', 'COMPLETED', 'EXITED');

-- CreateEnum
CREATE TYPE "marketing_event_type" AS ENUM ('OPEN_HOUSE', 'BROKER_MEET', 'LAUNCH', 'WEBINAR', 'SITE_VISIT_DRIVE');

-- CreateEnum
CREATE TYPE "marketing_event_status" AS ENUM ('DRAFT', 'PUBLISHED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "rsvp_status" AS ENUM ('INVITED', 'CONFIRMED', 'DECLINED', 'ATTENDED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "cash_flow_entry_type" AS ENUM ('EXPECTED_COLLECTION', 'EXPECTED_COMMISSION_PAYOUT', 'EXPECTED_REFUND', 'PLANNED_EXPENSE');

-- CreateEnum
CREATE TYPE "revenue_share_party_type" AS ENUM ('LANDOWNER', 'CO_PROMOTER');

-- CreateEnum
CREATE TYPE "revenue_share_allocation_status" AS ENUM ('PENDING', 'CONFIRMED', 'SETTLED');

-- CreateEnum
CREATE TYPE "resale_listing_type" AS ENUM ('RESALE', 'RENTAL');

-- CreateEnum
CREATE TYPE "resale_listing_status" AS ENUM ('AVAILABLE', 'UNDER_NEGOTIATION', 'CLOSED');

-- CreateEnum
CREATE TYPE "referral_reward_type" AS ENUM ('FLAT', 'PERCENT_OF_BOOKING');

-- CreateEnum
CREATE TYPE "referral_status" AS ENUM ('SUBMITTED', 'LEAD_CREATED', 'BOOKED', 'REWARD_APPROVED', 'REWARD_PAID', 'REJECTED');

-- CreateTable
CREATE TABLE "marketing_journeys" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "journey_status" NOT NULL DEFAULT 'DRAFT',
    "entryEventType" TEXT NOT NULL,
    "entryConditions" JSONB NOT NULL DEFAULT '{}',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_journeys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_journey_steps" (
    "id" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "stepType" "journey_step_type" NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketing_journey_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_journey_enrollments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "currentStepOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "journey_enrollment_status" NOT NULL DEFAULT 'ACTIVE',
    "journeySnapshot" JSONB NOT NULL DEFAULT '{}',
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "marketing_journey_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "projectId" TEXT,
    "name" TEXT NOT NULL,
    "eventType" "marketing_event_type" NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "location" TEXT,
    "description" TEXT,
    "capacity" INTEGER,
    "status" "marketing_event_status" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_event_invitees" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "leadId" TEXT,
    "channelPartnerId" TEXT,
    "name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "rsvpStatus" "rsvp_status" NOT NULL DEFAULT 'INVITED',
    "qrCheckInToken" TEXT,
    "checkedInAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketing_event_invitees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_flow_forecast_entries" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "entryType" "cash_flow_entry_type" NOT NULL,
    "amountPaise" BIGINT NOT NULL,
    "expectedDate" TIMESTAMP(3) NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_flow_forecast_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenue_share_parties" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "partyName" TEXT NOT NULL,
    "partyType" "revenue_share_party_type" NOT NULL,
    "sharePercent" DOUBLE PRECISION NOT NULL,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revenue_share_parties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenue_share_allocations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "unitId" TEXT,
    "bookingId" TEXT,
    "allocatedAmountPaise" BIGINT,
    "status" "revenue_share_allocation_status" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revenue_share_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resale_listings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "listingType" "resale_listing_type" NOT NULL,
    "unitId" TEXT,
    "externalOwnerName" TEXT,
    "askingPriceRupees" DOUBLE PRECISION,
    "rentAmountRupees" DOUBLE PRECISION,
    "location" TEXT,
    "bedrooms" INTEGER,
    "areaSqft" DOUBLE PRECISION,
    "status" "resale_listing_status" NOT NULL DEFAULT 'AVAILABLE',
    "images" JSONB NOT NULL DEFAULT '[]',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resale_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_programs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rewardType" "referral_reward_type" NOT NULL,
    "rewardAmountPaise" BIGINT,
    "rewardPercent" DOUBLE PRECISION,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referral_programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "referrerContactId" TEXT NOT NULL,
    "referredLeadId" TEXT,
    "referredPhone" TEXT NOT NULL,
    "status" "referral_status" NOT NULL DEFAULT 'SUBMITTED',
    "rewardAmountPaise" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nri_buyer_profiles" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "countryOfResidence" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "preferredContactHoursLocal" TEXT,
    "passportNumberMasked" TEXT,
    "overseasAddress" JSONB DEFAULT '{}',
    "remotePaymentMethodNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nri_buyer_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "construction_erp_connections" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_CONFIGURED',
    "lastSyncAt" TIMESTAMP(3),
    "config" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "construction_erp_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_search_index" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "searchableText" TEXT NOT NULL,
    "leadId" TEXT,
    "projectId" TEXT,
    "unitId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_search_index_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "physical_document_custodies" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "fileNumber" TEXT NOT NULL,
    "bookingId" TEXT,
    "leadId" TEXT,
    "documentDescription" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "checkedOutById" TEXT,
    "checkedOutAt" TIMESTAMP(3),
    "dueBackAt" TIMESTAMP(3),
    "returnedAt" TIMESTAMP(3),
    "scanLinkMediaFileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "physical_document_custodies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "marketing_journeys_tenant_id_status_idx" ON "marketing_journeys"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "marketing_journey_steps_journeyId_idx" ON "marketing_journey_steps"("journeyId");

-- CreateIndex
CREATE INDEX "marketing_journey_enrollments_tenant_id_status_idx" ON "marketing_journey_enrollments"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "marketing_journey_enrollments_journeyId_leadId_key" ON "marketing_journey_enrollments"("journeyId", "leadId");

-- CreateIndex
CREATE INDEX "marketing_events_tenant_id_status_idx" ON "marketing_events"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "marketing_events_projectId_idx" ON "marketing_events"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "marketing_event_invitees_qrCheckInToken_key" ON "marketing_event_invitees"("qrCheckInToken");

-- CreateIndex
CREATE INDEX "marketing_event_invitees_eventId_idx" ON "marketing_event_invitees"("eventId");

-- CreateIndex
CREATE INDEX "marketing_event_invitees_leadId_idx" ON "marketing_event_invitees"("leadId");

-- CreateIndex
CREATE INDEX "marketing_event_invitees_channelPartnerId_idx" ON "marketing_event_invitees"("channelPartnerId");

-- CreateIndex
CREATE INDEX "cash_flow_forecast_entries_tenant_id_projectId_idx" ON "cash_flow_forecast_entries"("tenant_id", "projectId");

-- CreateIndex
CREATE INDEX "cash_flow_forecast_entries_projectId_expectedDate_idx" ON "cash_flow_forecast_entries"("projectId", "expectedDate");

-- CreateIndex
CREATE INDEX "revenue_share_parties_tenant_id_projectId_idx" ON "revenue_share_parties"("tenant_id", "projectId");

-- CreateIndex
CREATE INDEX "revenue_share_allocations_tenant_id_partyId_idx" ON "revenue_share_allocations"("tenant_id", "partyId");

-- CreateIndex
CREATE INDEX "revenue_share_allocations_unitId_idx" ON "revenue_share_allocations"("unitId");

-- CreateIndex
CREATE INDEX "revenue_share_allocations_bookingId_idx" ON "revenue_share_allocations"("bookingId");

-- CreateIndex
CREATE INDEX "resale_listings_tenant_id_status_listingType_idx" ON "resale_listings"("tenant_id", "status", "listingType");

-- CreateIndex
CREATE INDEX "resale_listings_location_idx" ON "resale_listings"("location");

-- CreateIndex
CREATE INDEX "referral_programs_tenant_id_active_idx" ON "referral_programs"("tenant_id", "active");

-- CreateIndex
CREATE INDEX "referrals_tenant_id_status_idx" ON "referrals"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "referrals_referrerContactId_idx" ON "referrals"("referrerContactId");

-- CreateIndex
CREATE INDEX "referrals_referredLeadId_idx" ON "referrals"("referredLeadId");

-- CreateIndex
CREATE INDEX "referrals_referredPhone_idx" ON "referrals"("referredPhone");

-- CreateIndex
CREATE UNIQUE INDEX "nri_buyer_profiles_leadId_key" ON "nri_buyer_profiles"("leadId");

-- CreateIndex
CREATE INDEX "nri_buyer_profiles_tenant_id_idx" ON "nri_buyer_profiles"("tenant_id");

-- CreateIndex
CREATE INDEX "construction_erp_connections_tenant_id_projectId_idx" ON "construction_erp_connections"("tenant_id", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "construction_erp_connections_tenant_id_projectId_key" ON "construction_erp_connections"("tenant_id", "projectId");

-- CreateIndex
CREATE INDEX "construction_milestone_updates_tenant_id_projectId_idx" ON "construction_milestone_updates"("tenant_id", "projectId");

-- CreateIndex
CREATE INDEX "construction_milestone_updates_projectId_reportedAt_idx" ON "construction_milestone_updates"("projectId", "reportedAt");

-- CreateIndex
CREATE INDEX "document_search_index_tenant_id_sourceType_idx" ON "document_search_index"("tenant_id", "sourceType");

-- CreateIndex
CREATE INDEX "document_search_index_tenant_id_leadId_idx" ON "document_search_index"("tenant_id", "leadId");

-- CreateIndex
CREATE INDEX "document_search_index_tenant_id_projectId_idx" ON "document_search_index"("tenant_id", "projectId");

-- CreateIndex
CREATE INDEX "document_search_index_tenant_id_unitId_idx" ON "document_search_index"("tenant_id", "unitId");

-- CreateIndex
CREATE INDEX "physical_document_custodies_tenant_id_fileNumber_idx" ON "physical_document_custodies"("tenant_id", "fileNumber");

-- CreateIndex
CREATE INDEX "physical_document_custodies_tenant_id_leadId_idx" ON "physical_document_custodies"("tenant_id", "leadId");

-- CreateIndex
CREATE INDEX "physical_document_custodies_tenant_id_bookingId_idx" ON "physical_document_custodies"("tenant_id", "bookingId");

-- CreateIndex
CREATE INDEX "physical_document_custodies_tenant_id_returnedAt_idx" ON "physical_document_custodies"("tenant_id", "returnedAt");

-- AddForeignKey
ALTER TABLE "marketing_journeys" ADD CONSTRAINT "marketing_journeys_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_journey_steps" ADD CONSTRAINT "marketing_journey_steps_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "marketing_journeys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_journey_enrollments" ADD CONSTRAINT "marketing_journey_enrollments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_journey_enrollments" ADD CONSTRAINT "marketing_journey_enrollments_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "marketing_journeys"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_journey_enrollments" ADD CONSTRAINT "marketing_journey_enrollments_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_events" ADD CONSTRAINT "marketing_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_events" ADD CONSTRAINT "marketing_events_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_event_invitees" ADD CONSTRAINT "marketing_event_invitees_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "marketing_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_event_invitees" ADD CONSTRAINT "marketing_event_invitees_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_event_invitees" ADD CONSTRAINT "marketing_event_invitees_channelPartnerId_fkey" FOREIGN KEY ("channelPartnerId") REFERENCES "channel_partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_flow_forecast_entries" ADD CONSTRAINT "cash_flow_forecast_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_flow_forecast_entries" ADD CONSTRAINT "cash_flow_forecast_entries_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_share_parties" ADD CONSTRAINT "revenue_share_parties_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_share_parties" ADD CONSTRAINT "revenue_share_parties_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_share_allocations" ADD CONSTRAINT "revenue_share_allocations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_share_allocations" ADD CONSTRAINT "revenue_share_allocations_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "revenue_share_parties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_share_allocations" ADD CONSTRAINT "revenue_share_allocations_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_share_allocations" ADD CONSTRAINT "revenue_share_allocations_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resale_listings" ADD CONSTRAINT "resale_listings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resale_listings" ADD CONSTRAINT "resale_listings_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_programs" ADD CONSTRAINT "referral_programs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_programId_fkey" FOREIGN KEY ("programId") REFERENCES "referral_programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrerContactId_fkey" FOREIGN KEY ("referrerContactId") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referredLeadId_fkey" FOREIGN KEY ("referredLeadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nri_buyer_profiles" ADD CONSTRAINT "nri_buyer_profiles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nri_buyer_profiles" ADD CONSTRAINT "nri_buyer_profiles_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "construction_erp_connections" ADD CONSTRAINT "construction_erp_connections_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "construction_erp_connections" ADD CONSTRAINT "construction_erp_connections_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "construction_milestone_updates" ADD CONSTRAINT "construction_milestone_updates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "construction_milestone_updates" ADD CONSTRAINT "construction_milestone_updates_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "construction_milestone_updates" ADD CONSTRAINT "construction_milestone_updates_towerId_fkey" FOREIGN KEY ("towerId") REFERENCES "towers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "physical_document_custodies" ADD CONSTRAINT "physical_document_custodies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "physical_document_custodies" ADD CONSTRAINT "physical_document_custodies_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "physical_document_custodies" ADD CONSTRAINT "physical_document_custodies_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "physical_document_custodies" ADD CONSTRAINT "physical_document_custodies_checkedOutById_fkey" FOREIGN KEY ("checkedOutById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "physical_document_custodies" ADD CONSTRAINT "physical_document_custodies_scanLinkMediaFileId_fkey" FOREIGN KEY ("scanLinkMediaFileId") REFERENCES "media_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- CreateEnum
CREATE TYPE "buyer_document_type" AS ENUM ('PAN', 'AADHAAR_OFFLINE_XML', 'ADDRESS_PROOF', 'PHOTO', 'SALARY_PROOF', 'BANK_STATEMENT', 'LOAN_SANCTION_LETTER', 'BOOKING_FORM', 'ALLOTMENT_LETTER', 'AGREEMENT_DRAFT', 'SIGNED_AGREEMENT', 'NOC', 'POSSESSION_LETTER', 'OTHER');

-- CreateEnum
CREATE TYPE "buyer_document_status" AS ENUM ('NOT_REQUESTED', 'REQUESTED', 'UPLOADED', 'PROCESSING', 'VERIFIED', 'REJECTED', 'EXPIRED', 'WAIVED');

-- CreateEnum
CREATE TYPE "kyc_verification_type" AS ENUM ('MANUAL', 'AADHAAR_OFFLINE_EKYC', 'DIGILOCKER');

-- CreateEnum
CREATE TYPE "kyc_verification_status" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "document_template_status" AS ENUM ('DRAFT', 'APPROVED', 'RETIRED');

-- CreateEnum
CREATE TYPE "esign_status" AS ENUM ('CREATED', 'SENT', 'SIGNED', 'EXPIRED', 'REJECTED');

-- CreateEnum
CREATE TYPE "payment_receipt_status" AS ENUM ('PENDING_RECONCILIATION', 'CONFIRMED', 'REVERSED', 'FAILED');

-- CreateEnum
CREATE TYPE "ledger_entry_type" AS ENUM ('DEBIT', 'CREDIT', 'PAYMENT', 'WAIVER', 'REVERSAL', 'REFUND');

-- CreateEnum
CREATE TYPE "partner_lead_claim_status" AS ENUM ('REGISTERED', 'ALREADY_REGISTERED', 'NEEDS_REVIEW', 'REJECTED');

-- CreateEnum
CREATE TYPE "commission_accrual_status" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'CLAWED_BACK');

-- CreateEnum
CREATE TYPE "integration_event_status" AS ENUM ('RECEIVED', 'PROCESSED', 'FAILED');

-- CreateEnum
CREATE TYPE "approval_request_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateTable
CREATE TABLE "buyer_documents" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "bookingId" TEXT,
    "type" "buyer_document_type" NOT NULL,
    "status" "buyer_document_status" NOT NULL DEFAULT 'NOT_REQUESTED',
    "mediaFileId" TEXT,
    "documentNumberMasked" TEXT,
    "source" TEXT,
    "issuedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "requestedById" TEXT,
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "buyer_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kyc_verifications" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "buyerDocumentId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "type" "kyc_verification_type" NOT NULL,
    "status" "kyc_verification_status" NOT NULL DEFAULT 'PENDING',
    "providerResponseRef" TEXT,
    "consentAt" TIMESTAMP(3),
    "consentIp" TEXT,
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kyc_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_templates" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "document_template_status" NOT NULL DEFAULT 'DRAFT',
    "bodyTemplate" TEXT NOT NULL,
    "variables" JSONB NOT NULL DEFAULT '[]',
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generated_documents" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "bookingId" TEXT,
    "generatedById" TEXT,
    "snapshot" JSONB NOT NULL DEFAULT '{}',
    "mediaFileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generated_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "esign_requests" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "generatedDocumentId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "envelopeId" TEXT,
    "status" "esign_status" NOT NULL DEFAULT 'CREATED',
    "signerName" TEXT,
    "signerEmail" TEXT,
    "signerPhone" TEXT,
    "sentAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "esign_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_receipts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "bookingId" TEXT,
    "externalRef" TEXT,
    "amountPaise" BIGINT NOT NULL,
    "mode" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "payment_receipt_status" NOT NULL DEFAULT 'PENDING_RECONCILIATION',
    "attachmentMediaId" TEXT,
    "confirmedById" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "reversedAt" TIMESTAMP(3),
    "reversalReason" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_allocations" (
    "id" TEXT NOT NULL,
    "paymentReceiptId" TEXT NOT NULL,
    "paymentScheduleId" TEXT NOT NULL,
    "amountPaise" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entries" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "bookingId" TEXT,
    "type" "ledger_entry_type" NOT NULL,
    "amountPaise" BIGINT NOT NULL,
    "relatedReceiptId" TEXT,
    "description" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_portal_users" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "channelPartnerId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_portal_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_lead_claims" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "channelPartnerId" TEXT NOT NULL,
    "leadId" TEXT,
    "phone" TEXT NOT NULL,
    "status" "partner_lead_claim_status" NOT NULL DEFAULT 'REGISTERED',
    "lockUntil" TIMESTAMP(3),
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decisionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_lead_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission_plans" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "channelPartnerId" TEXT,
    "name" TEXT NOT NULL,
    "triggerEvent" TEXT NOT NULL,
    "rateType" TEXT NOT NULL,
    "ratePaise" BIGINT,
    "ratePercent" DOUBLE PRECISION,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commission_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission_accruals" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "channelPartnerId" TEXT NOT NULL,
    "bookingId" TEXT,
    "planId" TEXT,
    "amountPaise" BIGINT NOT NULL,
    "status" "commission_accrual_status" NOT NULL DEFAULT 'PENDING',
    "policySnapshot" JSONB NOT NULL DEFAULT '{}',
    "payoutId" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commission_accruals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission_payouts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "channelPartnerId" TEXT NOT NULL,
    "amountPaise" BIGINT NOT NULL,
    "reference" TEXT,
    "paidAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commission_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "provider" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "status" "integration_event_status" NOT NULL DEFAULT 'RECEIVED',
    "payload" JSONB NOT NULL DEFAULT '{}',
    "error" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sla_breaches" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "slaRuleId" TEXT,
    "leadId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "breachType" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "escalatedToId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "sla_breaches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_requests" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "requestedById" TEXT,
    "status" "approval_request_status" NOT NULL DEFAULT 'PENDING',
    "policySnapshot" JSONB NOT NULL DEFAULT '{}',
    "amountPaise" BIGINT,
    "reason" TEXT,
    "approvedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "buyer_documents_tenant_id_status_idx" ON "buyer_documents"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "buyer_documents_leadId_idx" ON "buyer_documents"("leadId");

-- CreateIndex
CREATE INDEX "buyer_documents_bookingId_idx" ON "buyer_documents"("bookingId");

-- CreateIndex
CREATE INDEX "kyc_verifications_tenant_id_status_idx" ON "kyc_verifications"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "kyc_verifications_buyerDocumentId_idx" ON "kyc_verifications"("buyerDocumentId");

-- CreateIndex
CREATE INDEX "kyc_verifications_leadId_idx" ON "kyc_verifications"("leadId");

-- CreateIndex
CREATE INDEX "document_templates_tenant_id_documentType_status_idx" ON "document_templates"("tenant_id", "documentType", "status");

-- CreateIndex
CREATE INDEX "generated_documents_tenant_id_idx" ON "generated_documents"("tenant_id");

-- CreateIndex
CREATE INDEX "generated_documents_leadId_idx" ON "generated_documents"("leadId");

-- CreateIndex
CREATE INDEX "generated_documents_bookingId_idx" ON "generated_documents"("bookingId");

-- CreateIndex
CREATE INDEX "esign_requests_tenant_id_status_idx" ON "esign_requests"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "esign_requests_generatedDocumentId_idx" ON "esign_requests"("generatedDocumentId");

-- CreateIndex
CREATE INDEX "payment_receipts_tenant_id_status_idx" ON "payment_receipts"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "payment_receipts_leadId_idx" ON "payment_receipts"("leadId");

-- CreateIndex
CREATE INDEX "payment_receipts_bookingId_idx" ON "payment_receipts"("bookingId");

-- CreateIndex
CREATE INDEX "payment_allocations_paymentReceiptId_idx" ON "payment_allocations"("paymentReceiptId");

-- CreateIndex
CREATE INDEX "payment_allocations_paymentScheduleId_idx" ON "payment_allocations"("paymentScheduleId");

-- CreateIndex
CREATE INDEX "ledger_entries_tenant_id_leadId_idx" ON "ledger_entries"("tenant_id", "leadId");

-- CreateIndex
CREATE INDEX "ledger_entries_bookingId_idx" ON "ledger_entries"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "partner_portal_users_email_key" ON "partner_portal_users"("email");

-- CreateIndex
CREATE INDEX "partner_portal_users_tenant_id_channelPartnerId_idx" ON "partner_portal_users"("tenant_id", "channelPartnerId");

-- CreateIndex
CREATE INDEX "partner_lead_claims_tenant_id_channelPartnerId_idx" ON "partner_lead_claims"("tenant_id", "channelPartnerId");

-- CreateIndex
CREATE INDEX "partner_lead_claims_phone_idx" ON "partner_lead_claims"("phone");

-- CreateIndex
CREATE INDEX "partner_lead_claims_leadId_idx" ON "partner_lead_claims"("leadId");

-- CreateIndex
CREATE INDEX "commission_plans_tenant_id_channelPartnerId_active_idx" ON "commission_plans"("tenant_id", "channelPartnerId", "active");

-- CreateIndex
CREATE INDEX "commission_accruals_tenant_id_channelPartnerId_status_idx" ON "commission_accruals"("tenant_id", "channelPartnerId", "status");

-- CreateIndex
CREATE INDEX "commission_accruals_bookingId_idx" ON "commission_accruals"("bookingId");

-- CreateIndex
CREATE INDEX "commission_accruals_payoutId_idx" ON "commission_accruals"("payoutId");

-- CreateIndex
CREATE INDEX "commission_payouts_tenant_id_channelPartnerId_idx" ON "commission_payouts"("tenant_id", "channelPartnerId");

-- CreateIndex
CREATE INDEX "integration_events_tenant_id_status_idx" ON "integration_events"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "integration_events_provider_eventId_key" ON "integration_events"("provider", "eventId");

-- CreateIndex
CREATE INDEX "sla_breaches_tenant_id_resolvedAt_idx" ON "sla_breaches"("tenant_id", "resolvedAt");

-- CreateIndex
CREATE INDEX "sla_breaches_leadId_idx" ON "sla_breaches"("leadId");

-- CreateIndex
CREATE INDEX "approval_requests_tenant_id_status_idx" ON "approval_requests"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "approval_requests_entityType_entityId_idx" ON "approval_requests"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "buyer_documents" ADD CONSTRAINT "buyer_documents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buyer_documents" ADD CONSTRAINT "buyer_documents_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buyer_documents" ADD CONSTRAINT "buyer_documents_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buyer_documents" ADD CONSTRAINT "buyer_documents_mediaFileId_fkey" FOREIGN KEY ("mediaFileId") REFERENCES "media_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buyer_documents" ADD CONSTRAINT "buyer_documents_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buyer_documents" ADD CONSTRAINT "buyer_documents_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_verifications" ADD CONSTRAINT "kyc_verifications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_verifications" ADD CONSTRAINT "kyc_verifications_buyerDocumentId_fkey" FOREIGN KEY ("buyerDocumentId") REFERENCES "buyer_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_verifications" ADD CONSTRAINT "kyc_verifications_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_verifications" ADD CONSTRAINT "kyc_verifications_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_templates" ADD CONSTRAINT "document_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_templates" ADD CONSTRAINT "document_templates_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "document_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_mediaFileId_fkey" FOREIGN KEY ("mediaFileId") REFERENCES "media_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "esign_requests" ADD CONSTRAINT "esign_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "esign_requests" ADD CONSTRAINT "esign_requests_generatedDocumentId_fkey" FOREIGN KEY ("generatedDocumentId") REFERENCES "generated_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_receipts" ADD CONSTRAINT "payment_receipts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_receipts" ADD CONSTRAINT "payment_receipts_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_receipts" ADD CONSTRAINT "payment_receipts_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_receipts" ADD CONSTRAINT "payment_receipts_attachmentMediaId_fkey" FOREIGN KEY ("attachmentMediaId") REFERENCES "media_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_receipts" ADD CONSTRAINT "payment_receipts_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_paymentReceiptId_fkey" FOREIGN KEY ("paymentReceiptId") REFERENCES "payment_receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_paymentScheduleId_fkey" FOREIGN KEY ("paymentScheduleId") REFERENCES "payment_schedules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_relatedReceiptId_fkey" FOREIGN KEY ("relatedReceiptId") REFERENCES "payment_receipts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_portal_users" ADD CONSTRAINT "partner_portal_users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_portal_users" ADD CONSTRAINT "partner_portal_users_channelPartnerId_fkey" FOREIGN KEY ("channelPartnerId") REFERENCES "channel_partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_lead_claims" ADD CONSTRAINT "partner_lead_claims_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_lead_claims" ADD CONSTRAINT "partner_lead_claims_channelPartnerId_fkey" FOREIGN KEY ("channelPartnerId") REFERENCES "channel_partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_lead_claims" ADD CONSTRAINT "partner_lead_claims_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_lead_claims" ADD CONSTRAINT "partner_lead_claims_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_plans" ADD CONSTRAINT "commission_plans_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_plans" ADD CONSTRAINT "commission_plans_channelPartnerId_fkey" FOREIGN KEY ("channelPartnerId") REFERENCES "channel_partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_accruals" ADD CONSTRAINT "commission_accruals_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_accruals" ADD CONSTRAINT "commission_accruals_channelPartnerId_fkey" FOREIGN KEY ("channelPartnerId") REFERENCES "channel_partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_accruals" ADD CONSTRAINT "commission_accruals_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_accruals" ADD CONSTRAINT "commission_accruals_planId_fkey" FOREIGN KEY ("planId") REFERENCES "commission_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_accruals" ADD CONSTRAINT "commission_accruals_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "commission_payouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_accruals" ADD CONSTRAINT "commission_accruals_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_payouts" ADD CONSTRAINT "commission_payouts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_payouts" ADD CONSTRAINT "commission_payouts_channelPartnerId_fkey" FOREIGN KEY ("channelPartnerId") REFERENCES "channel_partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_payouts" ADD CONSTRAINT "commission_payouts_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_events" ADD CONSTRAINT "integration_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sla_breaches" ADD CONSTRAINT "sla_breaches_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sla_breaches" ADD CONSTRAINT "sla_breaches_slaRuleId_fkey" FOREIGN KEY ("slaRuleId") REFERENCES "sla_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sla_breaches" ADD CONSTRAINT "sla_breaches_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sla_breaches" ADD CONSTRAINT "sla_breaches_escalatedToId_fkey" FOREIGN KEY ("escalatedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- CreateEnum
CREATE TYPE "unit_hold_status" AS ENUM ('ACTIVE', 'RELEASED', 'EXPIRED', 'CONSUMED');

-- CreateEnum
CREATE TYPE "cost_sheet_status" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT', 'EXPIRED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "offer_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "offer_decision" AS ENUM ('APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "unit_status_history" ADD COLUMN     "changedById" TEXT,
ADD COLUMN     "reason" TEXT;

-- AlterTable
ALTER TABLE "units" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "unit_holds" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "requestedById" TEXT,
    "approvedById" TEXT,
    "status" "unit_hold_status" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "releasedAt" TIMESTAMP(3),
    "releaseReason" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unit_holds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_sheets" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "status" "cost_sheet_status" NOT NULL DEFAULT 'DRAFT',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "totalPaise" BIGINT NOT NULL,
    "templateVersion" INTEGER NOT NULL DEFAULT 1,
    "snapshot" JSONB NOT NULL DEFAULT '{}',
    "createdById" TEXT,
    "approvedById" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cost_sheets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_sheet_line_items" (
    "id" TEXT NOT NULL,
    "costSheetId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "calculationType" TEXT NOT NULL DEFAULT 'FLAT',
    "amountPaise" BIGINT NOT NULL,
    "taxable" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "cost_sheet_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offers" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "costSheetId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "requestedById" TEXT,
    "discountPaise" BIGINT,
    "discountPercent" DOUBLE PRECISION,
    "reason" TEXT,
    "proposedValuePaise" BIGINT,
    "policyThresholdPaise" BIGINT,
    "status" "offer_status" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer_approvals" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "approverId" TEXT,
    "decision" "offer_decision" NOT NULL,
    "reason" TEXT,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offer_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "unit_holds_tenant_id_status_idx" ON "unit_holds"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "unit_holds_unitId_status_idx" ON "unit_holds"("unitId", "status");

-- CreateIndex
CREATE INDEX "unit_holds_leadId_idx" ON "unit_holds"("leadId");

-- CreateIndex
CREATE INDEX "unit_holds_expiresAt_idx" ON "unit_holds"("expiresAt");

-- CreateIndex
CREATE INDEX "cost_sheets_tenant_id_status_idx" ON "cost_sheets"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "cost_sheets_leadId_idx" ON "cost_sheets"("leadId");

-- CreateIndex
CREATE INDEX "cost_sheets_unitId_idx" ON "cost_sheets"("unitId");

-- CreateIndex
CREATE INDEX "cost_sheet_line_items_costSheetId_idx" ON "cost_sheet_line_items"("costSheetId");

-- CreateIndex
CREATE INDEX "offers_tenant_id_status_idx" ON "offers"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "offers_costSheetId_idx" ON "offers"("costSheetId");

-- CreateIndex
CREATE INDEX "offers_leadId_idx" ON "offers"("leadId");

-- CreateIndex
CREATE INDEX "offer_approvals_offerId_idx" ON "offer_approvals"("offerId");

-- AddForeignKey
ALTER TABLE "unit_status_history" ADD CONSTRAINT "unit_status_history_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_holds" ADD CONSTRAINT "unit_holds_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_holds" ADD CONSTRAINT "unit_holds_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_holds" ADD CONSTRAINT "unit_holds_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_holds" ADD CONSTRAINT "unit_holds_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_holds" ADD CONSTRAINT "unit_holds_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_sheets" ADD CONSTRAINT "cost_sheets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_sheets" ADD CONSTRAINT "cost_sheets_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_sheets" ADD CONSTRAINT "cost_sheets_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_sheets" ADD CONSTRAINT "cost_sheets_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_sheets" ADD CONSTRAINT "cost_sheets_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_sheets" ADD CONSTRAINT "cost_sheets_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_sheet_line_items" ADD CONSTRAINT "cost_sheet_line_items_costSheetId_fkey" FOREIGN KEY ("costSheetId") REFERENCES "cost_sheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_costSheetId_fkey" FOREIGN KEY ("costSheetId") REFERENCES "cost_sheets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_approvals" ADD CONSTRAINT "offer_approvals_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_approvals" ADD CONSTRAINT "offer_approvals_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


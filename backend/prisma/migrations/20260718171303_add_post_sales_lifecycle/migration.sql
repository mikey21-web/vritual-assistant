-- CreateEnum
CREATE TYPE "post_sales_stage" AS ENUM ('BOOKING_CONFIRMED', 'KYC_IN_PROGRESS', 'ALLOTMENT_ISSUED', 'AGREEMENT_IN_PROGRESS', 'AGREEMENT_REGISTERED', 'PAYMENT_ACTIVE', 'PRE_POSSESSION', 'POSSESSION_OFFERED', 'HANDED_OVER', 'POST_POSSESSION_SUPPORT');

-- CreateEnum
CREATE TYPE "case_status" AS ENUM ('REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "refund_case_status" AS ENUM ('REQUESTED', 'APPROVED', 'PROCESSING', 'PAID', 'REJECTED');

-- CreateEnum
CREATE TYPE "possession_case_status" AS ENUM ('NOT_STARTED', 'PRECONDITIONS_PENDING', 'READY', 'OFFERED', 'ACKNOWLEDGED', 'HANDED_OVER');

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "postSalesStage" "post_sales_stage",
ADD COLUMN     "postSalesStageChangedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "post_sales_transitions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "fromStage" "post_sales_stage",
    "toStage" "post_sales_stage" NOT NULL,
    "preconditionsSnapshot" JSONB NOT NULL DEFAULT '{}',
    "reason" TEXT,
    "changedById" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_sales_transitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfer_cases" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "fromApplicantContactId" TEXT,
    "toApplicantName" TEXT NOT NULL,
    "toApplicantContactId" TEXT,
    "toApplicantPanMasked" TEXT,
    "reason" TEXT,
    "chargesPaise" BIGINT,
    "status" "case_status" NOT NULL DEFAULT 'REQUESTED',
    "requestedById" TEXT,
    "approvedById" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "transfer_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unit_shift_cases" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "fromUnitId" TEXT NOT NULL,
    "toUnitId" TEXT NOT NULL,
    "priceDifferencePaise" BIGINT,
    "reason" TEXT,
    "status" "case_status" NOT NULL DEFAULT 'REQUESTED',
    "requestedById" TEXT,
    "approvedById" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "unit_shift_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cancellation_cases" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "policySnapshot" JSONB NOT NULL DEFAULT '{}',
    "deductionAmountPaise" BIGINT,
    "refundPayablePaise" BIGINT,
    "status" "case_status" NOT NULL DEFAULT 'REQUESTED',
    "requestedById" TEXT,
    "approvedById" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "cancellation_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refund_cases" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "cancellationCaseId" TEXT,
    "amountPaise" BIGINT NOT NULL,
    "bankAccountVerified" BOOLEAN NOT NULL DEFAULT false,
    "status" "refund_case_status" NOT NULL DEFAULT 'REQUESTED',
    "requestedById" TEXT,
    "approvedById" TEXT,
    "paymentReference" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "refund_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "possession_cases" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "status" "possession_case_status" NOT NULL DEFAULT 'NOT_STARTED',
    "accountClearanceConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "documentClearanceConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "unitReadinessConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "possessionOfferedAt" TIMESTAMP(3),
    "possessionAcknowledgedAt" TIMESTAMP(3),
    "possessionAcknowledgedById" TEXT,
    "keyHandoverAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "possession_cases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "post_sales_transitions_tenant_id_bookingId_idx" ON "post_sales_transitions"("tenant_id", "bookingId");

-- CreateIndex
CREATE INDEX "transfer_cases_tenant_id_bookingId_idx" ON "transfer_cases"("tenant_id", "bookingId");

-- CreateIndex
CREATE INDEX "unit_shift_cases_tenant_id_bookingId_idx" ON "unit_shift_cases"("tenant_id", "bookingId");

-- CreateIndex
CREATE INDEX "cancellation_cases_tenant_id_bookingId_idx" ON "cancellation_cases"("tenant_id", "bookingId");

-- CreateIndex
CREATE INDEX "refund_cases_tenant_id_bookingId_idx" ON "refund_cases"("tenant_id", "bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "possession_cases_bookingId_key" ON "possession_cases"("bookingId");

-- CreateIndex
CREATE INDEX "possession_cases_tenant_id_idx" ON "possession_cases"("tenant_id");

-- AddForeignKey
ALTER TABLE "post_sales_transitions" ADD CONSTRAINT "post_sales_transitions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_sales_transitions" ADD CONSTRAINT "post_sales_transitions_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_sales_transitions" ADD CONSTRAINT "post_sales_transitions_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_cases" ADD CONSTRAINT "transfer_cases_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_cases" ADD CONSTRAINT "transfer_cases_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_cases" ADD CONSTRAINT "transfer_cases_fromApplicantContactId_fkey" FOREIGN KEY ("fromApplicantContactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_cases" ADD CONSTRAINT "transfer_cases_toApplicantContactId_fkey" FOREIGN KEY ("toApplicantContactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_cases" ADD CONSTRAINT "transfer_cases_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_cases" ADD CONSTRAINT "transfer_cases_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_shift_cases" ADD CONSTRAINT "unit_shift_cases_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_shift_cases" ADD CONSTRAINT "unit_shift_cases_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_shift_cases" ADD CONSTRAINT "unit_shift_cases_fromUnitId_fkey" FOREIGN KEY ("fromUnitId") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_shift_cases" ADD CONSTRAINT "unit_shift_cases_toUnitId_fkey" FOREIGN KEY ("toUnitId") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_shift_cases" ADD CONSTRAINT "unit_shift_cases_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_shift_cases" ADD CONSTRAINT "unit_shift_cases_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cancellation_cases" ADD CONSTRAINT "cancellation_cases_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cancellation_cases" ADD CONSTRAINT "cancellation_cases_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cancellation_cases" ADD CONSTRAINT "cancellation_cases_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cancellation_cases" ADD CONSTRAINT "cancellation_cases_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_cases" ADD CONSTRAINT "refund_cases_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_cases" ADD CONSTRAINT "refund_cases_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_cases" ADD CONSTRAINT "refund_cases_cancellationCaseId_fkey" FOREIGN KEY ("cancellationCaseId") REFERENCES "cancellation_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_cases" ADD CONSTRAINT "refund_cases_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_cases" ADD CONSTRAINT "refund_cases_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "possession_cases" ADD CONSTRAINT "possession_cases_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "possession_cases" ADD CONSTRAINT "possession_cases_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "possession_cases" ADD CONSTRAINT "possession_cases_possessionAcknowledgedById_fkey" FOREIGN KEY ("possessionAcknowledgedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


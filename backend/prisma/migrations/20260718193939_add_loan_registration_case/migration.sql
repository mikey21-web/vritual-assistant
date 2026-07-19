-- CreateEnum
CREATE TYPE "loan_sanction_status" AS ENUM ('NOT_APPLIED', 'APPLIED', 'SANCTIONED', 'REJECTED');

-- CreateEnum
CREATE TYPE "loan_disbursement_status" AS ENUM ('NOT_REQUESTED', 'REQUESTED', 'PARTIAL', 'COMPLETE');

-- CreateEnum
CREATE TYPE "noc_status" AS ENUM ('NOT_REQUESTED', 'REQUESTED', 'RECEIVED');

-- CreateTable
CREATE TABLE "loan_registration_cases" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "lenderName" TEXT,
    "loanAmountPaise" BIGINT,
    "sanctionStatus" "loan_sanction_status" NOT NULL DEFAULT 'NOT_APPLIED',
    "sanctionDate" TIMESTAMP(3),
    "disbursementStatus" "loan_disbursement_status" NOT NULL DEFAULT 'NOT_REQUESTED',
    "disbursedAmountPaise" BIGINT,
    "registrationAppointmentAt" TIMESTAMP(3),
    "registrationChargesPaise" BIGINT,
    "registrationReceiptNumber" TEXT,
    "registeredAt" TIMESTAMP(3),
    "bankNocStatus" "noc_status" NOT NULL DEFAULT 'NOT_REQUESTED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loan_registration_cases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "loan_registration_cases_bookingId_key" ON "loan_registration_cases"("bookingId");

-- CreateIndex
CREATE INDEX "loan_registration_cases_tenant_id_idx" ON "loan_registration_cases"("tenant_id");

-- AddForeignKey
ALTER TABLE "loan_registration_cases" ADD CONSTRAINT "loan_registration_cases_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_registration_cases" ADD CONSTRAINT "loan_registration_cases_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- CreateEnum
CREATE TYPE "payment_schedule_status" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'WAIVED');

-- CreateEnum
CREATE TYPE "channel_partner_status" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateTable
CREATE TABLE "payment_schedules" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "bookingId" TEXT,
    "label" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "dueDate" TIMESTAMP(3),
    "status" "payment_schedule_status" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channel_partners" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "reraId" TEXT,
    "commissionRate" DOUBLE PRECISION,
    "status" "channel_partner_status" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "channel_partners_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "leads" ADD COLUMN "channelPartnerId" TEXT;

-- CreateIndex
CREATE INDEX "payment_schedules_tenant_id_idx" ON "payment_schedules"("tenant_id");
CREATE INDEX "payment_schedules_leadId_idx" ON "payment_schedules"("leadId");
CREATE INDEX "payment_schedules_bookingId_idx" ON "payment_schedules"("bookingId");
CREATE INDEX "payment_schedules_status_idx" ON "payment_schedules"("status");
CREATE INDEX "payment_schedules_dueDate_idx" ON "payment_schedules"("dueDate");

-- CreateIndex
CREATE INDEX "channel_partners_tenant_id_idx" ON "channel_partners"("tenant_id");
CREATE INDEX "channel_partners_status_idx" ON "channel_partners"("status");

-- CreateIndex
CREATE INDEX "leads_channelPartnerId_idx" ON "leads"("channelPartnerId");

-- AddForeignKey
ALTER TABLE "payment_schedules" ADD CONSTRAINT "payment_schedules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_schedules" ADD CONSTRAINT "payment_schedules_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_schedules" ADD CONSTRAINT "payment_schedules_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_partners" ADD CONSTRAINT "channel_partners_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_channelPartnerId_fkey" FOREIGN KEY ("channelPartnerId") REFERENCES "channel_partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

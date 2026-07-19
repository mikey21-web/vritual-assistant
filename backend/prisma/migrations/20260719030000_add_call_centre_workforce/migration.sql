-- CreateEnum
CREATE TYPE "agent_availability_status" AS ENUM ('AVAILABLE', 'ON_CALL', 'BREAK', 'OFFLINE');

-- CreateTable
CREATE TABLE "shifts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "daysOfWeek" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_availabilities" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "shiftId" TEXT,
    "status" "agent_availability_status" NOT NULL DEFAULT 'OFFLINE',
    "since" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_availabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "call_quality_reviews" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "callLogId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "score" INTEGER NOT NULL,
    "notes" TEXT,
    "criteria" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "call_quality_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visit_attendances" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "siteVisitId" TEXT NOT NULL,
    "checkedInById" TEXT,
    "method" TEXT NOT NULL DEFAULT 'MANUAL',
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "checkedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visit_attendances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shifts_tenant_id_idx" ON "shifts"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "agent_availabilities_userId_key" ON "agent_availabilities"("userId");

-- CreateIndex
CREATE INDEX "agent_availabilities_tenant_id_idx" ON "agent_availabilities"("tenant_id");

-- CreateIndex
CREATE INDEX "call_quality_reviews_tenant_id_idx" ON "call_quality_reviews"("tenant_id");

-- CreateIndex
CREATE INDEX "call_quality_reviews_callLogId_idx" ON "call_quality_reviews"("callLogId");

-- CreateIndex
CREATE INDEX "visit_attendances_tenant_id_idx" ON "visit_attendances"("tenant_id");

-- CreateIndex
CREATE INDEX "visit_attendances_siteVisitId_idx" ON "visit_attendances"("siteVisitId");

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_availabilities" ADD CONSTRAINT "agent_availabilities_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_availabilities" ADD CONSTRAINT "agent_availabilities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_availabilities" ADD CONSTRAINT "agent_availabilities_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "shifts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_quality_reviews" ADD CONSTRAINT "call_quality_reviews_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_quality_reviews" ADD CONSTRAINT "call_quality_reviews_callLogId_fkey" FOREIGN KEY ("callLogId") REFERENCES "call_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_quality_reviews" ADD CONSTRAINT "call_quality_reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_attendances" ADD CONSTRAINT "visit_attendances_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_attendances" ADD CONSTRAINT "visit_attendances_siteVisitId_fkey" FOREIGN KEY ("siteVisitId") REFERENCES "site_visits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_attendances" ADD CONSTRAINT "visit_attendances_checkedInById_fkey" FOREIGN KEY ("checkedInById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


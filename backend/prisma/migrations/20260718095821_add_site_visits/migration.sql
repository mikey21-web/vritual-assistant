-- CreateEnum
CREATE TYPE "site_visit_status" AS ENUM ('SCHEDULED', 'CONFIRMED', 'COMPLETED', 'NO_SHOW', 'RESCHEDULED', 'CANCELLED');

-- CreateTable
CREATE TABLE "site_visits" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "unitId" TEXT,
    "assignedAgentId" TEXT,
    "createdById" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "status" "site_visit_status" NOT NULL DEFAULT 'SCHEDULED',
    "meetingPoint" TEXT,
    "mapsUrl" TEXT,
    "attendeeCount" INTEGER,
    "transportNote" TEXT,
    "language" TEXT,
    "confirmationChannel" TEXT,
    "confirmationAt" TIMESTAMP(3),
    "checkedInAt" TIMESTAMP(3),
    "checkedOutAt" TIMESTAMP(3),
    "outcome" JSONB DEFAULT '{}',
    "noShowReason" TEXT,
    "rescheduleReason" TEXT,
    "nextActionAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_visits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "site_visits_tenant_id_status_startAt_idx" ON "site_visits"("tenant_id", "status", "startAt");

-- CreateIndex
CREATE INDEX "site_visits_leadId_idx" ON "site_visits"("leadId");

-- CreateIndex
CREATE INDEX "site_visits_assignedAgentId_idx" ON "site_visits"("assignedAgentId");

-- CreateIndex
CREATE INDEX "site_visits_projectId_idx" ON "site_visits"("projectId");

-- AddForeignKey
ALTER TABLE "site_visits" ADD CONSTRAINT "site_visits_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_visits" ADD CONSTRAINT "site_visits_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_visits" ADD CONSTRAINT "site_visits_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_visits" ADD CONSTRAINT "site_visits_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_visits" ADD CONSTRAINT "site_visits_assignedAgentId_fkey" FOREIGN KEY ("assignedAgentId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_visits" ADD CONSTRAINT "site_visits_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


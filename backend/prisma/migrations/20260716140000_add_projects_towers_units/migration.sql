-- CreateEnum
CREATE TYPE "project_status" AS ENUM ('PLANNING', 'UNDER_CONSTRUCTION', 'READY_TO_MOVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "unit_status" AS ENUM ('AVAILABLE', 'BLOCKED', 'BOOKED', 'SOLD', 'ON_HOLD');

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "address" TEXT,
    "reraId" TEXT,
    "status" "project_status" NOT NULL DEFAULT 'UNDER_CONSTRUCTION',
    "possessionDate" TIMESTAMP(3),
    "amenities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "images" JSONB NOT NULL DEFAULT '[]',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "towers" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "totalFloors" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "towers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "towerId" TEXT,
    "unitNumber" TEXT NOT NULL,
    "floor" INTEGER,
    "unitType" TEXT,
    "areaSqft" DOUBLE PRECISION,
    "price" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "unit_status" NOT NULL DEFAULT 'AVAILABLE',
    "facing" TEXT,
    "leadId" TEXT,
    "bookedAt" TIMESTAMP(3),
    "soldAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unit_status_history" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "fromStatus" "unit_status",
    "toStatus" "unit_status" NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unit_status_history_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN "unitId" TEXT;

-- CreateIndex
CREATE INDEX "projects_tenant_id_idx" ON "projects"("tenant_id");
CREATE INDEX "projects_status_idx" ON "projects"("status");

-- CreateIndex
CREATE INDEX "towers_projectId_idx" ON "towers"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "units_projectId_unitNumber_key" ON "units"("projectId", "unitNumber");
CREATE INDEX "units_tenant_id_idx" ON "units"("tenant_id");
CREATE INDEX "units_projectId_idx" ON "units"("projectId");
CREATE INDEX "units_towerId_idx" ON "units"("towerId");
CREATE INDEX "units_status_idx" ON "units"("status");
CREATE INDEX "units_leadId_idx" ON "units"("leadId");

-- CreateIndex
CREATE INDEX "unit_status_history_unitId_idx" ON "unit_status_history"("unitId");
CREATE INDEX "unit_status_history_changedAt_idx" ON "unit_status_history"("changedAt");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "towers" ADD CONSTRAINT "towers_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "units" ADD CONSTRAINT "units_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "units" ADD CONSTRAINT "units_towerId_fkey" FOREIGN KEY ("towerId") REFERENCES "towers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "units" ADD CONSTRAINT "units_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_status_history" ADD CONSTRAINT "unit_status_history_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

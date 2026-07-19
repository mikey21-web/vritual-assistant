-- CreateTable
CREATE TABLE "construction_milestone_updates" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "towerId" TEXT,
    "milestoneName" TEXT NOT NULL,
    "percentComplete" INTEGER NOT NULL,
    "sourceType" TEXT NOT NULL,
    "reportedById" TEXT,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "construction_milestone_updates_pkey" PRIMARY KEY ("id")
);

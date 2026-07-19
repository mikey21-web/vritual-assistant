-- AlterTable
ALTER TABLE "users" ADD COLUMN     "managerId" TEXT;

-- CreateTable
CREATE TABLE "territory_assignments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "territory_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "territory_assignments_tenant_id_idx" ON "territory_assignments"("tenant_id");

-- CreateIndex
CREATE INDEX "territory_assignments_projectId_idx" ON "territory_assignments"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "territory_assignments_userId_projectId_key" ON "territory_assignments"("userId", "projectId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "territory_assignments" ADD CONSTRAINT "territory_assignments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "territory_assignments" ADD CONSTRAINT "territory_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "territory_assignments" ADD CONSTRAINT "territory_assignments_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;


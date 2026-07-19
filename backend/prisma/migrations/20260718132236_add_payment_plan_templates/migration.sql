-- CreateEnum
CREATE TYPE "payment_plan_type" AS ENUM ('CONSTRUCTION_LINKED', 'TIME_LINKED', 'DOWN_PAYMENT', 'SUBVENTION', 'CUSTOM');

-- CreateTable
CREATE TABLE "payment_plan_templates" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "planType" "payment_plan_type" NOT NULL,
    "milestones" JSONB NOT NULL DEFAULT '[]',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_plan_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payment_plan_templates_tenant_id_planType_active_idx" ON "payment_plan_templates"("tenant_id", "planType", "active");

-- AddForeignKey
ALTER TABLE "payment_plan_templates" ADD CONSTRAINT "payment_plan_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


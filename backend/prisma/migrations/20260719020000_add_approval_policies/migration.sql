-- CreateTable
CREATE TABLE "approval_policies" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "minAmountPaise" BIGINT,
    "requiredRole" "UserRole" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approval_policies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "approval_policies_tenant_id_type_idx" ON "approval_policies"("tenant_id", "type");

-- AddForeignKey
ALTER TABLE "approval_policies" ADD CONSTRAINT "approval_policies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


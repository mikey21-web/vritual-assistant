-- CreateEnum
CREATE TYPE "MemoryType" AS ENUM ('WORKING', 'EPISODIC', 'SEMANTIC', 'PROCEDURAL');

-- CreateTable
CREATE TABLE "mikey_memory" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "type" "MemoryType" NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "summary" TEXT,
    "source" TEXT,
    "leadId" TEXT,
    "episodeStart" TIMESTAMP(3),
    "episodeEnd" TIMESTAMP(3),
    "validAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invalidAt" TIMESTAMP(3),
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "mikey_memory_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "mikey_memory_tenant_id_type_idx" ON "mikey_memory"("tenant_id", "type");
CREATE INDEX "mikey_memory_tenant_id_key_idx" ON "mikey_memory"("tenant_id", "key");
CREATE INDEX "mikey_memory_tenant_id_type_leadId_idx" ON "mikey_memory"("tenant_id", "type", "leadId");
CREATE INDEX "mikey_memory_validAt_idx" ON "mikey_memory"("validAt");

-- CreateTable
CREATE TABLE "mikey_procedural_rules" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "rule" TEXT NOT NULL,
    "rationale" TEXT,
    "category" TEXT,
    "impactMetric" TEXT,
    "impactDelta" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "firstAppliedAt" TIMESTAMP(3),
    "lastAppliedAt" TIMESTAMP(3),
    "retireAt" TIMESTAMP(3),
    "applyCount" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "mikey_procedural_rules_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "mikey_procedural_rules_tenant_id_status_idx" ON "mikey_procedural_rules"("tenant_id", "status");
CREATE INDEX "mikey_procedural_rules_tenant_id_category_idx" ON "mikey_procedural_rules"("tenant_id", "category");

-- CreateTable
CREATE TABLE "mikey_reflexion_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "outcomeType" TEXT NOT NULL,
    "entityId" TEXT,
    "trajectory" JSONB NOT NULL,
    "reflection" TEXT NOT NULL,
    "candidateRule" TEXT,
    "perspectives" JSONB,
    "approvedRuleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "mikey_reflexion_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "mikey_reflexion_logs_tenant_id_outcomeType_idx" ON "mikey_reflexion_logs"("tenant_id", "outcomeType");

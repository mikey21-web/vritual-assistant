-- Audit trail + undo primitive for actions Mikey takes autonomously
-- (without being asked), triggered by MikeySchedulerService findings.
CREATE TABLE "mikey_autonomous_actions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "findingType" TEXT NOT NULL,
    "tool" TEXT NOT NULL,
    "leadId" TEXT,
    "args" JSONB NOT NULL DEFAULT '{}',
    "result" TEXT,
    "undoable" BOOLEAN NOT NULL DEFAULT false,
    "undoData" JSONB,
    "undone" BOOLEAN NOT NULL DEFAULT false,
    "undoneAt" TIMESTAMP(3),
    "undoneById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mikey_autonomous_actions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "mikey_autonomous_actions_tenant_id_createdAt_idx" ON "mikey_autonomous_actions"("tenant_id", "createdAt");
CREATE INDEX "mikey_autonomous_actions_tenant_id_undone_idx" ON "mikey_autonomous_actions"("tenant_id", "undone");

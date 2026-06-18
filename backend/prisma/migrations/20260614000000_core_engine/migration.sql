-- CreateTable: system_events
CREATE TABLE "system_events" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'system',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "entityType" TEXT,
    "entityId" TEXT,
    "leadId" TEXT,
    "contactId" TEXT,
    "campaignId" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB,
    "correlationId" TEXT,
    "idempotencyKey" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "system_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "system_events_type_idx" ON "system_events"("type");
CREATE INDEX "system_events_status_idx" ON "system_events"("status");
CREATE INDEX "system_events_leadId_idx" ON "system_events"("leadId");
CREATE INDEX "system_events_contactId_idx" ON "system_events"("contactId");
CREATE INDEX "system_events_entityType_entityId_idx" ON "system_events"("entityType", "entityId");
CREATE INDEX "system_events_correlationId_idx" ON "system_events"("correlationId");
CREATE UNIQUE INDEX "system_events_idempotencyKey_key" ON "system_events"("idempotencyKey");
CREATE INDEX "system_events_createdAt_idx" ON "system_events"("createdAt");

ALTER TABLE "system_events" ADD CONSTRAINT "system_events_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "system_events" ADD CONSTRAINT "system_events_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: automation_rules
CREATE TABLE "automation_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "eventType" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "conditions" JSONB NOT NULL,
    "actions" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_rules_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "automation_rules_category_idx" ON "automation_rules"("category");
CREATE INDEX "automation_rules_eventType_idx" ON "automation_rules"("eventType");
CREATE INDEX "automation_rules_active_idx" ON "automation_rules"("active");
CREATE INDEX "automation_rules_priority_idx" ON "automation_rules"("priority");

-- CreateTable: rule_executions
CREATE TABLE "rule_executions" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "eventId" TEXT,
    "result" TEXT NOT NULL,
    "input" JSONB NOT NULL DEFAULT '{}',
    "output" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rule_executions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "rule_executions_ruleId_idx" ON "rule_executions"("ruleId");
CREATE INDEX "rule_executions_eventId_idx" ON "rule_executions"("eventId");
CREATE INDEX "rule_executions_createdAt_idx" ON "rule_executions"("createdAt");

ALTER TABLE "rule_executions" ADD CONSTRAINT "rule_executions_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "automation_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: timeline_items
CREATE TABLE "timeline_items" (
    "id" TEXT NOT NULL,
    "leadId" TEXT,
    "contactId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "timeline_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "timeline_items_leadId_idx" ON "timeline_items"("leadId");
CREATE INDEX "timeline_items_contactId_idx" ON "timeline_items"("contactId");
CREATE INDEX "timeline_items_type_idx" ON "timeline_items"("type");
CREATE INDEX "timeline_items_createdAt_idx" ON "timeline_items"("createdAt");

ALTER TABLE "timeline_items" ADD CONSTRAINT "timeline_items_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "timeline_items" ADD CONSTRAINT "timeline_items_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: failure_records
CREATE TABLE "failure_records" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "entityType" TEXT,
    "entityId" TEXT,
    "leadId" TEXT,
    "contactId" TEXT,
    "provider" TEXT,
    "operation" TEXT,
    "message" TEXT NOT NULL,
    "errorCode" TEXT,
    "rawError" JSONB,
    "retryable" BOOLEAN NOT NULL DEFAULT true,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "nextRetryAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "failure_records_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "failure_records_status_idx" ON "failure_records"("status");
CREATE INDEX "failure_records_type_idx" ON "failure_records"("type");
CREATE INDEX "failure_records_leadId_idx" ON "failure_records"("leadId");
CREATE INDEX "failure_records_nextRetryAt_idx" ON "failure_records"("nextRetryAt");
CREATE INDEX "failure_records_createdAt_idx" ON "failure_records"("createdAt");

ALTER TABLE "failure_records" ADD CONSTRAINT "failure_records_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: workflow_instances
CREATE TABLE "workflow_instances" (
    "id" TEXT NOT NULL,
    "workflowType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "leadId" TEXT,
    "contactId" TEXT,
    "campaignId" TEXT,
    "currentStep" TEXT,
    "context" JSONB NOT NULL DEFAULT '{}',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,

    CONSTRAINT "workflow_instances_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "workflow_instances_workflowType_idx" ON "workflow_instances"("workflowType");
CREATE INDEX "workflow_instances_status_idx" ON "workflow_instances"("status");
CREATE INDEX "workflow_instances_leadId_idx" ON "workflow_instances"("leadId");

ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: workflow_step_runs
CREATE TABLE "workflow_step_runs" (
    "id" TEXT NOT NULL,
    "workflowInstanceId" TEXT NOT NULL,
    "stepKey" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "input" JSONB,
    "output" JSONB,
    "error" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "workflow_step_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "workflow_step_runs_workflowInstanceId_idx" ON "workflow_step_runs"("workflowInstanceId");
CREATE INDEX "workflow_step_runs_stepKey_idx" ON "workflow_step_runs"("stepKey");
CREATE INDEX "workflow_step_runs_status_idx" ON "workflow_step_runs"("status");

ALTER TABLE "workflow_step_runs" ADD CONSTRAINT "workflow_step_runs_workflowInstanceId_fkey" FOREIGN KEY ("workflowInstanceId") REFERENCES "workflow_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

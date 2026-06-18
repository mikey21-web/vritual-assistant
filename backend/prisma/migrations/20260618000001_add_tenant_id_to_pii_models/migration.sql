-- Add tenantId to SystemEvent
ALTER TABLE "system_events" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "system_events" ADD CONSTRAINT "system_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "system_events_tenantId_idx" ON "system_events"("tenantId");

-- Add tenantId to TimelineItem
ALTER TABLE "timeline_items" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "timeline_items" ADD CONSTRAINT "timeline_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "timeline_items_tenantId_idx" ON "timeline_items"("tenantId");

-- Add tenantId to FailureRecord
ALTER TABLE "failure_records" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "failure_records" ADD CONSTRAINT "failure_records_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "failure_records_tenantId_idx" ON "failure_records"("tenantId");

-- Backfill SystemEvent (from lead or contact)
UPDATE "system_events" SET "tenantId" = COALESCE(
  (SELECT "l"."tenantId" FROM "leads" "l" WHERE "l"."id" = "system_events"."leadId"),
  (SELECT "c"."tenantId" FROM "contacts" "c" WHERE "c"."id" = "system_events"."contactId")
);

-- Backfill TimelineItem (from lead or contact)
UPDATE "timeline_items" SET "tenantId" = COALESCE(
  (SELECT "l"."tenantId" FROM "leads" "l" WHERE "l"."id" = "timeline_items"."leadId"),
  (SELECT "c"."tenantId" FROM "contacts" "c" WHERE "c"."id" = "timeline_items"."contactId")
);

-- Backfill FailureRecord (from lead)
UPDATE "failure_records" SET "tenantId" = (
  SELECT "l"."tenantId" FROM "leads" "l" WHERE "l"."id" = "failure_records"."leadId"
) WHERE "leadId" IS NOT NULL;

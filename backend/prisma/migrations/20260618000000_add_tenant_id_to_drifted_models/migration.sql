-- Add tenantId to Task
ALTER TABLE "tasks" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "tasks_tenantId_idx" ON "tasks"("tenantId");

-- Add tenantId to ConversationMessage
ALTER TABLE "conversation_messages" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "conversation_messages_tenantId_idx" ON "conversation_messages"("tenantId");

-- Add tenantId to MediaFile
ALTER TABLE "media_files" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "media_files" ADD CONSTRAINT "media_files_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "media_files_tenantId_idx" ON "media_files"("tenantId");

-- Add tenantId to RevenueRecord
ALTER TABLE "revenue_records" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "revenue_records" ADD CONSTRAINT "revenue_records_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "revenue_records_tenantId_idx" ON "revenue_records"("tenantId");

-- Add tenantId to AuditLog
ALTER TABLE "audit_logs" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "audit_logs_tenantId_idx" ON "audit_logs"("tenantId");

-- Backfill Tasks (from Lead)
UPDATE "tasks" SET "tenantId" = (
  SELECT "l"."tenantId" FROM "leads" "l" WHERE "l"."id" = "tasks"."leadId"
) WHERE "leadId" IS NOT NULL;

-- Backfill ConversationMessages (from Lead)
UPDATE "conversation_messages" SET "tenantId" = (
  SELECT "l"."tenantId" FROM "leads" "l" WHERE "l"."id" = "conversation_messages"."leadId"
);

-- Backfill MediaFiles (from Lead, Campaign, or Contact)
UPDATE "media_files" SET "tenantId" = COALESCE(
  (SELECT "l"."tenantId" FROM "leads" "l" WHERE "l"."id" = "media_files"."leadId"),
  (SELECT "c"."tenantId" FROM "campaigns" "c" WHERE "c"."id" = "media_files"."campaignId"),
  (SELECT "co"."tenantId" FROM "contacts" "co" WHERE "co"."id" = "media_files"."contactId")
);

-- Backfill RevenueRecords (from Lead)
UPDATE "revenue_records" SET "tenantId" = (
  SELECT "l"."tenantId" FROM "leads" "l" WHERE "l"."id" = "revenue_records"."leadId"
);

-- Backfill AuditLogs (from User)
UPDATE "audit_logs" SET "tenantId" = (
  SELECT "u"."tenantId" FROM "users" "u" WHERE "u"."id" = "audit_logs"."userId"
) WHERE "userId" IS NOT NULL;

-- Drop existing FK on User.tenant with default onDelete, re-add with Restrict
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_tenantId_fkey";
ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- De-duplicate Contacts: keep the first contact per (tenantId, phone) or (tenantId, email)
-- For (tenantId, phone) where both non-null and duplicate
DELETE FROM "contacts" a
USING "contacts" b
WHERE a."tenantId" IS NOT NULL
  AND a."phone" IS NOT NULL
  AND b."tenantId" IS NOT NULL
  AND b."phone" IS NOT NULL
  AND a."tenantId" = b."tenantId"
  AND a."phone" = b."phone"
  AND a."createdAt" > b."createdAt";

-- For (tenantId, email) where both non-null and duplicate
DELETE FROM "contacts" a
USING "contacts" b
WHERE a."tenantId" IS NOT NULL
  AND a."email" IS NOT NULL
  AND b."tenantId" IS NOT NULL
  AND b."email" IS NOT NULL
  AND a."tenantId" = b."tenantId"
  AND a."email" = b."email"
  AND a."createdAt" > b."createdAt";

-- Add @@unique([tenantId, phone]) and @@unique([tenantId, email]) on Contact
CREATE UNIQUE INDEX "contacts_tenantId_phone_key" ON "contacts"("tenantId", "phone");
CREATE UNIQUE INDEX "contacts_tenantId_email_key" ON "contacts"("tenantId", "email");

-- Consent model + ScheduledAction for Track C

-- Add consent fields to contacts
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "consent_status" TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "consent_source" TEXT;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "consent_at" TIMESTAMPTZ;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "opted_out_at" TIMESTAMPTZ;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "agent_memory" JSONB;

-- Create consent_events table
CREATE TABLE IF NOT EXISTS "consent_events" (
    "id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "source" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "consent_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "consent_events_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "consent_events_contact_id_idx" ON "consent_events"("contact_id");

-- Add quiet hours and autonomy to business settings
ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "quiet_hours_start" TEXT;
ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "quiet_hours_end" TEXT;
ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "autonomy_level" TEXT NOT NULL DEFAULT 'full';
ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "consent_required" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "max_messages_per_day" INTEGER NOT NULL DEFAULT 10;

-- Create scheduled_actions table
CREATE TABLE IF NOT EXISTS "scheduled_actions" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "run_at" TIMESTAMPTZ NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "dedupe_key" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "scheduled_actions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "scheduled_actions_dedupe_key_key" UNIQUE ("dedupe_key"),
    CONSTRAINT "scheduled_actions_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "scheduled_actions_status_run_at_idx" ON "scheduled_actions"("status", "run_at");
CREATE INDEX IF NOT EXISTS "scheduled_actions_lead_id_idx" ON "scheduled_actions"("lead_id");

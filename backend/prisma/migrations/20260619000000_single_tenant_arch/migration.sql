-- Single-tenant architecture migration
-- Removes Tenant, NicheTemplate, NicheTemplatePack, ClientTemplateInstallation tables
-- Drops FK constraints referencing tenant_id
-- Keeps tenantId columns as plain nullable strings for backward compatibility

-- Drop client_template_installations first (depends on niche_templates and tenants)
DROP TABLE IF EXISTS "client_template_installations" CASCADE;

-- Drop niche_template_packs (depends on niche_templates)
DROP TABLE IF EXISTS "niche_template_packs" CASCADE;

-- Drop niche_templates
DROP TABLE IF EXISTS "niche_templates" CASCADE;

-- Drop tenant-related FK constraints from all tables
ALTER TABLE IF EXISTS "users" DROP CONSTRAINT IF EXISTS "users_tenant_id_fkey";
ALTER TABLE IF EXISTS "business_settings" DROP CONSTRAINT IF EXISTS "business_settings_tenant_id_fkey";
ALTER TABLE IF EXISTS "contacts" DROP CONSTRAINT IF EXISTS "contacts_tenant_id_fkey";
ALTER TABLE IF EXISTS "leads" DROP CONSTRAINT IF EXISTS "leads_tenant_id_fkey";
ALTER TABLE IF EXISTS "campaigns" DROP CONSTRAINT IF EXISTS "campaigns_tenant_id_fkey";
ALTER TABLE IF EXISTS "lead_forms" DROP CONSTRAINT IF EXISTS "lead_forms_tenant_id_fkey";
ALTER TABLE IF EXISTS "qr_codes" DROP CONSTRAINT IF EXISTS "qr_codes_tenant_id_fkey";
ALTER TABLE IF EXISTS "conversation_messages" DROP CONSTRAINT IF EXISTS "conversation_messages_tenant_id_fkey";
ALTER TABLE IF EXISTS "message_templates" DROP CONSTRAINT IF EXISTS "message_templates_tenant_id_fkey";
ALTER TABLE IF EXISTS "media_files" DROP CONSTRAINT IF EXISTS "media_files_tenant_id_fkey";
ALTER TABLE IF EXISTS "nurture_sequences" DROP CONSTRAINT IF EXISTS "nurture_sequences_tenant_id_fkey";
ALTER TABLE IF EXISTS "scoring_rules" DROP CONSTRAINT IF EXISTS "scoring_rules_tenant_id_fkey";
ALTER TABLE IF EXISTS "routing_rules" DROP CONSTRAINT IF EXISTS "routing_rules_tenant_id_fkey";
ALTER TABLE IF EXISTS "tasks" DROP CONSTRAINT IF EXISTS "tasks_tenant_id_fkey";
ALTER TABLE IF EXISTS "conversions" DROP CONSTRAINT IF EXISTS "conversions_tenant_id_fkey";
ALTER TABLE IF EXISTS "integrations" DROP CONSTRAINT IF EXISTS "integrations_tenant_id_fkey";
ALTER TABLE IF EXISTS "crm_mappings" DROP CONSTRAINT IF EXISTS "crm_mappings_tenant_id_fkey";
ALTER TABLE IF EXISTS "booking_settings" DROP CONSTRAINT IF EXISTS "booking_settings_tenant_id_fkey";
ALTER TABLE IF EXISTS "audit_logs" DROP CONSTRAINT IF EXISTS "audit_logs_tenant_id_fkey";
ALTER TABLE IF EXISTS "custom_field_definitions" DROP CONSTRAINT IF EXISTS "custom_field_definitions_tenant_id_fkey";
ALTER TABLE IF EXISTS "blocklist_entries" DROP CONSTRAINT IF EXISTS "blocklist_entries_tenant_id_fkey";
ALTER TABLE IF EXISTS "sla_rules" DROP CONSTRAINT IF EXISTS "sla_rules_tenant_id_fkey";
ALTER TABLE IF EXISTS "revenue_records" DROP CONSTRAINT IF EXISTS "revenue_records_tenant_id_fkey";
ALTER TABLE IF EXISTS "pipeline_stages" DROP CONSTRAINT IF EXISTS "pipeline_stages_tenant_id_fkey";
ALTER TABLE IF EXISTS "automation_rules" DROP CONSTRAINT IF EXISTS "automation_rules_tenant_id_fkey";
ALTER TABLE IF EXISTS "system_events" DROP CONSTRAINT IF EXISTS "system_events_tenant_id_fkey";
ALTER TABLE IF EXISTS "timeline_items" DROP CONSTRAINT IF EXISTS "timeline_items_tenant_id_fkey";
ALTER TABLE IF EXISTS "failure_records" DROP CONSTRAINT IF EXISTS "failure_records_tenant_id_fkey";

-- Remove unique constraints that depend on tenantId
DROP INDEX IF EXISTS "contacts_tenant_id_phone_key";
DROP INDEX IF EXISTS "contacts_tenant_id_email_key";
DROP INDEX IF EXISTS "blocklist_entries_type_value_tenant_id_key";
DROP INDEX IF EXISTS "custom_field_definitions_key_target_tenant_id_key";

-- Add new unique constraints without tenantId (or make them unique on just the field)
-- For contacts, make phone and email unique globally for this deploy
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_phone_key" UNIQUE ("phone");
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_email_key" UNIQUE ("email");
ALTER TABLE "blocklist_entries" ADD CONSTRAINT "blocklist_entries_type_value_key" UNIQUE ("type", "value");
ALTER TABLE "custom_field_definitions" ADD CONSTRAINT "custom_field_definitions_key_target_key" UNIQUE ("key", "target");

-- Drop the tenants table
DROP TABLE IF EXISTS "tenants" CASCADE;

-- Remove tenantId indexes (they're no longer selective)
DROP INDEX IF EXISTS "users_tenant_id_idx";
DROP INDEX IF EXISTS "business_settings_tenant_id_idx";
DROP INDEX IF EXISTS "contacts_tenant_id_idx";
DROP INDEX IF EXISTS "leads_tenant_id_idx";
DROP INDEX IF EXISTS "campaigns_tenant_id_idx";
DROP INDEX IF EXISTS "lead_forms_tenant_id_idx";
DROP INDEX IF EXISTS "qr_codes_tenant_id_idx";
DROP INDEX IF EXISTS "conversation_messages_tenant_id_idx";
DROP INDEX IF EXISTS "message_templates_tenant_id_idx";
DROP INDEX IF EXISTS "media_files_tenant_id_idx";
DROP INDEX IF EXISTS "nurture_sequences_tenant_id_idx";
DROP INDEX IF EXISTS "scoring_rules_tenant_id_idx";
DROP INDEX IF EXISTS "routing_rules_tenant_id_idx";
DROP INDEX IF EXISTS "tasks_tenant_id_idx";
DROP INDEX IF EXISTS "conversions_tenant_id_idx";
DROP INDEX IF EXISTS "integrations_tenant_id_idx";
DROP INDEX IF EXISTS "crm_mappings_tenant_id_idx";
DROP INDEX IF EXISTS "booking_settings_tenant_id_idx";
DROP INDEX IF EXISTS "audit_logs_tenant_id_idx";
DROP INDEX IF EXISTS "custom_field_definitions_tenant_id_idx";
DROP INDEX IF EXISTS "blocklist_entries_tenant_id_idx";
DROP INDEX IF EXISTS "sla_rules_tenant_id_idx";
DROP INDEX IF EXISTS "revenue_records_tenant_id_idx";
DROP INDEX IF EXISTS "pipeline_stages_tenant_id_idx";
DROP INDEX IF EXISTS "automation_rules_tenant_id_idx";
DROP INDEX IF EXISTS "system_events_tenant_id_idx";
DROP INDEX IF EXISTS "timeline_items_tenant_id_idx";
DROP INDEX IF EXISTS "failure_records_tenant_id_idx";
DROP INDEX IF EXISTS "leads_tenant_id_status_idx";
DROP INDEX IF EXISTS "leads_tenant_id_assigned_agent_id_idx";

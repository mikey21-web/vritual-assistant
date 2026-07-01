-- Create Tenant table
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "domain" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'starter',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");
CREATE INDEX "tenants_slug_idx" ON "tenants"("slug");

-- Insert default tenant for existing data
INSERT INTO "tenants" ("id", "name", "slug", "created_at", "updated_at")
VALUES ('default-tenant', 'Default Tenant', 'default', NOW(), NOW());

-- Add tenantId columns (nullable first for backfill)
ALTER TABLE "users" ADD COLUMN "tenant_id" TEXT;
ALTER TABLE "contacts" ADD COLUMN "tenant_id" TEXT;
ALTER TABLE "leads" ADD COLUMN "tenant_id" TEXT;
ALTER TABLE "campaigns" ADD COLUMN "tenant_id" TEXT;
ALTER TABLE "integrations" ADD COLUMN "tenant_id" TEXT;

-- Backfill existing records
UPDATE "users" SET "tenant_id" = 'default-tenant' WHERE "tenant_id" IS NULL;
UPDATE "contacts" SET "tenant_id" = 'default-tenant' WHERE "tenant_id" IS NULL;
UPDATE "leads" SET "tenant_id" = 'default-tenant' WHERE "tenant_id" IS NULL;
UPDATE "campaigns" SET "tenant_id" = 'default-tenant' WHERE "tenant_id" IS NULL;
UPDATE "integrations" SET "tenant_id" = 'default-tenant' WHERE "tenant_id" IS NULL;

-- Make tenantId required
ALTER TABLE "users" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "contacts" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "leads" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "campaigns" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "integrations" ALTER COLUMN "tenant_id" SET NOT NULL;

-- Add foreign keys
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id");
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id");
ALTER TABLE "leads" ADD CONSTRAINT "leads_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id");
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id");
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id");

-- Add indexes
CREATE INDEX "users_tenant_id_idx" ON "users"("tenant_id");
CREATE INDEX "contacts_tenant_id_idx" ON "contacts"("tenant_id");
CREATE INDEX "leads_tenant_id_idx" ON "leads"("tenant_id");
CREATE INDEX "campaigns_tenant_id_idx" ON "campaigns"("tenant_id");
CREATE INDEX "integrations_tenant_id_idx" ON "integrations"("tenant_id");

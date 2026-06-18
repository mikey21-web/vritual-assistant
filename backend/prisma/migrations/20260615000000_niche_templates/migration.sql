-- CreateTable: niche_templates
CREATE TABLE "niche_templates" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "industry" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "niche_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "niche_templates_key_key" ON "niche_templates"("key");
CREATE INDEX "niche_templates_industry_idx" ON "niche_templates"("industry");
CREATE INDEX "niche_templates_status_idx" ON "niche_templates"("status");
CREATE INDEX "niche_templates_key_idx" ON "niche_templates"("key");

-- CreateTable: niche_template_packs
CREATE TABLE "niche_template_packs" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "niche_template_packs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "niche_template_packs_templateId_idx" ON "niche_template_packs"("templateId");
CREATE INDEX "niche_template_packs_type_idx" ON "niche_template_packs"("type");
ALTER TABLE "niche_template_packs" ADD CONSTRAINT "niche_template_packs_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "niche_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: client_template_installations
CREATE TABLE "client_template_installations" (
    "id" TEXT NOT NULL,
    "clientKey" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "templateVersion" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'installed',
    "installedById" TEXT,
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "configSnapshot" JSONB NOT NULL,
    "createdRecords" JSONB NOT NULL,
    "errorMessage" TEXT,

    CONSTRAINT "client_template_installations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "client_template_installations_clientKey_idx" ON "client_template_installations"("clientKey");
CREATE INDEX "client_template_installations_templateId_idx" ON "client_template_installations"("templateId");
CREATE INDEX "client_template_installations_status_idx" ON "client_template_installations"("status");
ALTER TABLE "client_template_installations" ADD CONSTRAINT "client_template_installations_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "niche_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

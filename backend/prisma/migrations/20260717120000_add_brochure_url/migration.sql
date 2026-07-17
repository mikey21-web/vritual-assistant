-- Brochure PDF link for property listings and builder projects, so agents
-- can share the full spec sheet alongside photos without a separate system.
ALTER TABLE "properties" ADD COLUMN "brochureUrl" TEXT;
ALTER TABLE "projects" ADD COLUMN "brochureUrl" TEXT;

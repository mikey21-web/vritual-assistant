-- Keep only the earliest row if duplicates already exist, before enforcing the unique constraint.
DELETE FROM "business_settings"
WHERE id NOT IN (
  SELECT id FROM "business_settings" ORDER BY "createdAt" ASC LIMIT 1
);

ALTER TABLE "business_settings" ADD COLUMN "singleton" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "business_settings" ADD CONSTRAINT "business_settings_singleton_key" UNIQUE ("singleton");

-- AlterTable: Add soft delete fields
ALTER TABLE "contacts" ADD COLUMN "deleted_at" TIMESTAMP(3);
ALTER TABLE "leads" ADD COLUMN "deleted_at" TIMESTAMP(3);

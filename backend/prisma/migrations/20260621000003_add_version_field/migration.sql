-- AlterTable: Add version field for optimistic locking
ALTER TABLE "contacts" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "leads" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;

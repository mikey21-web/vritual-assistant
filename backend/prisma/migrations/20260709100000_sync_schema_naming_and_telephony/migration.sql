-- CreateEnum
CREATE TYPE "CallDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "CallStatus" AS ENUM ('INITIATED', 'RINGING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'NO_ANSWER', 'BUSY');

-- AlterEnum
ALTER TYPE "CustomFieldTarget" ADD VALUE 'TICKET';

-- AlterEnum
ALTER TYPE "LeadSource" ADD VALUE 'EMAIL';

-- DropForeignKey
ALTER TABLE "campaigns" DROP CONSTRAINT "campaigns_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "contacts" DROP CONSTRAINT "contacts_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "integrations" DROP CONSTRAINT "integrations_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "leads" DROP CONSTRAINT "leads_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_tenant_id_fkey";

-- DropIndex
DROP INDEX "campaigns_tenant_id_idx";

-- DropIndex
DROP INDEX "contacts_tenant_id_idx";

-- DropIndex
DROP INDEX "integrations_tenant_id_idx";

-- DropIndex
DROP INDEX "leads_tenant_id_idx";

-- DropIndex
DROP INDEX "password_reset_tokens_token_hash_idx";

-- DropIndex
DROP INDEX "refresh_tokens_expires_at_idx";

-- DropIndex
DROP INDEX "refresh_tokens_token_hash_idx";

-- DropIndex
DROP INDEX "refresh_tokens_user_id_idx";

-- DropIndex
DROP INDEX "tenant_api_keys_key_hash_key";

-- DropIndex
DROP INDEX "users_tenant_id_idx";

-- AlterTable
ALTER TABLE "business_settings" ADD COLUMN     "faviconUrl" TEXT,
ADD COLUMN     "labels" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "primaryColor" TEXT NOT NULL DEFAULT '#0B5';

-- AlterTable (rename, not drop+add: preserves existing data, e.g. the seeded default-tenant row)
ALTER TABLE "contacts" RENAME COLUMN "deleted_at" TO "deletedAt";

-- AlterTable
ALTER TABLE "custom_field_values" ADD COLUMN     "ticketId" TEXT;

-- AlterTable
ALTER TABLE "feature_flags" RENAME COLUMN "created_at" TO "createdAt";
ALTER TABLE "feature_flags" RENAME COLUMN "updated_at" TO "updatedAt";

-- AlterTable
ALTER TABLE "leads" RENAME COLUMN "deleted_at" TO "deletedAt";

-- AlterTable
ALTER TABLE "password_reset_tokens" RENAME COLUMN "created_at" TO "createdAt";
ALTER TABLE "password_reset_tokens" RENAME COLUMN "expires_at" TO "expiresAt";
ALTER TABLE "password_reset_tokens" RENAME COLUMN "token_hash" TO "tokenHash";
ALTER TABLE "password_reset_tokens" RENAME COLUMN "used_at" TO "usedAt";

-- AlterTable
ALTER TABLE "refresh_tokens" RENAME COLUMN "created_at" TO "createdAt";
ALTER TABLE "refresh_tokens" RENAME COLUMN "expires_at" TO "expiresAt";
ALTER TABLE "refresh_tokens" RENAME COLUMN "revoked_at" TO "revokedAt";
ALTER TABLE "refresh_tokens" RENAME COLUMN "token_hash" TO "tokenHash";
ALTER TABLE "refresh_tokens" RENAME COLUMN "user_id" TO "userId";

-- AlterTable
ALTER TABLE "tenant_api_keys" RENAME COLUMN "created_at" TO "createdAt";
ALTER TABLE "tenant_api_keys" RENAME COLUMN "key_hash" TO "keyHash";
ALTER TABLE "tenant_api_keys" RENAME COLUMN "last_used_at" TO "lastUsedAt";
ALTER TABLE "tenant_api_keys" RENAME COLUMN "revoked_at" TO "revokedAt";

-- AlterTable
ALTER TABLE "tenants" RENAME COLUMN "created_at" TO "createdAt";
ALTER TABLE "tenants" RENAME COLUMN "updated_at" TO "updatedAt";

-- AlterTable
ALTER TABLE "users" RENAME COLUMN "email_verified_at" TO "emailVerifiedAt";
ALTER TABLE "users" RENAME COLUMN "failed_login_attempts" TO "failedLoginAttempts";
ALTER TABLE "users" RENAME COLUMN "lockout_until" TO "lockoutUntil";
ALTER TABLE "users" RENAME COLUMN "mfa_enabled" TO "mfaEnabled";
ALTER TABLE "users" RENAME COLUMN "mfa_secret" TO "mfaSecret";

-- CreateTable
CREATE TABLE "saved_reports" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "ownerId" TEXT NOT NULL,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "call_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "leadId" TEXT,
    "contactId" TEXT,
    "agentId" TEXT,
    "direction" "CallDirection" NOT NULL,
    "status" "CallStatus" NOT NULL DEFAULT 'INITIATED',
    "fromNumber" TEXT NOT NULL,
    "toNumber" TEXT NOT NULL,
    "durationSec" INTEGER,
    "recordingUrl" TEXT,
    "providerSid" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "call_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "saved_reports_tenant_id_idx" ON "saved_reports"("tenant_id");

-- CreateIndex
CREATE INDEX "saved_reports_ownerId_idx" ON "saved_reports"("ownerId");

-- CreateIndex
CREATE INDEX "call_logs_tenant_id_idx" ON "call_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "call_logs_leadId_idx" ON "call_logs"("leadId");

-- CreateIndex
CREATE INDEX "custom_field_values_ticketId_idx" ON "custom_field_values"("ticketId");

-- CreateIndex
CREATE UNIQUE INDEX "custom_field_values_definitionId_contactId_key" ON "custom_field_values"("definitionId", "contactId");

-- CreateIndex
CREATE UNIQUE INDEX "custom_field_values_definitionId_leadId_key" ON "custom_field_values"("definitionId", "leadId");

-- CreateIndex
CREATE UNIQUE INDEX "custom_field_values_definitionId_ticketId_key" ON "custom_field_values"("definitionId", "ticketId");

-- CreateIndex
CREATE INDEX "password_reset_tokens_tokenHash_idx" ON "password_reset_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_tokenHash_idx" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "refresh_tokens_expiresAt_idx" ON "refresh_tokens"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_api_keys_keyHash_key" ON "tenant_api_keys"("keyHash");

-- AddForeignKey
ALTER TABLE "saved_reports" ADD CONSTRAINT "saved_reports_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_reports" ADD CONSTRAINT "saved_reports_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_logs" ADD CONSTRAINT "call_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_logs" ADD CONSTRAINT "call_logs_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_logs" ADD CONSTRAINT "call_logs_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_logs" ADD CONSTRAINT "call_logs_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;


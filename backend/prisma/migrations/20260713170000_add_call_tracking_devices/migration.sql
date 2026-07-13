-- CreateEnum
CREATE TYPE "CallSource" AS ENUM ('TWILIO', 'SIM', 'WHATSAPP');

-- CreateTable
CREATE TABLE "devices" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT,
    "platform" TEXT NOT NULL DEFAULT 'android',
    "model" TEXT,
    "apiKeyHash" TEXT,
    "pairingCode" TEXT,
    "pairingCodeExpiresAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "devices_apiKeyHash_key" ON "devices"("apiKeyHash");

-- CreateIndex
CREATE UNIQUE INDEX "devices_pairingCode_key" ON "devices"("pairingCode");

-- CreateIndex
CREATE INDEX "devices_tenant_id_idx" ON "devices"("tenant_id");

-- CreateIndex
CREATE INDEX "devices_userId_idx" ON "devices"("userId");

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "call_logs" ADD COLUMN "source" "CallSource" NOT NULL DEFAULT 'TWILIO',
ADD COLUMN "deviceId" TEXT,
ADD COLUMN "recordedLocally" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "syncedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "call_logs_deviceId_idx" ON "call_logs"("deviceId");

-- AddForeignKey
ALTER TABLE "call_logs" ADD CONSTRAINT "call_logs_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "buyer_portal_tokens" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "contactId" TEXT,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "buyer_portal_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "buyer_portal_tokens_tokenHash_key" ON "buyer_portal_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "buyer_portal_tokens_tenant_id_bookingId_idx" ON "buyer_portal_tokens"("tenant_id", "bookingId");

-- AddForeignKey
ALTER TABLE "buyer_portal_tokens" ADD CONSTRAINT "buyer_portal_tokens_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buyer_portal_tokens" ADD CONSTRAINT "buyer_portal_tokens_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buyer_portal_tokens" ADD CONSTRAINT "buyer_portal_tokens_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;


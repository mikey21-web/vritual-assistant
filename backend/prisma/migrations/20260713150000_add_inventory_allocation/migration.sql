-- CreateTable
CREATE TABLE "inventory_allocations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "qtyAllocated" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inventory_allocations_tenant_id_idx" ON "inventory_allocations"("tenant_id");

-- CreateIndex
CREATE INDEX "inventory_allocations_eventId_idx" ON "inventory_allocations"("eventId");

-- CreateIndex
CREATE INDEX "inventory_allocations_itemId_idx" ON "inventory_allocations"("itemId");

-- AddForeignKey
ALTER TABLE "inventory_allocations" ADD CONSTRAINT "inventory_allocations_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events_ops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_allocations" ADD CONSTRAINT "inventory_allocations_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


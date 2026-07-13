-- CreateEnum
CREATE TYPE "VendorBookingStatus" AS ENUM ('DRAFT', 'SENT', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'PARTIAL', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('RECEIVED', 'SHIPPED', 'TRANSFER', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "LeaveRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PayrollEntryType" AS ENUM ('SALARY', 'ADVANCE');

-- CreateEnum
CREATE TYPE "PermissionModule" AS ENUM ('DASHBOARD', 'EVENTS', 'CRM', 'VENDORS', 'TEAM', 'TIMESHEET', 'ACCOUNTING', 'INVENTORY', 'PROCUREMENT');

-- CreateEnum
CREATE TYPE "PermissionLevel" AS ENUM ('NO_ACCESS', 'VIEW_ONLY', 'EDIT', 'FULL_ACCESS');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "annualLeaveQuota" INTEGER,
ADD COLUMN     "department" TEXT,
ADD COLUMN     "joinedDate" TIMESTAMP(3),
ADD COLUMN     "monthlySalary" DOUBLE PRECISION,
ADD COLUMN     "salaryType" TEXT,
ADD COLUMN     "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "teamStatus" TEXT;

-- CreateTable
CREATE TABLE "vendor_bookings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3),
    "vendorArrivalTime" TIMESTAMP(3),
    "venue" TEXT,
    "deliverables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "specialRequirements" TEXT,
    "agreedFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "advanceAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balanceDueDate" TIMESTAMP(3),
    "cancellationTerms" TEXT,
    "status" "VendorBookingStatus" NOT NULL DEFAULT 'DRAFT',
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "eventId" TEXT,
    "expectedDelivery" TIMESTAMP(3),
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "totalValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "po_line_items" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unitCost" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "po_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_locations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'Warehouse',
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "parentLocationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "sku" TEXT,
    "size" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT,
    "locationId" TEXT,
    "barcode" TEXT,
    "supplierInfo" TEXT,
    "purchaseHistory" TEXT,
    "deploymentCondition" TEXT,
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL,
    "fromLocationId" TEXT,
    "toLocationId" TEXT,
    "refNotes" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_requests" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "LeaveRequestStatus" NOT NULL DEFAULT 'PENDING',
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_records" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" "PayrollEntryType" NOT NULL DEFAULT 'SALARY',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "salary_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timesheet_entries" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "role" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "hours" DOUBLE PRECISION NOT NULL,
    "overtime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "timesheet_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "module_permissions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "module" "PermissionModule" NOT NULL,
    "level" "PermissionLevel" NOT NULL DEFAULT 'NO_ACCESS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "module_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public_profiles" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "companyName" TEXT,
    "slug" TEXT,
    "tagline" TEXT,
    "city" TEXT,
    "address" TEXT,
    "yearsExperience" INTEGER,
    "eventsExecuted" INTEGER,
    "about" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "website" TEXT,
    "instagramUrl" TEXT,
    "youtubeUrl" TEXT,
    "facebookUrl" TEXT,
    "googleMapsUrl" TEXT,
    "servicesOffered" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "coverImageUrl" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "public_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vendor_bookings_tenant_id_idx" ON "vendor_bookings"("tenant_id");

-- CreateIndex
CREATE INDEX "vendor_bookings_partnerId_idx" ON "vendor_bookings"("partnerId");

-- CreateIndex
CREATE INDEX "vendor_bookings_eventId_idx" ON "vendor_bookings"("eventId");

-- CreateIndex
CREATE INDEX "vendor_bookings_status_idx" ON "vendor_bookings"("status");

-- CreateIndex
CREATE INDEX "purchase_orders_tenant_id_idx" ON "purchase_orders"("tenant_id");

-- CreateIndex
CREATE INDEX "purchase_orders_partnerId_idx" ON "purchase_orders"("partnerId");

-- CreateIndex
CREATE INDEX "purchase_orders_eventId_idx" ON "purchase_orders"("eventId");

-- CreateIndex
CREATE INDEX "purchase_orders_status_idx" ON "purchase_orders"("status");

-- CreateIndex
CREATE INDEX "po_line_items_purchaseOrderId_idx" ON "po_line_items"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "inventory_locations_tenant_id_idx" ON "inventory_locations"("tenant_id");

-- CreateIndex
CREATE INDEX "inventory_items_tenant_id_idx" ON "inventory_items"("tenant_id");

-- CreateIndex
CREATE INDEX "inventory_items_locationId_idx" ON "inventory_items"("locationId");

-- CreateIndex
CREATE INDEX "stock_movements_tenant_id_idx" ON "stock_movements"("tenant_id");

-- CreateIndex
CREATE INDEX "stock_movements_itemId_idx" ON "stock_movements"("itemId");

-- CreateIndex
CREATE INDEX "leave_requests_tenant_id_idx" ON "leave_requests"("tenant_id");

-- CreateIndex
CREATE INDEX "leave_requests_userId_idx" ON "leave_requests"("userId");

-- CreateIndex
CREATE INDEX "salary_records_tenant_id_idx" ON "salary_records"("tenant_id");

-- CreateIndex
CREATE INDEX "salary_records_userId_idx" ON "salary_records"("userId");

-- CreateIndex
CREATE INDEX "timesheet_entries_tenant_id_idx" ON "timesheet_entries"("tenant_id");

-- CreateIndex
CREATE INDEX "timesheet_entries_userId_idx" ON "timesheet_entries"("userId");

-- CreateIndex
CREATE INDEX "timesheet_entries_eventId_idx" ON "timesheet_entries"("eventId");

-- CreateIndex
CREATE INDEX "module_permissions_tenant_id_idx" ON "module_permissions"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "module_permissions_userId_module_key" ON "module_permissions"("userId", "module");

-- CreateIndex
CREATE UNIQUE INDEX "public_profiles_tenant_id_key" ON "public_profiles"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "public_profiles_slug_key" ON "public_profiles"("slug");

-- AddForeignKey
ALTER TABLE "vendor_bookings" ADD CONSTRAINT "vendor_bookings_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_bookings" ADD CONSTRAINT "vendor_bookings_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events_ops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "po_line_items" ADD CONSTRAINT "po_line_items_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_locations" ADD CONSTRAINT "inventory_locations_parentLocationId_fkey" FOREIGN KEY ("parentLocationId") REFERENCES "inventory_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "inventory_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_fromLocationId_fkey" FOREIGN KEY ("fromLocationId") REFERENCES "inventory_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_toLocationId_fkey" FOREIGN KEY ("toLocationId") REFERENCES "inventory_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_records" ADD CONSTRAINT "salary_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timesheet_entries" ADD CONSTRAINT "timesheet_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timesheet_entries" ADD CONSTRAINT "timesheet_entries_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events_ops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_permissions" ADD CONSTRAINT "module_permissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


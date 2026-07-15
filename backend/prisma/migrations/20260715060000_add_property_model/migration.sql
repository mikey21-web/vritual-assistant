-- CreateEnum
CREATE TYPE "property_type" AS ENUM ('APARTMENT', 'VILLA', 'PLOT', 'COMMERCIAL', 'PENTHOUSE', 'DUPLEX', 'STUDIO');

-- CreateEnum
CREATE TYPE "property_status" AS ENUM ('AVAILABLE', 'SOLD', 'UNDER_OFFER', 'ON_HOLD', 'RENTED', 'DRAFT');

-- CreateTable
CREATE TABLE "properties" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "title" TEXT NOT NULL,
    "description" TEXT,
    "propertyType" "property_type" NOT NULL DEFAULT 'APARTMENT',
    "status" "property_status" NOT NULL DEFAULT 'AVAILABLE',
    "price" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "areaSqft" DOUBLE PRECISION,
    "areaUnit" TEXT NOT NULL DEFAULT 'sqft',
    "location" TEXT,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "amenities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reraId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "availableFrom" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_images" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_images_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN "property_id" TEXT;

-- CreateIndex
CREATE INDEX "properties_tenant_id_idx" ON "properties"("tenant_id");

-- CreateIndex
CREATE INDEX "properties_propertyType_idx" ON "properties"("propertyType");

-- CreateIndex
CREATE INDEX "properties_status_idx" ON "properties"("status");

-- CreateIndex
CREATE INDEX "properties_price_idx" ON "properties"("price");

-- CreateIndex
CREATE INDEX "properties_location_idx" ON "properties"("location");

-- CreateIndex
CREATE INDEX "properties_bedrooms_idx" ON "properties"("bedrooms");

-- CreateIndex
CREATE INDEX "property_images_property_id_idx" ON "property_images"("property_id");

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_images" ADD CONSTRAINT "property_images_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('PLANNING', 'UPCOMING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EventFileVisibility" AS ENUM ('INTERNAL', 'SHARED');

-- CreateEnum
CREATE TYPE "MoodboardIdeaStatus" AS ENUM ('OPEN', 'CONSIDERING', 'FINALIZED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "eventId" TEXT;

-- CreateTable
CREATE TABLE "events_ops" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'PLANNING',
    "eventDate" TIMESTAMP(3),
    "venue" TEXT,
    "expectedGuests" INTEGER,
    "budget" DOUBLE PRECISION,
    "description" TEXT,
    "contactId" TEXT,
    "leadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_ops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_functions" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_functions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_moodboard_ideas" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "functionId" TEXT,
    "title" TEXT NOT NULL,
    "imageUrl" TEXT,
    "status" "MoodboardIdeaStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_moodboard_ideas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_team_assignments" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_team_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_vendor_assignments" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "roleOnEvent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_vendor_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_files" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "visibility" "EventFileVisibility" NOT NULL DEFAULT 'INTERNAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_expenses" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "gstPercent" DOUBLE PRECISION,
    "billableToClient" BOOLEAN NOT NULL DEFAULT false,
    "receiptUrl" TEXT,
    "expenseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_milestones" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "dueDate" TIMESTAMP(3),
    "invoiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "run_sheet_items" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "time" TIMESTAMP(3),
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "run_sheet_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partners" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'VENDOR',
    "company" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "gstin" TEXT,
    "location" TEXT,
    "address" TEXT,
    "category" TEXT,
    "specialty" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "events_ops_tenant_id_idx" ON "events_ops"("tenant_id");

-- CreateIndex
CREATE INDEX "events_ops_contactId_idx" ON "events_ops"("contactId");

-- CreateIndex
CREATE INDEX "events_ops_leadId_idx" ON "events_ops"("leadId");

-- CreateIndex
CREATE INDEX "events_ops_status_idx" ON "events_ops"("status");

-- CreateIndex
CREATE INDEX "events_ops_eventDate_idx" ON "events_ops"("eventDate");

-- CreateIndex
CREATE INDEX "event_functions_eventId_idx" ON "event_functions"("eventId");

-- CreateIndex
CREATE INDEX "event_moodboard_ideas_eventId_idx" ON "event_moodboard_ideas"("eventId");

-- CreateIndex
CREATE INDEX "event_team_assignments_eventId_idx" ON "event_team_assignments"("eventId");

-- CreateIndex
CREATE INDEX "event_team_assignments_userId_idx" ON "event_team_assignments"("userId");

-- CreateIndex
CREATE INDEX "event_vendor_assignments_eventId_idx" ON "event_vendor_assignments"("eventId");

-- CreateIndex
CREATE INDEX "event_vendor_assignments_partnerId_idx" ON "event_vendor_assignments"("partnerId");

-- CreateIndex
CREATE INDEX "event_files_eventId_idx" ON "event_files"("eventId");

-- CreateIndex
CREATE INDEX "event_expenses_eventId_idx" ON "event_expenses"("eventId");

-- CreateIndex
CREATE INDEX "payment_milestones_eventId_idx" ON "payment_milestones"("eventId");

-- CreateIndex
CREATE INDEX "run_sheet_items_eventId_idx" ON "run_sheet_items"("eventId");

-- CreateIndex
CREATE INDEX "partners_tenant_id_idx" ON "partners"("tenant_id");

-- CreateIndex
CREATE INDEX "tasks_eventId_idx" ON "tasks"("eventId");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events_ops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events_ops" ADD CONSTRAINT "events_ops_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events_ops" ADD CONSTRAINT "events_ops_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events_ops" ADD CONSTRAINT "events_ops_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_functions" ADD CONSTRAINT "event_functions_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events_ops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_moodboard_ideas" ADD CONSTRAINT "event_moodboard_ideas_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events_ops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_team_assignments" ADD CONSTRAINT "event_team_assignments_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events_ops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_team_assignments" ADD CONSTRAINT "event_team_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_vendor_assignments" ADD CONSTRAINT "event_vendor_assignments_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events_ops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_vendor_assignments" ADD CONSTRAINT "event_vendor_assignments_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_files" ADD CONSTRAINT "event_files_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events_ops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_expenses" ADD CONSTRAINT "event_expenses_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events_ops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_milestones" ADD CONSTRAINT "payment_milestones_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events_ops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "run_sheet_items" ADD CONSTRAINT "run_sheet_items_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events_ops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


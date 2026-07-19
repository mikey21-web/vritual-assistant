-- AlterTable
ALTER TABLE "construction_milestone_updates" ADD COLUMN     "approvedForBuyersAt" TIMESTAMP(3),
ADD COLUMN     "approvedForBuyersById" TEXT,
ADD COLUMN     "customerVisibleMessage" TEXT;


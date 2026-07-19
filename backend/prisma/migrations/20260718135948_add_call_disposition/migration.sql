-- AlterTable
ALTER TABLE "call_logs" ADD COLUMN     "disposition" TEXT,
ADD COLUMN     "nextActionAt" TIMESTAMP(3);


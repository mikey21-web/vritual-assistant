ALTER TABLE "call_logs" ADD COLUMN "transcript" TEXT;
ALTER TABLE "call_logs" ADD COLUMN "summary" TEXT;
ALTER TABLE "call_logs" ADD COLUMN "summaryStatus" TEXT NOT NULL DEFAULT 'PENDING';

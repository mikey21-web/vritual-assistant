-- CreateTable
CREATE TABLE "federated_aggregates" (
    "id" TEXT NOT NULL,
    "niche" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "noise" DOUBLE PRECISION NOT NULL,
    "sampleSize" INTEGER NOT NULL,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    CONSTRAINT "federated_aggregates_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "federated_aggregates_niche_metric_idx" ON "federated_aggregates"("niche", "metric");
CREATE INDEX "federated_aggregates_reportedAt_idx" ON "federated_aggregates"("reportedAt");

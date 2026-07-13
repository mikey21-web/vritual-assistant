-- CreateTable
CREATE TABLE "call_sync_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "call_log_id" TEXT NOT NULL,
    "integration_id" TEXT,
    "webhook_id" TEXT,
    "crmType" TEXT,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "attemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "call_sync_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "call_sync_logs_tenant_id_idx" ON "call_sync_logs"("tenant_id");
CREATE INDEX "call_sync_logs_call_log_id_idx" ON "call_sync_logs"("call_log_id");
CREATE INDEX "call_sync_logs_status_idx" ON "call_sync_logs"("status");
ALTER TABLE "call_sync_logs" ADD CONSTRAINT "call_sync_logs_call_log_id_fkey" FOREIGN KEY ("call_log_id") REFERENCES "call_logs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "call_sync_logs" ADD CONSTRAINT "call_sync_logs_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "integrations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "call_sync_logs" ADD CONSTRAINT "call_sync_logs_webhook_id_fkey" FOREIGN KEY ("webhook_id") REFERENCES "outbound_webhooks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

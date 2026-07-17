-- Self-documenting tasks: track who/what created a task (agent vs a specific
-- user) and what triggered it (manual vs stage-based automation).
ALTER TABLE "tasks" ADD COLUMN "createdBy" TEXT NOT NULL DEFAULT 'agent';
ALTER TABLE "tasks" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'manual';

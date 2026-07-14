-- Add embedding column to mikey_memory
ALTER TABLE "mikey_memory" ADD COLUMN IF NOT EXISTS "embedding" DOUBLE PRECISION[];

-- Enable pgvector extension if available
CREATE EXTENSION IF NOT EXISTS vector;

-- Create opt-in table
CREATE TABLE "federated_opt_ins" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "optedIn" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "federated_opt_ins_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "federated_opt_ins_tenant_id_key" ON "federated_opt_ins"("tenant_id");

-- Create pgvector index on embedding column if pgvector extension loaded
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
        CREATE INDEX IF NOT EXISTS mikey_memory_embedding_idx ON mikey_memory USING ivfflat (embedding vector_cosine_ops);
    END IF;
END
$$;

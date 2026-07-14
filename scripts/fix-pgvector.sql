ALTER TABLE mikey_memory ADD COLUMN IF NOT EXISTS embedding double precision[];
CREATE TABLE IF NOT EXISTS federated_opt_ins (id text NOT NULL, tenant_id text NOT NULL, "optedIn" boolean NOT NULL DEFAULT false, "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" timestamp(3) NOT NULL, CONSTRAINT federated_opt_ins_pkey PRIMARY KEY (id));
CREATE UNIQUE INDEX IF NOT EXISTS federated_opt_ins_tenant_id_key ON federated_opt_ins(tenant_id);
\dt mikey_* federated_*

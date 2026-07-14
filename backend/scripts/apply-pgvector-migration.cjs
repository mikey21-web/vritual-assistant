const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function main() {
  const envPath = path.join(__dirname, '..', '.env');
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const dbUrlMatch = envContent.match(/DATABASE_URL=(.+)/);
  const dbUrl = dbUrlMatch ? dbUrlMatch[1].trim() : 'postgresql://postgres:postgres123@localhost:5433/lead_automation';

  console.log('Applying pgvector migration...');

  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  console.log('Connected to database.');

  try {
    await client.query('ALTER TABLE "mikey_memory" ADD COLUMN IF NOT EXISTS "embedding" double precision[]');
    console.log('OK: added embedding column');

    await client.query(`CREATE TABLE IF NOT EXISTS "federated_opt_ins" (
      "id" text NOT NULL,
      "tenant_id" text NOT NULL,
      "optedIn" boolean NOT NULL DEFAULT false,
      "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" timestamp(3) NOT NULL,
      CONSTRAINT "federated_opt_ins_pkey" PRIMARY KEY ("id")
    )`);
    console.log('OK: created federated_opt_ins table');

    await client.query('CREATE UNIQUE INDEX IF NOT EXISTS "federated_opt_ins_tenant_id_key" ON "federated_opt_ins"("tenant_id")');
    console.log('OK: created unique index on tenant_id');

    console.log('pgvector migration applied successfully.');
  } catch (err) {
    console.error('SQL error:', err.message);
    throw err;
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});

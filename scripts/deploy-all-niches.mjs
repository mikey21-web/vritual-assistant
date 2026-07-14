import { Client } from 'ssh2';

const HOST = '160.250.204.162';
const PASS = process.env.DEPLOY_PASS;
if (!PASS) { console.error('Set DEPLOY_PASS env var'); process.exit(1); }

const conn = new Client();

function exec(cmd) {
  return new Promise((resolve) => {
    conn.exec(cmd, (err, stream) => {
      if (err) { console.error(err.message); resolve(''); return; }
      let out = '';
      stream.on('close', () => resolve(out.trim()));
      stream.on('data', d => out += d.toString());
      stream.stderr.on('data', d => out += d.toString());
    });
  });
}

const PEAK_SQL = `
CREATE TABLE IF NOT EXISTS mikey_memory (id text NOT NULL, tenant_id text NOT NULL, type text NOT NULL, key text NOT NULL, value text NOT NULL, summary text, source text, "leadId" text, "episodeStart" timestamp(3), "episodeEnd" timestamp(3), "validAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "invalidAt" timestamp(3), confidence double precision NOT NULL DEFAULT 0.5, embedding double precision[], metadata jsonb NOT NULL DEFAULT '{}', "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" timestamp(3) NOT NULL, CONSTRAINT mikey_memory_pkey PRIMARY KEY (id));
CREATE INDEX IF NOT EXISTS mikey_memory_tid_type ON mikey_memory(tenant_id,type);
CREATE TABLE IF NOT EXISTS mikey_procedural_rules (id text NOT NULL, tenant_id text NOT NULL, rule text NOT NULL, rationale text, category text, "impactMetric" text, "impactDelta" double precision, status text NOT NULL DEFAULT 'pending', "approvedAt" timestamp(3), "approvedById" text, "firstAppliedAt" timestamp(3), "lastAppliedAt" timestamp(3), "retireAt" timestamp(3), "applyCount" integer NOT NULL DEFAULT 0, metadata jsonb NOT NULL DEFAULT '{}', "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" timestamp(3) NOT NULL, CONSTRAINT mikey_procedural_rules_pkey PRIMARY KEY (id));
CREATE INDEX IF NOT EXISTS mikey_rules_tid_status ON mikey_procedural_rules(tenant_id,status);
CREATE TABLE IF NOT EXISTS mikey_reflexion_logs (id text NOT NULL, tenant_id text NOT NULL, "outcomeType" text NOT NULL, "entityId" text, trajectory jsonb NOT NULL, reflection text NOT NULL, "candidateRule" text, perspectives jsonb, "approvedRuleId" text, "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT mikey_reflexion_logs_pkey PRIMARY KEY (id));
CREATE INDEX IF NOT EXISTS mikey_reflexion_tid_type ON mikey_reflexion_logs(tenant_id,"outcomeType");
CREATE TABLE IF NOT EXISTS federated_aggregates (id text NOT NULL, niche text NOT NULL, tenant_id text NOT NULL, metric text NOT NULL, value double precision NOT NULL, noise double precision NOT NULL, "sampleSize" integer NOT NULL, "reportedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "expiresAt" timestamp(3), CONSTRAINT federated_aggregates_pkey PRIMARY KEY (id));
CREATE INDEX IF NOT EXISTS fed_agg_niche_metric ON federated_aggregates(niche,metric);
CREATE TABLE IF NOT EXISTS federated_opt_ins (id text NOT NULL, tenant_id text NOT NULL, "optedIn" boolean NOT NULL DEFAULT false, "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" timestamp(3) NOT NULL, CONSTRAINT federated_opt_ins_pkey PRIMARY KEY (id));
CREATE UNIQUE INDEX IF NOT EXISTS fed_optin_tid ON federated_opt_ins(tenant_id);
`.replace(/\n/g, ' ').replace(/\t/g, ' ').replace(/"/g, '\\"');

const niches = ['agency', 'events', 'healthcare', 'hospitality', 'logistics', 'realestate'];

conn.on('ready', async () => {
  for (const niche of niches) {
    const pg = `demo-${niche}-postgres-1`;
    console.log(`\n=== ${niche} ===`);

    const running = await exec(`docker ps -q --filter "name=${pg}"`);
    if (!running) { console.log('  SKIP: container not running'); continue; }

    // Find the database
    const dbs = await exec(`docker exec ${pg} psql -U postgres -lqt 2>&1 | awk '{print $1}' | head -5`);
    console.log(`  Databases: ${dbs.replace(/\n/, ', ')}`);

    // Try each possible DB name
    for (const db of ['lead_automation', 'postgres', niche]) {
      const hasTables = await exec(`docker exec ${pg} psql -U postgres -d ${db} -c "SELECT tablename FROM pg_tables WHERE tablename='mikey_memory'" 2>&1`);
      if (hasTables.includes('(1 row)')) {
        console.log(`  ${db}: already has Peak Mikey`);
        break;
      }
      if (hasTables.includes('(0 rows)')) {
        console.log(`  ${db}: applying Peak Mikey migrations...`);
        const r = await exec(`docker exec ${pg} psql -U postgres -d ${db} -c "${PEAK_SQL}" 2>&1`);
        console.log(`  Result: ${r.slice(0, 200)}`);
        break;
      }
      if (hasTables.includes('does not exist')) continue;
      // Try creating the DB first if it doesn't exist
      if (hasTables.includes('FATAL')) {
        console.log(`  Cannot connect to ${db}, skipping`);
        continue;
      }
    }
  }

  console.log('\n=== Final verification ===');
  for (const niche of niches) {
    const pg = `demo-${niche}-postgres-1`;
    const r = await exec(`docker exec ${pg} psql -U postgres -d lead_automation -c "SELECT string_agg(tablename, ',') FROM pg_tables WHERE tablename LIKE 'mikey_%' OR tablename LIKE 'federated_%'" 2>&1`);
    console.log(`  ${niche}: ${r.includes('mikey') ? 'PEAK' : r.includes('does not exist') ? 'NO DB' : r.slice(0, 80)}`);
  }

  console.log('\n=== All niches deployed ===');
  conn.end();
}).on('error', e => console.error(e.message))
.connect({ host: HOST, port: 22, username: 'root', password: PASS, readyTimeout: 60000, keepaliveInterval: 10000 });

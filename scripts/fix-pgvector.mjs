import { Client } from 'ssh2';

const HOST = '160.250.204.162';
const PASS = process.env.DEPLOY_PASS;
if (!PASS) { console.error('Set DEPLOY_PASS env var'); process.exit(1); }

const conn = new Client();
const run = (c) => new Promise((resolve) => {
  conn.exec(c, (err, stream) => {
    if (err) { console.error(err.message); resolve(1); return; }
    let o = '';
    stream.on('close', (code) => { console.log(o.trim()); resolve(code); });
    stream.stderr.on('data', d => o += d.toString());
    stream.on('data', d => o += d.toString());
  });
});

conn.on('ready', async () => {
  const cmds = [
    `docker exec lead-automation-db psql -U postgres -d lead_automation -c "ALTER TABLE mikey_memory ADD COLUMN IF NOT EXISTS embedding double precision[]"`,
    `docker exec lead-automation-db psql -U postgres -d lead_automation -c "CREATE TABLE IF NOT EXISTS federated_opt_ins (id text NOT NULL, tenant_id text NOT NULL, optedIn boolean NOT NULL DEFAULT false, createdAt timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt timestamp(3) NOT NULL, CONSTRAINT federated_opt_ins_pkey PRIMARY KEY (id))"`,
    `docker exec lead-automation-db psql -U postgres -d lead_automation -c "CREATE UNIQUE INDEX IF NOT EXISTS federated_opt_ins_tenant_id_key ON federated_opt_ins(tenant_id)"`,
    `docker exec lead-automation-db psql -U postgres -d lead_automation -c "\\dt mikey_* federated_*" 2>&1`,
    `docker exec lead-automation-backend npx prisma migrate resolve --applied 20260714_peak_mikey_pgvector 2>&1`,
  ];
  for (const c of cmds) {
    const code = await run(c);
    if (code !== 0) { console.log('Continuing after non-zero exit...'); }
  }
  conn.end();
}).on('error', e => console.error(e.message))
.connect({ host: HOST, port: 22, username: 'root', password: PASS, readyTimeout: 60000, keepaliveInterval: 10000 });

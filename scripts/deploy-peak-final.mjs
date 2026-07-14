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
    'echo "=== Applying Peak Mikey migrations via prisma ==="',
    'docker exec lead-automation-backend npx prisma migrate deploy 2>&1',
    'echo "=== Checking tables ==="',
    `docker exec lead-automation-db psql -U postgres -d lead_automation -c "\\dt mikey_* federated_*" 2>&1`,
    'echo "=== Done ==="',
  ];
  for (const c of cmds) {
    const code = await run(c);
    if (code !== 0 && code !== undefined) { console.log('Non-zero exit, continuing...'); }
  }
  conn.end();
}).on('error', e => console.error(e.message))
.connect({ host: HOST, port: 22, username: 'root', password: PASS, readyTimeout: 60000, keepaliveInterval: 10000 });

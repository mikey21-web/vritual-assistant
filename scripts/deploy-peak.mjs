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
    'docker rm -f lead-automation-agent 2>/dev/null; echo done',
    'cd /opt/lead-automation-demo && docker compose -p virtual-assistant up -d agent-service 2>&1 | tail -5',
    'sleep 20',
    'docker ps --format "table {{.Names}}\t{{.Status}}"',
    'echo ===MIGRATIONS===',
    'docker exec lead-automation-backend node scripts/apply-mikey-migration.cjs 2>&1',
    'docker exec lead-automation-backend node scripts/apply-federated-migration.cjs 2>&1',
    'docker exec lead-automation-backend node scripts/apply-pgvector-migration.cjs 2>&1',
    'docker restart lead-automation-backend',
    'echo ===DONE===',
  ];
  for (const c of cmds) {
    const code = await run(c);
    if (code !== 0 && code !== undefined) { console.error('FAILED on:', c.slice(0,80)); break; }
  }
  conn.end();
}).on('error', e => console.error(e.message))
.connect({ host: HOST, port: 22, username: 'root', password: PASS, readyTimeout: 60000, keepaliveInterval: 10000 });

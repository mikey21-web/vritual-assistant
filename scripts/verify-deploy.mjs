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
    `docker exec lead-automation-db psql -U postgres -d lead_automation -c "SELECT tablename FROM pg_tables WHERE tablename LIKE 'mikey_%' OR tablename LIKE 'federated_%' ORDER BY tablename" 2>&1`,
    `echo ""`,
    `echo "=== Services ==="`,
    `docker ps --format "{{.Names}}" --filter "name=lead-automation" 2>&1`,
    `echo ""`,
    `echo "=== Dashboard health ==="`,
    `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health 2>&1`,
    `echo ""`,
    `echo "=== Backend health ==="`,
    `curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health 2>&1`,
    `echo ""`,
    `echo "=== Deployed commit ==="`,
    `cd /opt/lead-automation-demo && git log --oneline -1 2>&1`,
  ];
  for (const c of cmds) {
    const code = await run(c);
    if (code !== 0) { console.log('Continuing...'); }
  }
  conn.end();
}).on('error', e => console.error(e.message))
.connect({ host: HOST, port: 22, username: 'root', password: PASS, readyTimeout: 30000, keepaliveInterval: 10000 });

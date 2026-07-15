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
    'echo "=== Step 1: Rebuild agent-service ==="',
    'cd /opt/lead-automation-demo && docker compose -p virtual-assistant build agent-service 2>&1 | tail -5',
    'echo "=== Step 2: Stop & restart agent-service ==="',
    'docker rm -f lead-automation-agent 2>/dev/null; echo done',
    'cd /opt/lead-automation-demo && docker compose -p virtual-assistant up -d agent-service 2>&1 | tail -5',
    'sleep 15',
    'echo "=== Step 3: Restart backend (pick up scheduler changes) ==="',
    'docker restart lead-automation-backend',
    'sleep 5',
    'echo "=== Step 4: Check container status ==="',
    'docker ps --format "table {{.Names}}\t{{.Status}}"',
    'echo "=== Step 5: Check agent health ==="',
    'docker exec lead-automation-agent curl -s http://localhost:8000/health 2>&1',
    'echo "=== Step 6: Check backend health ==="',
    'docker exec lead-automation-backend curl -s http://localhost:3001/health 2>&1',
    'echo "=== Step 7: Verify Mikey memory tables ==="',
    `docker exec lead-automation-db psql -U postgres -d lead_automation -c "SELECT count(*) FROM mikey_memory;" 2>&1`,
    `docker exec lead-automation-db psql -U postgres -d lead_automation -c "SELECT count(*) FROM mikey_procedural_rules;" 2>&1`,
    `docker exec lead-automation-db psql -U postgres -d lead_automation -c "SELECT count(*) FROM federated_aggregates;" 2>&1`,
    'echo "=== Step 8: Check agent service logs (last 20 lines) ==="',
    'docker logs lead-automation-agent --tail 20 2>&1',
    'echo "=== DONE ==="',
  ];
  for (const c of cmds) {
    const code = await run(c);
    if (code !== 0 && code !== undefined) { console.error('FAILED on:', c.slice(0, 80)); }
  }
  conn.end();
}).on('error', e => console.error(e.message))
.connect({ host: HOST, port: 22, username: 'root', password: PASS, readyTimeout: 60000, keepaliveInterval: 10000 });

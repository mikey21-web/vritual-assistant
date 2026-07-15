import { Client } from 'ssh2';

const PASS = process.env.DEPLOY_PASS;
if (!PASS) { console.error('Set DEPLOY_PASS'); process.exit(1); }

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
    'cd /opt/lead-automation-demo && git pull origin master 2>&1 | tail -3',
    'cd /opt/lead-automation-demo && docker compose -p virtual-assistant build backend dashboard',
    'docker rm -f lead-automation-backend lead-automation-dashboard demo-logistics-backend-1 demo-healthcare-backend-1 demo-hospitality-backend-1 demo-realestate-backend-1 demo-agency-backend-1 demo-events-backend-1 2>/dev/null; echo "cleaned"',
    'cd /opt/lead-automation-demo && docker compose -p virtual-assistant up -d backend dashboard',
    'cd /opt/lead-automation-demo && docker compose -f docker-compose.demo.yml -p demo up -d 2>&1 | tail -5',
    'sleep 10 && echo "--- HEALTH ---"',
    'curl -sf http://localhost:3001/health && echo " MAIN_BACKEND_OK"',
    'for p in 4031 4021 4011 4041 4001; do curl -sf http://localhost:$p > /dev/null && echo " DASHBOARD_${p}_OK" || echo " DASHBOARD_${p}_FAIL"; done',
  ];
  for (const c of cmds) {
    const code = await run(c);
    if (code !== 0 && code !== undefined) console.log('exit=' + code);
  }
  conn.end();
}).on('error', e => console.error(e.message))
.connect({ host: '160.250.204.162', port: 22, username: 'root', password: PASS, readyTimeout: 300000 });

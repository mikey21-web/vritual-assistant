import { Client } from 'ssh2';

const PASS = process.env.DEPLOY_PASS;
if (!PASS) { process.exit(1); }

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
  await run('cd /opt/lead-automation-demo && git pull origin master 2>&1 | tail -2');
  await run('cd /opt/lead-automation-demo && docker compose -p virtual-assistant build backend');
  await run('docker rm -f lead-automation-backend demo-logistics-backend-1 demo-healthcare-backend-1 demo-hospitality-backend-1 demo-realestate-backend-1 demo-agency-backend-1 2>/dev/null; echo done');
  await run('cd /opt/lead-automation-demo && docker compose -p virtual-assistant up -d backend dashboard 2>&1 | tail -3');
  await run('cd /opt/lead-automation-demo && docker compose -f docker-compose.demo.yml -p demo up -d 2>&1 | tail -3');
  await run('sleep 8 && curl -sf http://localhost:3001/health && echo " OK" || echo " FAIL"');
  conn.end();
}).on('error', e => console.error(e.message))
.connect({ host: '160.250.204.162', port: 22, username: 'root', password: PASS, readyTimeout: 300000 });

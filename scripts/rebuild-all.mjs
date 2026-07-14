import { Client } from 'ssh2';

const HOST = '160.250.204.162';
const PASS = process.env.DEPLOY_PASS;
if (!PASS) { console.error('Set DEPLOY_PASS env var'); process.exit(1); }

const conn = new Client();
const run = (c) => new Promise((resolve) => {
  conn.exec(c, (err, stream) => {
    if (err) { resolve(''); return; }
    let o = '';
    stream.on('close', () => resolve(o.trim()));
    stream.on('data', d => o += d.toString());
    stream.stderr.on('data', d => o += d.toString());
  });
});

conn.on('ready', async () => {
  console.log('=== Rebuilding all containers ===');
  const r = await run('cd /opt/lead-automation-demo && docker compose up -d --build 2>&1 | tail -15');
  console.log(r.slice(0, 800));

  console.log('\n=== Health checks ===');
  const backs = [
    'lead-automation-backend',
    'demo-agency-backend-1',
    'demo-events-backend-1',
    'demo-healthcare-backend-1', 
    'demo-hospitality-backend-1',
    'demo-logistics-backend-1',
    'demo-realestate-backend-1',
  ];
  for (const name of backs) {
    const h = await run(`docker exec ${name} curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health 2>&1`);
    console.log(`  ${name}: HTTP ${h || 'down'}`);
  }

  console.log('\n=== Deployed commit ===');
  const c = await run('cd /opt/lead-automation-demo && git log --oneline -1');
  console.log(`  ${c}`);

  conn.end();
}).on('error', e => console.error(e.message))
.connect({ host: HOST, port: 22, username: 'root', password: PASS, readyTimeout: 300000, keepaliveInterval: 10000 });

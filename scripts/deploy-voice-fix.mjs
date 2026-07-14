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

const niches = ['agency', 'events', 'healthcare', 'hospitality', 'logistics', 'realestate'];

conn.on('ready', async () => {
  console.log('=== Pull latest code on production ===');
  let r = await run('cd /opt/lead-automation && git stash && git pull origin master 2>&1');
  console.log(r.slice(0, 300));

  r = await run('cd /opt/lead-automation-demo && git stash && git pull origin master 2>&1');
  console.log(r.slice(0, 300));

  console.log('=== Rebuild main backend + dashboard ===');
  r = await run('cd /opt/lead-automation && docker compose up -d --build backend dashboard 2>&1 | tail -5');
  console.log(r.slice(0, 200));

  console.log('=== Rebuild niche backends + dashboards ===');
  for (const niche of niches) {
    r = await run(`cd /opt/lead-automation-demo && docker compose up -d --build demo-${niche}-backend-1 demo-${niche}-dashboard-1 2>&1 | tail -3`);
    console.log(`  ${niche}: ${r.slice(0, 100)}`);
  }

  console.log('=== Health checks ===');
  r = await run('curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health 2>&1');
  console.log(`  Main backend: HTTP ${r}`);

  for (const niche of niches) {
    const bk = `demo-${niche}-backend-1`;
    r = await run(`docker exec ${bk} curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health 2>&1`);
    console.log(`  ${niche}: HTTP ${r}`);
  }

  console.log('=== Deployed ===');
  r = await run('cd /opt/lead-automation && git log --oneline -1');
  console.log(`  Commit: ${r}`);

  conn.end();
}).on('error', e => console.error(e.message))
.connect({ host: HOST, port: 22, username: 'root', password: PASS, readyTimeout: 300000, keepaliveInterval: 10000 });

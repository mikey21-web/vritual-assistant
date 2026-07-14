import { Client } from 'ssh2';

const HOST = '160.250.204.162';
const PASS = process.env.DEPLOY_PASS;
if (!PASS) { process.exit(1); }

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
  console.log('=== Pull latest code ===');
  let r = await run('cd /opt/lead-automation-demo && git stash && git pull origin master 2>&1');
  console.log(r.slice(0, 300));

  console.log('\n=== Rebuild dashboard ===');
  r = await run('cd /opt/lead-automation-demo && docker build -t lead-automation-demo-dashboard -f dashboard-v2/Dockerfile dashboard-v2/ 2>&1 | tail -3');
  console.log(r.slice(0, 150));

  console.log('\n=== Replace dashboard container ===');
  await run('docker stop lead-automation-dashboard 2>/dev/null');
  await run('docker rm lead-automation-dashboard 2>/dev/null');
  r = await run('docker run -d --name lead-automation-dashboard --restart unless-stopped --network lead-automation-demo_default -p 3000:3000 lead-automation-demo-dashboard 2>&1');
  console.log(r.slice(0, 80));

  await new Promise(x => setTimeout(x, 5000));

  r = await run('curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>&1');
  console.log('Dashboard: HTTP ' + r);

  r = await run('curl -s https://deploysafe.in/ -o /dev/null -w "%{http_code}" 2>&1');
  console.log('deploysafe.in: HTTP ' + r);

  // Also rebuild niche dashboards
  console.log('\n=== Rebuilding niche dashboards ===');
  for (const niche of ['agency', 'events', 'healthcare', 'hospitality', 'logistics', 'realestate']) {
    const dash = `demo-${niche}-dashboard-1`;
    await run(`docker stop ${dash} 2>/dev/null && docker rm ${dash} 2>/dev/null`);
    r = await run(`docker run -d --name ${dash} --restart unless-stopped --network lead-automation-demo_default -p 0 lead-automation-demo-dashboard 2>&1`);
    console.log(`  ${niche}: ${r.slice(0, 40) || 'ok'}`);
  }

  console.log('\n=== Deployed commit ===');
  r = await run('cd /opt/lead-automation-demo && git log --oneline -1');
  console.log('  ' + r);

  conn.end();
}).on('error', e => console.error(e.message))
.connect({ host: HOST, port: 22, username: 'root', password: PASS, readyTimeout: 120000, keepaliveInterval: 10000 });

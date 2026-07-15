import { Client } from 'ssh2';
const HOST = '160.250.204.162';
const PASS = process.env.DEPLOY_PASS;
if (!PASS) process.exit(1);
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
  console.log('1. Git force sync...');
  let r = await run('cd /opt/lead-automation-demo && git fetch origin master && git reset --hard origin/master 2>&1');
  console.log(r.slice(0, 200));

  console.log('2. Verify index.css source...');
  r = await run('cd /opt/lead-automation-demo && grep "sidebar-bg" dashboard-v2/src/index.css | head -3 2>&1');
  console.log(r);

  console.log('3. Clean build (remove cache)...');
  r = await run('cd /opt/lead-automation-demo && docker builder prune -f 2>&1 && docker build --no-cache --pull -t lead-automation-demo-dashboard -f dashboard-v2/Dockerfile dashboard-v2/ 2>&1 | tail -5');
  console.log(r);

  console.log('4. Deploy all dashboards...');
  const niches = { realestate: 4001, hospitality: 4011, healthcare: 4021, agency: 4031, logistics: 4041 };
  for (const [nm, p] of Object.entries(niches)) {
    await run(`docker rm -f demo-${nm}-dashboard-1 2>/dev/null`);
    await run(`docker run -d --name demo-${nm}-dashboard-1 --restart unless-stopped --network lead-automation-demo_default -p ${p}:3000 lead-automation-demo-dashboard 2>&1`);
    console.log(`  ${nm} on ${p}`);
  }
  await new Promise(x => setTimeout(x, 12000));
  for (const nm of Object.keys(niches)) {
    const h = await run(`curl -s -o /dev/null -w "%{http_code}" https://${nm}.deploysafe.in/ 2>&1`);
    console.log(`  ${nm}: HTTP ${h}`);
  }
  await run('docker rm -f lead-automation-dashboard 2>/dev/null');
  await run('docker run -d --name lead-automation-dashboard --restart unless-stopped --network lead-automation-demo_default -p 3000:3000 lead-automation-demo-dashboard 2>&1');
  const main = await run('curl -s -o /dev/null -w "%{http_code}" https://deploysafe.in/ 2>&1');
  console.log(`  main: HTTP ${main}`);

  console.log('5. Verify built CSS...');
  const css = await run('docker exec demo-realestate-dashboard-1 sh -c "ls /usr/share/nginx/html/assets/index-*.css 2>&1"');
  for (const f of css.split('\n').filter(Boolean)) {
    const bg = await run(`docker exec demo-realestate-dashboard-1 sh -c "grep 'sidebar-bg' ${f} | head -3" 2>&1`);
    const dark = await run(`docker exec demo-realestate-dashboard-1 sh -c "grep '#161616' ${f} | head -2" 2>&1`);
    console.log('CSS sidebar-bg:', bg.slice(0, 300));
    console.log('CSS #161616 (should be in .dark only):', dark.slice(0, 200));
  }

  conn.end();
}).on('error', e => console.error(e.message))
.connect({ host: HOST, port: 22, username: 'root', password: PASS, readyTimeout: 300000, keepaliveInterval: 10000 });

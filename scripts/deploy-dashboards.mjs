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
  console.log('Git pull...');
  const pull = await run('cd /opt/lead-automation-demo && git pull origin master 2>&1');
  console.log(pull.slice(0, 300));

  console.log('Build...');
  const b = await run('cd /opt/lead-automation-demo && docker build --no-cache -t lead-automation-demo-dashboard -f dashboard-v2/Dockerfile dashboard-v2/ 2>&1 | tail -3');
  console.log(b);

  const niches = { realestate: 4001, hospitality: 4011, healthcare: 4021, agency: 4031, logistics: 4041 };
  for (const [nm, p] of Object.entries(niches)) {
    await run(`docker rm -f demo-${nm}-dashboard-1 2>/dev/null`);
    const o = await run(`docker run -d --name demo-${nm}-dashboard-1 --restart unless-stopped --network lead-automation-demo_default -p ${p}:3000 lead-automation-demo-dashboard 2>&1`);
    console.log(`${nm}: ${o.slice(0, 20)}`);
  }

  console.log('Wait...');
  await new Promise(x => setTimeout(x, 12000));

  for (const nm of Object.keys(niches)) {
    const h = await run(`curl -s -o /dev/null -w "%{http_code}" https://${nm}.deploysafe.in/ 2>&1`);
    console.log(`${nm}: HTTP ${h}`);
  }

  await run('docker rm -f lead-automation-dashboard 2>/dev/null');
  await run('docker run -d --name lead-automation-dashboard --restart unless-stopped --network lead-automation-demo_default -p 3000:3000 lead-automation-demo-dashboard 2>&1');
  const main = await run('curl -s -o /dev/null -w "%{http_code}" https://deploysafe.in/ 2>&1');
  console.log(`main: HTTP ${main}`);

  conn.end();
}).on('error', e => console.error(e.message))
.connect({ host: HOST, port: 22, username: 'root', password: PASS, readyTimeout: 300000, keepaliveInterval: 10000 });

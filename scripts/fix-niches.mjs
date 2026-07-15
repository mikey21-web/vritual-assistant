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
  // Map: niche -> { dash_port, api_port, db_name }
  const niches = {
    realestate: { dash: 4001, api: 4002 },
    hospitality: { dash: 4011, api: 4012 },
    healthcare: { dash: 4021, api: 4022 },
    agency: { dash: 4031, api: 4032 },
    logistics: { dash: 4041, api: 4042 },
  };

  for (const [name, ports] of Object.entries(niches)) {
    const dashName = `demo-${name}-dashboard-1`;
    const dashExists = await run(`docker ps -q --filter "name=${dashName}" 2>&1`);

    if (!dashExists) {
      console.log(`${name}: creating dashboard on port ${ports.dash}...`);
      await run(`docker run -d --name ${dashName} --restart unless-stopped --network lead-automation-demo_default -p ${ports.dash}:3000 lead-automation-demo-dashboard 2>&1`);
    } else {
      console.log(`${name}: dashboard already running`);
    }
  }

  await new Promise(x => setTimeout(x, 10000));

  console.log('\n=== Caddy reload ===');
  await run('caddy reload --config /etc/caddy/Caddyfile 2>&1');

  console.log('\n=== Health checks ===');
  const checks = ['realestate', 'hospitality', 'healthcare', 'agency', 'logistics'];
  for (const name of checks) {
    const h = await run(`curl -s -o /dev/null -w "%{http_code}" https://${name}.deploysafe.in/ 2>&1`);
    console.log(`  ${name}.deploysafe.in: HTTP ${h}`);
  }

  conn.end();
}).on('error', e => console.error(e.message))
.connect({ host: HOST, port: 22, username: 'root', password: PASS, readyTimeout: 120000, keepaliveInterval: 10000 });

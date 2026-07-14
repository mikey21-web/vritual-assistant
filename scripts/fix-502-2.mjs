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
  console.log('=== Find dashboard container ===');
  let r = await run('docker ps -a --filter "name=dashboard" --format "{{.Names}} {{.Status}}" 2>&1');
  console.log(r);

  console.log('\n=== Compose services ===');
  r = await run('cd /opt/lead-automation-demo && docker compose config --services 2>&1');
  console.log(r);

  console.log('\n=== Image exists? ===');
  r = await run('docker images lead-automation-demo-dashboard --format "{{.Repository}}" 2>&1');
  console.log('  Image: ' + (r || 'not found'));

  console.log('\n=== Try running dashboard container directly ===');
  r = await run('docker run -d --name lead-automation-dashboard --restart unless-stopped -p 3000:3000 --network lead-automation-demo_default lead-automation-demo-dashboard 2>&1');
  console.log(r);

  await new Promise(x => setTimeout(x, 3000));

  r = await run('curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>&1');
  console.log('  Dashboard: HTTP ' + r);

  r = await run('ss -tlnp | grep 3000 2>&1');
  console.log('  Port 3000: ' + (r || 'not listening'));

  if (r === 'not listening' || !r) {
    console.log('\n=== Check container logs ===');
    r = await run('docker logs lead-automation-dashboard --tail 20 2>&1');
    console.log(r);
  }

  console.log('\n=== Caddy reload ===');
  await run('caddy reload --config /etc/caddy/Caddyfile 2>&1');

  console.log('\n=== Done ===');
  conn.end();
}).on('error', e => console.error(e.message))
.connect({ host: HOST, port: 22, username: 'root', password: PASS, readyTimeout: 120000, keepaliveInterval: 10000 });

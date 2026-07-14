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
  console.log('=== Restarting dashboard ===');
  let r = await run('docker ps --filter "name=lead-automation-dashboard" --format "{{.Names}} {{.Status}}" 2>&1');
  console.log('  Before: ' + r);

  r = await run('docker restart lead-automation-dashboard 2>&1');
  console.log('  Restart: ' + r);

  await new Promise(r => setTimeout(r, 5000));

  r = await run('curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>&1');
  console.log('  Dashboard: HTTP ' + r);

  if (r !== '200') {
    console.log('\n=== Rebuilding dashboard ===');
    r = await run('cd /opt/lead-automation-demo && docker compose up -d --build dashboard 2>&1 | tail -10');
    console.log(r.slice(0, 400));

    await new Promise(r => setTimeout(r, 10000));

    r = await run('curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>&1');
    console.log('  Dashboard after rebuild: HTTP ' + r);
  }

  console.log('\n=== Ports ===');
  r = await run('ss -tlnp | grep -E "3000|3001" 2>&1');
  console.log(r);

  console.log('\n=== Caddy reload ===');
  r = await run('caddy reload --config /etc/caddy/Caddyfile 2>&1');
  console.log(r);

  console.log('\n=== Done ===');
  conn.end();
}).on('error', e => console.error(e.message))
.connect({ host: HOST, port: 22, username: 'root', password: PASS, readyTimeout: 120000, keepaliveInterval: 10000 });

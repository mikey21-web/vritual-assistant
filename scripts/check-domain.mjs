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
  console.log('=== Containers ===');
  let r = await run('docker ps --format "table {{.Names}}\t{{.Status}}" --filter "name=lead-automation" 2>&1');
  console.log(r);

  console.log('\n=== Caddy ===');
  r = await run('systemctl is-active caddy 2>&1');
  console.log('  Caddy: ' + r);

  r = await run('caddy validate --config /etc/caddy/Caddyfile 2>&1 | tail -3');
  console.log('  Config: ' + r);

  console.log('\n=== Ports ===');
  r = await run('ss -tlnp | grep -E "3000|3001|80|443" 2>&1');
  console.log(r);

  console.log('\n=== DNS ===');
  r = await run('host deploysafe.in 2>&1 || nslookup deploysafe.in 2>&1');
  console.log(r);

  console.log('\n=== Local curl ===');
  r = await run('curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>&1');
  console.log('  Dashboard: HTTP ' + r);
  r = await run('curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health 2>&1');
  console.log('  Backend: HTTP ' + r);

  conn.end();
}).on('error', e => console.error(e.message))
.connect({ host: HOST, port: 22, username: 'root', password: PASS, readyTimeout: 30000, keepaliveInterval: 10000 });

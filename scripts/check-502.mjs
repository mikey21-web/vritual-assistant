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
  console.log('=== Docker status ===');
  let r = await run('docker ps --format "table {{.Names}}\t{{.Status}}" --filter "name=lead-automation" 2>&1');
  console.log(r);

  console.log('\n=== Direct backend health ===');
  r = await run('curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health 2>&1');
  console.log('  Backend (localhost:3001): HTTP ' + r);

  console.log('\n=== Direct dashboard ===');
  r = await run('curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>&1');
  console.log('  Dashboard (localhost:3000): HTTP ' + r);

  console.log('\n=== Caddy status ===');
  r = await run('systemctl is-active caddy 2>&1');
  console.log('  Caddy: ' + r);

  console.log('\n=== Caddy error log ===');
  r = await run('journalctl -u caddy --no-pager -n 20 --no-hostname 2>&1 | grep -i "error\|502\|bad gateway\|dial tcp" | tail -10');
  console.log(r || '  (no errors found)');

  console.log('\n=== Caddy config test ===');
  r = await run('caddy validate --config /etc/caddy/Caddyfile 2>&1 | tail -3');
  console.log(r);

  console.log('\n=== Port status ===');
  r = await run('ss -tlnp | grep -E "3000|3001|80|443" 2>&1');
  console.log(r);

  conn.end();
}).on('error', e => console.error(e.message))
.connect({ host: HOST, port: 22, username: 'root', password: PASS, readyTimeout: 30000, keepaliveInterval: 10000 });

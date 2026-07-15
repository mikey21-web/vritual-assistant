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
  console.log('=== Realestate containers ===');
  let r = await run('docker ps --format "table {{.Names}}\t{{.Status}}" --filter "name=realestate" 2>&1');
  console.log(r);
  console.log('\n=== All demo containers ===');
  r = await run('docker ps --format "{{.Names}}" --filter "name=demo" | sort 2>&1');
  console.log(r);
  console.log('\n=== Caddy config additions ===');
  r = await run('cat /opt/lead-automation-demo/deploy-demo/Caddyfile.additions 2>&1');
  console.log(r || '(no additions file)');
  console.log('\n=== Check for realestate in Caddyfile ===');
  r = await run('grep -i realestate /etc/caddy/Caddyfile 2>&1');
  console.log(r || '(not in Caddyfile)');
  console.log('\n=== Ports in use ===');
  r = await run('ss -tlnp | grep -E "300[0-9]|80|443|8000" 2>&1');
  console.log(r);
  conn.end();
}).on('error', e => console.error(e.message))
.connect({ host: HOST, port: 22, username: 'root', password: PASS, readyTimeout: 30000, keepaliveInterval: 10000 });

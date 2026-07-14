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
  console.log('=== Main deploysafe.in ===');
  let r = await run('curl -s -o /dev/null -w "HTTP %{http_code}" https://deploysafe.in/ 2>&1');
  console.log('  ' + r);

  r = await run('curl -s -o /dev/null -w "HTTP %{http_code}" https://deploysafe.in/api/health 2>&1');
  console.log('  API: ' + r);

  console.log('\n=== All containers ===');
  r = await run('docker ps --format "table {{.Names}}\t{{.Status}}" 2>&1');
  console.log(r);

  console.log('\n=== Ports ===');
  r = await run('ss -tlnp | grep -E "3000|3001|80|443" 2>&1');
  console.log(r);

  console.log('\n=== Done ===');
  conn.end();
}).on('error', e => console.error(e.message))
.connect({ host: HOST, port: 22, username: 'root', password: PASS, readyTimeout: 30000, keepaliveInterval: 10000 });

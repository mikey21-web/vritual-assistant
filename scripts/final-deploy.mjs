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
  const h = await run('curl -s -o /dev/null -w "%{http_code}" https://deploysafe.in/ 2>&1');
  console.log('deploysafe.in: HTTP ' + h);
  const a = await run('curl -s -o /dev/null -w "%{http_code}" https://deploysafe.in/api/health 2>&1');
  console.log('deploysafe.in/api: HTTP ' + a);
  const s = await run('docker ps --filter name=lead-automation-dashboard --format "{{.Status}}" 2>&1');
  console.log('Dashboard: ' + s);
  const c = await run('cd /opt/lead-automation-demo && git log --oneline -1 2>&1');
  console.log('Commit: ' + c);
  conn.end();
}).on('error', e => console.error(e.message))
.connect({ host: HOST, port: 22, username: 'root', password: PASS, readyTimeout: 30000, keepaliveInterval: 10000 });

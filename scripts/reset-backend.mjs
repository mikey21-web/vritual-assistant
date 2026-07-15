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
  console.log('Kill...');
  await run('docker rm -f lead-automation-backend 2>/dev/null');
  console.log('Compose recreate...');
  let r = await run('cd /opt/lead-automation-demo && docker compose -p virtual-assistant up -d --no-deps --force-recreate backend 2>&1');
  console.log(r.slice(0, 200));
  console.log('Wait...');
  await new Promise(x => setTimeout(x, 20000));
  let h = await run('curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health 2>&1');
  console.log('Backend: HTTP ' + h);
  h = await run('curl -s -o /dev/null -w "%{http_code}" https://deploysafe.in/api/health 2>&1');
  console.log('API: HTTP ' + h);
  h = await run('curl -s -o /dev/null -w "%{http_code}" https://deploysafe.in/ 2>&1');
  console.log('Site: HTTP ' + h);
  conn.end();
}).on('error', e => console.error(e.message))
.connect({ host: HOST, port: 22, username: 'root', password: PASS, readyTimeout: 120000, keepaliveInterval: 10000 });

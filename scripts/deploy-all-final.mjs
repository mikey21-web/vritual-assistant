import { Client } from 'ssh2';
const HOST = '160.250.204.162';
const PASS = process.env.DEPLOY_PASS;
if (!PASS) process.exit(1);
const c = new Client();
const r = (s) => new Promise(r => { c.exec(s, (e, x) => { if (e) { r(''); return; } let o = ''; x.on('close', () => r(o.trim())); x.on('data', d => o += d.toString()); x.stderr.on('data', d => o += d.toString()); }); });
c.on('ready', async () => {
  console.log('Backend...');
  await r('cd /opt/lead-automation-demo && docker build --no-cache -t lead-automation-demo-backend -f backend/Dockerfile backend/ 2>&1 | tail -3');
  console.log('Replace...');
  await r('docker stop lead-automation-backend 2>/dev/null; docker rm lead-automation-backend 2>/dev/null');
  await r('docker run -d --name lead-automation-backend --restart unless-stopped --network lead-automation-demo_default --env-file /opt/lead-automation-demo/.env -p 3001:3001 lead-automation-demo-backend');
  await new Promise(x => setTimeout(x, 15000));
  let h = await r('curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health 2>&1');
  console.log('Backend: HTTP ' + h);
  h = await r('curl -s -o /dev/null -w "%{http_code}" https://deploysafe.in/api/health 2>&1');
  console.log('API: HTTP ' + h);
  h = await r('curl -s -o /dev/null -w "%{http_code}" https://deploysafe.in/ 2>&1');
  console.log('Site: HTTP ' + h);
  c.end();
}).on('error', e => console.error(e.message))
.connect({ host: HOST, port: 22, username: 'root', password: PASS, readyTimeout: 300000, keepaliveInterval: 10000 });

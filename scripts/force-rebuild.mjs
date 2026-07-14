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
  // Kill old dashboard container created manually (wrong nginx config)
  console.log('=== Cleaning up ===');
  await run('docker stop lead-automation-dashboard 2>/dev/null');
  await run('docker rm lead-automation-dashboard 2>/dev/null');

  // Force rebuild backend and dashboard by building images directly
  console.log('=== Building backend image ===');
  let r = await run('cd /opt/lead-automation-demo && docker build -t lead-automation-demo-backend -f backend/Dockerfile backend/ 2>&1 | tail -3');
  console.log(r.slice(0, 200));

  console.log('=== Building dashboard image ===');
  r = await run('cd /opt/lead-automation-demo && docker build -t lead-automation-demo-dashboard -f dashboard-v2/Dockerfile dashboard-v2/ 2>&1 | tail -3');
  console.log(r.slice(0, 200));

  // Stop and remove old backend, start new one
  console.log('=== Replacing backend container ===');
  await run('docker stop lead-automation-backend');
  await run('docker rm lead-automation-backend');
  r = await run('docker run -d --name lead-automation-backend --restart unless-stopped --network lead-automation-demo_default --env-file /opt/lead-automation-demo/.env -p 3001:3001 lead-automation-demo-backend 2>&1');
  console.log('  New backend: ' + r.slice(0, 80));

  // Start dashboard with proper nginx config
  console.log('=== Replacing dashboard container ===');
  r = await run('docker run -d --name lead-automation-dashboard --restart unless-stopped --network lead-automation-demo_default -p 3000:3000 lead-automation-demo-dashboard 2>&1');
  console.log('  New dashboard: ' + r.slice(0, 80));

  // Wait for startup
  console.log('=== Waiting for startup ===');
  await new Promise(x => setTimeout(x, 8000));

  // Verify
  console.log('=== Verification ===');
  r = await run('curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health 2>&1');
  console.log('  Backend: HTTP ' + r);

  r = await run('curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>&1');
  console.log('  Dashboard: HTTP ' + r);

  // Check compiled code
  r = await run('docker exec lead-automation-backend grep -c "qr-codes" /app/dist/copilot/copilot.service.js 2>&1');
  console.log('  qr-codes in backend: ' + r);

  r = await run('docker exec lead-automation-dashboard grep -c "qr-codes" /usr/share/nginx/html/assets/ 2>&1 | head -3');
  console.log('  qr-codes in dashboard: ' + (r || 'checking path...'));

  r = await run('docker exec lead-automation-dashboard find /usr/share/nginx/html -name "*.js" -exec grep -l "qr-codes" {} \\; 2>&1');
  console.log('  Dashboard files with qr-codes: ' + (r || 'none found'));

  // Final health
  r = await run('curl -s https://deploysafe.in/ -o /dev/null -w "%{http_code}" 2>&1');
  console.log('\n  deploysafe.in: HTTP ' + r);

  conn.end();
}).on('error', e => console.error(e.message))
.connect({ host: HOST, port: 22, username: 'root', password: PASS, readyTimeout: 300000, keepaliveInterval: 10000 });

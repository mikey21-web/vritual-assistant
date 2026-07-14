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
  // Check what code is actually running in the backend container
  console.log('=== Backend container: check navigate_ui tool definition ===');
  let r = await run('docker exec lead-automation-backend grep -c "qr-codes" /app/dist/copilot/copilot.service.js 2>&1');
  console.log('  qr-codes references in compiled JS: ' + r);

  r = await run('docker exec lead-automation-backend grep -o "page.*description.*string" /app/dist/copilot/copilot.service.js 2>&1 | head -3');
  console.log('  Page param type: ' + (r || 'not found'));

  r = await run('docker exec lead-automation-backend grep "navigate_ui" /app/dist/copilot/copilot.service.js 2>&1 | head -5');
  console.log('  navigate_ui: ' + (r || 'not found'));

  console.log('\n=== Dashboard: check PAGE_MAP ===');
  r = await run('docker exec lead-automation-dashboard grep -c "qr-codes" /usr/share/nginx/html/assets/*.js 2>&1 | grep -v ":0$"');
  console.log('  qr-codes in dashboard JS: ' + (r || 'NOT FOUND - old dashboard build!'));

  console.log('\n=== Git commit on server ===');
  r = await run('cd /opt/lead-automation-demo && git log --oneline -1');
  console.log('  ' + r);

  console.log('\n=== Backend image build time ===');
  r = await run('docker inspect lead-automation-backend --format "{{.Created}}" 2>&1');
  console.log('  Backend image: ' + r);

  r = await run('docker inspect lead-automation-dashboard --format "{{.Created}}" 2>&1');
  console.log('  Dashboard image: ' + (r || 'ran from run command - no image timestamp'));

  conn.end();
}).on('error', e => console.error(e.message))
.connect({ host: HOST, port: 22, username: 'root', password: PASS, readyTimeout: 30000, keepaliveInterval: 10000 });

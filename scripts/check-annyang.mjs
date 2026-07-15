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
  console.log('=== Check for annyang in built assets ===');
  let r = await run('ls -la /usr/share/nginx/html/assets/ | grep -i any 2>&1');
  console.log('  annyang files: ' + (r || 'NONE'));

  r = await run('docker exec lead-automation-dashboard sh -c "grep -l annyang /usr/share/nginx/html/assets/*.js 2>/dev/null" 2>&1');
  console.log('  Files containing annyang: ' + (r || 'NONE'));

  r = await run('docker exec lead-automation-dashboard sh -c "ls /usr/share/nginx/html/assets/*.js | wc -l" 2>&1');
  console.log('  Total JS files: ' + r);

  r = await run('docker exec lead-automation-dashboard sh -c "wc -c /usr/share/nginx/html/assets/index-*.js" 2>&1');
  console.log('  Main bundle: ' + r);

  // Check if dynamic imports are being created
  r = await run('docker exec lead-automation-dashboard sh -c "ls /usr/share/nginx/html/assets/ | grep -v index | grep -v vendor" 2>&1');
  console.log('  Non-entry chunks:\n' + r);

  r = await run('docker exec lead-automation-dashboard sh -c "cat /etc/nginx/conf.d/default.conf" 2>&1');
  console.log('  Nginx config:\n' + r);

  conn.end();
}).on('error', e => console.error(e.message))
.connect({ host: HOST, port: 22, username: 'root', password: PASS, readyTimeout: 30000, keepaliveInterval: 10000 });

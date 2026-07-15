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
  // Check if niche dashboard has the new JS
  console.log('=== Nginx config in dashboard container ===');
  const cfg = await run('docker exec demo-realestate-dashboard-1 cat /etc/nginx/conf.d/default.conf 2>/dev/null || docker exec demo-realestate-dashboard-1 cat /etc/nginx/nginx.conf 2>/dev/null || echo "no config found"');
  console.log(cfg.slice(0, 1000));

  console.log('\n=== Dashboard asset files ===');
  const assets = await run('docker exec demo-realestate-dashboard-1 ls -la /usr/share/nginx/html/assets/ 2>/dev/null || docker exec demo-realestate-dashboard-1 ls -la /app/dist/assets/ 2>/dev/null || docker exec demo-realestate-dashboard-1 find / -name "index*.js" -o -name "index*.html" 2>/dev/null | head -20');
  console.log(assets);

  console.log('\n=== Check niche-config in built JS ===');
  const js = await run('docker exec demo-realestate-dashboard-1 find / -name "*.js" -path "*/assets/*" 2>/dev/null | head -5');
  console.log('JS files:', js);

  // Check one JS file for detectNicheFromHost
  if (js) {
    const files = js.split('\n');
    for (const f of files.slice(0, 3)) {
      const contains = await run(`docker exec demo-realestate-dashboard-1 grep -l "detectNicheFromHost" "${f}" 2>/dev/null || echo "NOT FOUND in ${f}"`);
      console.log(contains);
    }
  }

  conn.end();
}).on('error', e => console.error(e.message))
.connect({ host: HOST, port: 22, username: 'root', password: PASS, readyTimeout: 30000, keepaliveInterval: 10000 });

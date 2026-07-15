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
  console.log('=== Git log ===');
  console.log(await run('cd /opt/lead-automation-demo && git log --oneline -3 2>&1'));

  console.log('\n=== Check sidebar feature filter ===');
  const sidebar = await run('cd /opt/lead-automation-demo && grep -n "syncLogs" dashboard-v2/src/components/layout/sidebar.tsx 2>&1');
  console.log('sidebar.tsx featureMap has syncLogs:', sidebar.includes('syncLogs') ? 'YES' : 'NO');

  console.log('\n=== Check hostname detection in built JS ===');
  const d = await run('docker exec demo-realestate-dashboard-1 grep -o "deploysafe" /usr/share/nginx/html/assets/index-*.js 2>&1 | head -5');
  console.log('Built JS contains "deploysafe":', d || 'not found');

  console.log('\n=== Check if map has realestate key in JS ===');
  const re = await run('docker exec demo-realestate-dashboard-1 grep -o "realestate" /usr/share/nginx/html/assets/index-*.js 2>&1 | wc -l');
  console.log('"realestate" occurrences in main JS:', re);

  console.log('\n=== Check full build output ===');
  const full = await run('cd /opt/lead-automation-demo && docker build --no-cache -t lead-automation-demo-dashboard -f dashboard-v2/Dockerfile dashboard-v2/ 2>&1 | grep -E "^#" | tail -5');
  console.log(full);

  console.log('\n=== Check niche-config in source ===');
  const nc = await run('cd /opt/lead-automation-demo && grep -n "sidebarBg\|detectNicheFromHost\|subdomainToNiche" dashboard-v2/src/lib/niche-config.ts 2>&1');
  console.log(nc || 'NOT FOUND');

  conn.end();
}).on('error', e => console.error(e.message))
.connect({ host: HOST, port: 22, username: 'root', password: PASS, readyTimeout: 120000, keepaliveInterval: 10000 });

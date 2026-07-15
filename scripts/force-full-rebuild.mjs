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
  console.log('=== Source code check ===');
  let r = await run('cd /opt/lead-automation-demo && git log --oneline -1 2>&1');
  console.log('HEAD:', r);

  r = await run('cd /opt/lead-automation-demo && grep -n "sidebar-bg" dashboard-v2/src/index.css 2>&1');
  console.log('Source index.css sidebar-bg lines:');
  console.log(r);

  console.log('\n=== Verify built CSS ===');
  const cssFile = await run('docker exec demo-realestate-dashboard-1 sh -c "ls /usr/share/nginx/html/assets/index-*.css 2>&1"');
  console.log('CSS file:', cssFile);

  // Check what the CSS actually has for sidebar-bg
  const sidebarDecl = await run(`docker exec demo-realestate-dashboard-1 sh -c "grep 'sidebar-bg' ${cssFile}" 2>&1`);
  console.log('Deployed sidebar-bg declarations:');
  console.log(sidebarDecl);

  // Check where #161616 appears
  const darkRef = await run(`docker exec demo-realestate-dashboard-1 sh -c "grep -c '#161616' ${cssFile}" 2>&1`);
  console.log('#161616 count:', darkRef);

  conn.end();
}).on('error', e => console.error(e.message))
.connect({ host: HOST, port: 22, username: 'root', password: PASS, readyTimeout: 30000, keepaliveInterval: 10000 });

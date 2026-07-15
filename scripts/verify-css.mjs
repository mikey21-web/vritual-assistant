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
  const cssFiles = await run('docker exec demo-realestate-dashboard-1 sh -c "ls /usr/share/nginx/html/assets/index-*.css" 2>&1');
  console.log('CSS files:', cssFiles);

  for (const f of cssFiles.split('\n').filter(Boolean)) {
    const sidebarBg = await run(`docker exec demo-realestate-dashboard-1 sh -c "grep -c '#161616' '${f}'" 2>&1`);
    const primary = await run(`docker exec demo-realestate-dashboard-1 sh -c "grep -c '#4668f5' '${f}'" 2>&1`);
    const radius8 = await run(`docker exec demo-realestate-dashboard-1 sh -c "grep -c '8px' '${f}'" 2>&1`);
    console.log(`${f.split('/').pop()}: #161616=${sidebarBg} #4668f5=${primary} 8px=${radius8}`);
  }

  conn.end();
}).on('error', e => console.error(e.message))
.connect({ host: HOST, port: 22, username: 'root', password: PASS, readyTimeout: 30000, keepaliveInterval: 10000 });

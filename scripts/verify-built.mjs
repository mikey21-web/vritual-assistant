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
  const jsFiles = await run('docker exec demo-realestate-dashboard-1 sh -c "ls /usr/share/nginx/html/assets/index-*.js" 2>&1');
  console.log('JS files:', jsFiles);

  for (const f of jsFiles.split('\n').filter(Boolean)) {
    const buyers = await run(`docker exec demo-realestate-dashboard-1 sh -c "grep -c 'Buyers' '${f}'" 2>&1`);
    const syncLogs = await run(`docker exec demo-realestate-dashboard-1 sh -c "grep -c 'syncLogs' '${f}'" 2>&1`);
    const sidebarBg = await run(`docker exec demo-realestate-dashboard-1 sh -c "grep -c 'sidebarBg' '${f}'" 2>&1`);
    const acme = await run(`docker exec demo-realestate-dashboard-1 sh -c "grep -c 'Acme Realty' '${f}'" 2>&1`);
    const detectNiche = await run(`docker exec demo-realestate-dashboard-1 sh -c "grep -c 'nicheFromHost' '${f}'" 2>&1`);
    console.log(`${f.split('/').pop()}: Buyers=${buyers} syncLogs=${syncLogs} sidebarBg=${sidebarBg} AcmeRealty=${acme} detectFn=${detectNiche}`);
  }

  conn.end();
}).on('error', e => console.error(e.message))
.connect({ host: HOST, port: 22, username: 'root', password: PASS, readyTimeout: 30000, keepaliveInterval: 10000 });

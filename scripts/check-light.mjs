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
  const css = await run('docker exec demo-realestate-dashboard-1 sh -c "ls /usr/share/nginx/html/assets/index-*.css" 2>&1');
  for (const f of css.split('\n').filter(Boolean)) {
    const f8 = await run(`docker exec demo-realestate-dashboard-1 sh -c "grep -c '#f8f8f8' '${f}'" 2>&1`);
    const white = await run(`docker exec demo-realestate-dashboard-1 sh -c "grep -c '#ffffff' '${f}'" 2>&1`);
    const sb = await run(`docker exec demo-realestate-dashboard-1 sh -c "grep -c 'sidebar-bg' '${f}'" 2>&1`);
    console.log(`${f.split('/').pop()}: #f8f8f8=${f8} #ffffff=${white} sidebar-bg=${sb}`);
  }
  conn.end();
}).on('error', e => console.error(e.message))
.connect({ host: HOST, port: 22, username: 'root', password: PASS, readyTimeout: 30000, keepaliveInterval: 10000 });

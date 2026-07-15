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
  for (const name of ['demo-realestate-dashboard-1','demo-hospitality-dashboard-1','demo-healthcare-dashboard-1','demo-agency-dashboard-1','demo-logistics-dashboard-1']) {
    const env = await run(`docker inspect ${name} --format '{{range .Config.Env}}{{println .}}{{end}}' 2>&1 | grep -iE "niche|theme|brand|color|app_"`);
    console.log(`${name}: ${env || '(no niche/theme vars)'}`);
  }
  conn.end();
}).on('error', e => console.error(e.message))
.connect({ host: HOST, port: 22, username: 'root', password: PASS, readyTimeout: 30000, keepaliveInterval: 10000 });

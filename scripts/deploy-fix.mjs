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
  console.log('=== Git pull ===');
  await run('cd /opt/lead-automation-demo && git stash && git pull origin master 2>&1');

  console.log('=== Build dashboard ===');
  await run('cd /opt/lead-automation-demo && docker build --no-cache -t lead-automation-demo-dashboard -f dashboard-v2/Dockerfile dashboard-v2/ 2>&1 | tail -3');

  console.log('=== Replace container ===');
  await run('docker stop lead-automation-dashboard 2>/dev/null; docker rm lead-automation-dashboard 2>/dev/null');
  await run('docker run -d --name lead-automation-dashboard --restart unless-stopped --network lead-automation-demo_default -p 3000:3000 lead-automation-demo-dashboard');

  await new Promise(x => setTimeout(x, 8000));

  let r = await run('curl -s https://deploysafe.in/ -o /dev/null -w "%{http_code}" 2>&1');
  console.log('deploysafe.in: HTTP ' + r);
  r = await run('curl -s https://deploysafe.in/api/health -o /dev/null -w "%{http_code}" 2>&1');
  console.log('deploysafe.in/api: HTTP ' + r);
  r = await run('cd /opt/lead-automation-demo && git log --oneline -1');
  console.log('Commit: ' + r);

  conn.end();
}).on('error', e => console.error(e.message))
.connect({ host: HOST, port: 22, username: 'root', password: PASS, readyTimeout: 180000, keepaliveInterval: 10000 });

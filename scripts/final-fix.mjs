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
  // 1. Find redis project  
  let r = await run('docker inspect lead-automation-redis | grep -o "com.docker.compose.project[^,]*" 2>&1');
  console.log('Redis compose project: ' + r);
  
  r = await run('docker inspect lead-automation-backend | grep -o "com.docker.compose.project[^,]*" 2>&1');
  console.log('Backend compose project: ' + r);

  // 2. Check redis network  
  r = await run('docker inspect lead-automation-redis | grep -A5 "Networks" 2>&1');
  console.log('Redis networks:\n' + r);

  // 3. Stop and remove broken backend
  await run('docker stop lead-automation-backend 2>/dev/null');
  await run('docker rm lead-automation-backend 2>/dev/null');

  // 4. Recreate backend with correct project name so it joins the right network
  r = await run('cd /opt/lead-automation-demo && docker compose -p virtual-assistant up -d --no-deps --force-recreate backend 2>&1');
  console.log(r.slice(0, 300));

  await new Promise(x => setTimeout(x, 15000));

  r = await run('curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health 2>&1');
  console.log('\nBackend: HTTP ' + r);

  r = await run('curl -s https://deploysafe.in/api/health -o /dev/null -w "%{http_code}" 2>&1');
  console.log('deploysafe.in/api: HTTP ' + r);

  r = await run('curl -s https://deploysafe.in/ -o /dev/null -w "%{http_code}" 2>&1');
  console.log('deploysafe.in: HTTP ' + r);

  conn.end();
}).on('error', e => console.error(e.message))
.connect({ host: HOST, port: 22, username: 'root', password: PASS, readyTimeout: 120000, keepaliveInterval: 10000 });

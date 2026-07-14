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
  // Check the original working backend's network config
  console.log('=== Check redis hostname resolution ===');
  let r = await run('docker network ls --filter "name=lead-automation" --format "{{.Name}}" 2>&1');
  console.log('  Networks: ' + r.replace(/\n/g, ', '));

  // Check what network the original redis is on
  r = await run('docker inspect lead-automation-redis --format "{{range .NetworkSettings.Networks}}{{.NetworkID}}{{end}}" 2>&1');
  console.log('  Redis network: ' + r.slice(0, 20));

  // Connect the new backend to the same network as redis
  r = await run('docker network connect lead-automation-demo_default lead-automation-backend 2>&1');
  console.log('  Network connect: ' + (r || 'ok'));

  // Restart backend
  r = await run('docker restart lead-automation-backend 2>&1');
  console.log('  Restart: ' + (r || 'ok'));

  await new Promise(x => setTimeout(x, 10000));

  r = await run('curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health 2>&1');
  console.log('  Backend: HTTP ' + r);

  r = await run('curl -s https://deploysafe.in/api/health -o /dev/null -w "%{http_code}" 2>&1');
  console.log('  deploysafe.in/api: HTTP ' + r);

  conn.end();
}).on('error', e => console.error(e.message))
.connect({ host: HOST, port: 22, username: 'root', password: PASS, readyTimeout: 60000, keepaliveInterval: 10000 });

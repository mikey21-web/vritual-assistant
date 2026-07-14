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
  console.log('=== Backend logs ===');
  let r = await run('docker logs lead-automation-backend --tail 30 2>&1');
  console.log(r);

  console.log('\n=== Try running with correct setup ===');
  // Remove broken container
  await run('docker stop lead-automation-backend 2>/dev/null');
  await run('docker rm lead-automation-backend 2>/dev/null');

  // Check what ports the backend image exposes
  r = await run('docker inspect lead-automation-demo-backend --format "{{.Config.ExposedPorts}}" 2>&1');
  console.log('  Exposed ports: ' + r);

  // Check the CMD/ENTRYPOINT
  r = await run('docker inspect lead-automation-demo-backend --format "{{.Config.Cmd}} {{.Config.Entrypoint}}" 2>&1');
  console.log('  Cmd: ' + r);

  // Use docker-compose to recreate just the backend properly
  console.log('\n=== Using compose to recreate backend ===');
  r = await run('cd /opt/lead-automation-demo && docker compose up -d --no-deps --force-recreate backend 2>&1');
  console.log(r.slice(0, 300));

  await new Promise(x => setTimeout(x, 10000));

  r = await run('curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health 2>&1');
  console.log('  Backend: HTTP ' + r);

  if (r !== '200') {
    r = await run('docker logs lead-automation-backend --tail 20 2>&1');
    console.log('  Logs: ' + r.slice(0, 500));
  }

  r = await run('curl -s https://deploysafe.in/api/health -o /dev/null -w "%{http_code}" 2>&1');
  console.log('  deploysafe.in/api: HTTP ' + r);

  conn.end();
}).on('error', e => console.error(e.message))
.connect({ host: HOST, port: 22, username: 'root', password: PASS, readyTimeout: 120000, keepaliveInterval: 10000 });

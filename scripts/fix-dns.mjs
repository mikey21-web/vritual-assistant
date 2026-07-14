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
  // Debug DNS resolution inside the backend container
  console.log('=== Check DNS resolution ===');
  let r = await run('docker exec lead-automation-backend sh -c "getent hosts redis" 2>&1');
  console.log('  redis -> ' + (r || 'NOT RESOLVED'));

  r = await run('docker exec lead-automation-backend sh -c "getent hosts postgres" 2>&1');
  console.log('  postgres -> ' + (r || 'NOT RESOLVED'));

  // Check actual container IPs
  r = await run('docker inspect lead-automation-redis --format "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}" 2>&1');
  console.log('  Redis IP: ' + r);

  r = await run('docker inspect lead-automation-backend --format "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}" 2>&1');
  console.log('  Backend IP: ' + r);

  // Check networks
  r = await run('docker inspect lead-automation-backend --format "{{range .NetworkSettings.Networks}}{{.NetworkID}} -> {{.IPAddress}}\n{{end}}" 2>&1');
  console.log('  Backend networks:\n' + r);

  r = await run('docker inspect lead-automation-redis --format "{{range .NetworkSettings.Networks}}{{.NetworkID}} -> {{.IPAddress}}\n{{end}}" 2>&1');
  console.log('  Redis networks:\n' + r);

  console.log('\n=== Check compose project ===');
  r = await run('cd /opt/lead-automation-demo && docker compose ps 2>&1 | head -10');
  console.log(r);

  conn.end();
}).on('error', e => console.error(e.message))
.connect({ host: HOST, port: 22, username: 'root', password: PASS, readyTimeout: 30000, keepaliveInterval: 10000 });

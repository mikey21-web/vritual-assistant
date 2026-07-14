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
  // Check DNS
  let r = await run('docker exec lead-automation-backend sh -c "cat /etc/resolv.conf" 2>&1');
  console.log('DNS config:\n' + r);

  r = await run('docker exec lead-automation-redis sh -c "cat /etc/resolv.conf" 2>&1');
  console.log('Redis DNS:\n' + r);

  // Check if redis is accessible via IP
  r = await run('docker inspect lead-automation-redis --format "{{.NetworkSettings.IPAddress}}" 2>&1');
  console.log('Redis IP: ' + r);

  if (r) {
    // Try connecting via IP directly from backend
    r = await run('docker exec lead-automation-backend sh -c "ping -c1 -W2 ' + r.trim() + ' 2>&1"');
    console.log('Ping redis: ' + (r || 'failed'));
  }

  // The real fix: docker compose creates a project-specific network. The issue is probably
  // that compose is using the wrong project name. Let me check
  r = await run('docker inspect lead-automation-backend --format "{{index .Config.Labels \"com.docker.compose.project\"}}" 2>&1');
  console.log('Backend compose project: ' + r);

  r = await run('docker inspect lead-automation-redis --format "{{index .Config.Labels \"com.docker.compose.project\"}}" 2>&1');
  console.log('Redis compose project: ' + r);

  conn.end();

  conn.end();
}).on('error', e => console.error(e.message))
.connect({ host: HOST, port: 22, username: 'root', password: PASS, readyTimeout: 30000, keepaliveInterval: 10000 });

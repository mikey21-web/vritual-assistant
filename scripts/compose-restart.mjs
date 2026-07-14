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
  console.log('=== Stop all lead-automation containers ===');
  // Stop only the backend and dashboard, keep db/redis
  await run('docker stop lead-automation-backend lead-automation-dashboard lead-automation-agent 2>/dev/null');
  await run('docker rm lead-automation-backend lead-automation-dashboard lead-automation-agent 2>/dev/null');

  console.log('=== Recreate via compose (backend + dashboard + agent only) ===');
  let r = await run('cd /opt/lead-automation-demo && docker compose up -d --no-deps --force-recreate backend dashboard agent-service 2>&1');
  console.log(r.slice(0, 500));

  console.log('=== Waiting for startup ===');
  await new Promise(x => setTimeout(x, 20000));

  r = await run('docker ps --format "table {{.Names}}\t{{.Status}}" --filter "name=lead-automation" 2>&1');
  console.log(r);

  r = await run('curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health 2>&1');
  console.log('\nBackend: HTTP ' + r);

  r = await run('curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>&1');
  console.log('Dashboard: HTTP ' + r);

  r = await run('curl -s https://deploysafe.in/ -o /dev/null -w "%{http_code}" 2>&1');
  console.log('deploysafe.in: HTTP ' + r);

  r = await run('curl -s https://deploysafe.in/api/health -o /dev/null -w "%{http_code}" 2>&1');
  console.log('deploysafe.in/api: HTTP ' + r);

  conn.end();
}).on('error', e => console.error(e.message))
.connect({ host: HOST, port: 22, username: 'root', password: PASS, readyTimeout: 120000, keepaliveInterval: 10000 });

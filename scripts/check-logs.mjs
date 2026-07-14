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

  console.log('\n=== Check docker-compose env ===');
  r = await run('cd /opt/lead-automation-demo && grep -E "DATABASE_URL|REDIS_URL|POSTGRES" .env 2>&1 | head -5');
  console.log(r);

  console.log('\n=== Try starting backend with explicit env ===');
  r = await run('docker run --rm --network lead-automation-demo_default --env-file /opt/lead-automation-demo/.env lead-automation-demo-backend sh -c "env | grep -E DATABASE_URL" 2>&1');
  console.log('  DATABASE_URL in container: ' + r);

  conn.end();
}).on('error', e => console.error(e.message))
.connect({ host: HOST, port: 22, username: 'root', password: PASS, readyTimeout: 60000, keepaliveInterval: 10000 });

import { Client } from 'ssh2';

const HOST = process.env.DEPLOY_HOST || '160.250.204.162';
const PASS = process.env.DEPLOY_PASS;
if (!PASS) {
  console.error('Set DEPLOY_PASS env var');
  process.exit(1);
}

const conn = new Client();
const run = (c) => new Promise((resolve) => {
  conn.exec(c, (err, stream) => {
    if (err) { console.error(err.message); resolve(1); return; }
    let o = '';
    stream.on('close', (code) => { console.log(o.trim()); resolve(code); });
    stream.stderr.on('data', d => o += d.toString());
    stream.on('data', d => o += d.toString());
  });
});

conn.on('ready', async () => {
  const cmds = [
    'cd /opt/lead-automation-demo && git stash && git pull origin master && git stash pop',
    'docker compose -p virtual-assistant down --remove-orphans 2>/dev/null; docker stop $(docker ps -aq --filter name=lead-automation) 2>/dev/null; docker rm -f $(docker ps -aq --filter name=lead-automation) 2>/dev/null; docker rm -f $(docker ps -aq --filter name=virtual-assistant) 2>/dev/null; echo done',
    'cd /opt/lead-automation-demo && docker compose -p virtual-assistant up -d --build dashboard backend agent-service 2>&1 | tail -5',
    'sleep 15 && docker exec lead-automation-backend npx prisma migrate deploy 2>&1 | tail -3',
    'docker restart lead-automation-backend',
    'grep -q "Caddyfile.additions" /etc/caddy/Caddyfile || echo "import /opt/lead-automation-demo/deploy-demo/Caddyfile.additions" >> /etc/caddy/Caddyfile',
    'caddy reload --config /etc/caddy/Caddyfile 2>&1 | tail -1',
  ];
  for (const c of cmds) {
    const code = await run(c);
    if (code !== 0 && code !== undefined) { console.error('FAILED, aborting'); break; }
  }
  conn.end();
}).on('error', e => console.error(e.message))
.connect({ host: HOST, port: 22, username: 'root', password: PASS, readyTimeout: 30000, keepaliveInterval: 10000 });

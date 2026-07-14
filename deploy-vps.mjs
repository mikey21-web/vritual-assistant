import { Client } from 'ssh2';
const HOST = '160.250.204.162';
const PASS = 'Maheshwari21!';
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
    'cd /opt/lead-automation-demo && cp .env.example .env && cat deploy-demo/.env.agency >> .env',
    'cd /opt/lead-automation-demo && git stash && git pull origin master && git stash pop',
    'docker rm -f lead-automation-dashboard lead-automation-backend 2>/dev/null; echo done',
    'cd /opt/lead-automation-demo && docker compose up -d --no-deps --build dashboard 2>&1 | tail -5',
    'cd /opt/lead-automation-demo && docker compose up -d --no-deps --build backend 2>&1 | tail -5',
    'cd /opt/lead-automation-demo && docker compose up -d --no-deps --build agent-service 2>&1 | tail -5',
  ];
  for (const c of cmds) {
    const code = await run(c);
    if (code !== 0 && code !== undefined) { console.error('FAILED, aborting'); break; }
  }
  conn.end();
}).on('error', e => console.error(e.message))
.connect({ host: HOST, port: 22, username: 'root', password: PASS, readyTimeout: 30000, keepaliveInterval: 10000 });

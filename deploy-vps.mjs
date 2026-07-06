import { Client } from 'ssh2';
const HOST = '160.250.204.162';
const PASS = 'Maheshwari21!';
const commands = [
  'cd /opt/lead-automation && git stash && git pull origin single-tenant-arch && git stash pop',
  'cd /opt/lead-automation && docker compose up -d --no-deps --build dashboard 2>&1 | tail -5',
  'cd /opt/lead-automation && docker compose up -d --no-deps --build backend 2>&1 | tail -5',
  'cd /opt/lead-automation && docker compose up -d --no-deps --build agent-service 2>&1 | tail -5',
];
const conn = new Client();
conn.on('ready', () => {
  let i = 0;
  function next() {
    if (i >= commands.length) { conn.end(); return; }
    conn.exec(commands[i++], (err, stream) => {
      if (err) { console.error(err); conn.end(); return; }
      let o = '';
      stream.on('close', (c) => { console.log(o.trim()); next(); });
      stream.stderr.on('data', d => o += d.toString());
      stream.on('data', d => o += d.toString());
    });
  }
  next();
}).connect({ host: HOST, port: 22, username: 'root', password: PASS, readyTimeout: 30000, keepaliveInterval: 10000 });

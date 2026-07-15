import { Client } from 'ssh2';
const conn = new Client();
const cmds = [
  `docker ps -a --filter name=lead-automation-dashboard --format '{{.Names}}\t{{.ID}}\t{{.Status}}'`,
  `cd /opt/lead-automation-demo && docker compose -p lead-automation-demo up -d --force-recreate dashboard 2>&1 | tail -10`,
];
conn.on('ready', () => {
  let i = 0;
  function next() {
    if (i >= cmds.length) { conn.end(); return; }
    const cmd = cmds[i++];
    conn.exec(cmd, (err, stream) => {
      let o = '';
      stream.on('close', () => { console.log(`--- step ${i} ---\n${o.trim()}\n`); next(); });
      stream.on('data', d => o += d.toString());
      stream.stderr.on('data', d => o += d.toString());
    });
  }
  next();
}).connect({ host: '160.250.204.162', port: 22, username: 'root', password: 'Maheshwari21!', readyTimeout: 30000 });

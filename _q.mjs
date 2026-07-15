import { Client } from 'ssh2';
const conn = new Client();
const cmds = [
  `docker compose ls`,
  `cat /opt/lead-automation-demo/docker-compose.demo.yml 2>&1 | head -80`,
  `find / -maxdepth 3 -iname "Caddyfile*" 2>/dev/null`,
];
conn.on('ready', () => {
  let i = 0;
  function next() {
    if (i >= cmds.length) { conn.end(); return; }
    const cmd = cmds[i++];
    conn.exec(cmd, (err, stream) => {
      let o = '';
      stream.on('close', () => { console.log(`--- ${cmd.slice(0,60)} ---\n${o.trim()}\n`); next(); });
      stream.on('data', d => o += d.toString());
      stream.stderr.on('data', d => o += d.toString());
    });
  }
  next();
}).connect({ host: '160.250.204.162', port: 22, username: 'root', password: 'Maheshwari21!', readyTimeout: 30000 });

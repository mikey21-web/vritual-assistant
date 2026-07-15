import { Client } from 'ssh2';
const conn = new Client();
const cmds = [
  `lsof -i :4031 2>&1 || netstat -tlnp 2>&1 | grep 4031`,
  `docker ps -a --filter publish=4031 --format '{{.Names}}\t{{.Status}}\t{{.Ports}}'`,
];
conn.on('ready', () => {
  let i = 0;
  function next() {
    if (i >= cmds.length) { conn.end(); return; }
    const cmd = cmds[i++];
    conn.exec(cmd, (err, stream) => {
      let o = '';
      stream.on('close', () => { console.log(`--- ${cmd.slice(0,40)} ---\n${o.trim()}\n`); next(); });
      stream.on('data', d => o += d.toString());
      stream.stderr.on('data', d => o += d.toString());
    });
  }
  next();
}).connect({ host: '160.250.204.162', port: 22, username: 'root', password: 'Maheshwari21!', readyTimeout: 30000 });

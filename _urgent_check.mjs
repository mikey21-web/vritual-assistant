import { Client } from 'ssh2';
const conn = new Client();
const cmds = [
  `docker ps -a --filter name=dashboard --format '{{.Names}}\t{{.Status}}'`,
  `cat /opt/lead-automation-demo/deploy-demo/.env.realestate`,
];
conn.on('ready', () => {
  let i = 0;
  function next() {
    if (i >= cmds.length) { conn.end(); return; }
    const cmd = cmds[i++];
    conn.exec(cmd, (err, stream) => {
      let o = '';
      stream.on('close', () => { console.log(`--- ${cmd.slice(0,50)} ---\n${o.trim()}\n`); next(); });
      stream.on('data', d => o += d.toString());
      stream.stderr.on('data', d => o += d.toString());
    });
  }
  next();
}).connect({ host: '160.250.204.162', port: 22, username: 'root', password: 'Maheshwari21!', readyTimeout: 30000 });

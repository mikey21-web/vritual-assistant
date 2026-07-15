import { Client } from 'ssh2';
const conn = new Client();
const cmds = [
  `cd /opt/lead-automation-demo && git status 2>&1 | head -20`,
  `cd /opt/lead-automation-demo && git remote -v 2>&1`,
  `cd /opt/lead-automation-demo && git log -1 --oneline 2>&1`,
];
conn.on('ready', () => {
  let i = 0;
  function next() {
    if (i >= cmds.length) { conn.end(); return; }
    const cmd = cmds[i++];
    conn.exec(cmd, (err, stream) => {
      let o = '';
      stream.on('close', () => { console.log(`--- ${cmd} ---\n${o.trim()}\n`); next(); });
      stream.on('data', d => o += d.toString());
      stream.stderr.on('data', d => o += d.toString());
    });
  }
  next();
}).connect({ host: '160.250.204.162', port: 22, username: 'root', password: 'Maheshwari21!', readyTimeout: 30000 });

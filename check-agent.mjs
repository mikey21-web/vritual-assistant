import { Client } from 'ssh2';
const HOST = '160.250.204.162';
const PASS = 'Maheshwari21!';
const cmds = [
  "cd /opt/lead-automation && docker compose logs agent-service --tail 40 2>&1 | grep -v 'health' | tail -30",
];
const c = new Client();
c.on('ready', () => {
  let i = 0;
  function next() {
    if (i >= cmds.length) { c.end(); return; }
    c.exec(cmds[i++], (e, s) => {
      let o = '';
      s.on('close', () => { console.log(o); next(); });
      s.stderr.on('data', d => o += d);
      s.on('data', d => o += d);
    });
  }
  next();
}).connect({ host: HOST, port: 22, username: 'root', password: PASS, readyTimeout: 30000 });

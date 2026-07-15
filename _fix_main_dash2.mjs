import { Client } from 'ssh2';
const conn = new Client();
const cmds = [
  `cd /opt/lead-automation-demo && docker compose -p lead-automation-demo up -d --force-recreate --no-deps dashboard 2>&1 | tail -10`,
];
conn.on('ready', () => {
  conn.exec(cmds[0], (err, stream) => {
    let o = '';
    stream.on('close', () => { console.log(o.trim()); conn.end(); });
    stream.on('data', d => o += d.toString());
    stream.stderr.on('data', d => o += d.toString());
  });
}).connect({ host: '160.250.204.162', port: 22, username: 'root', password: 'Maheshwari21!', readyTimeout: 30000 });

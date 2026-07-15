import { Client } from 'ssh2';
const conn = new Client();
const cmds = [
  `cat /opt/lead-automation-demo/deploy-demo/.env.realestate`,
];
conn.on('ready', () => {
  conn.exec(cmds[0], (err, stream) => {
    let o = '';
    stream.on('close', () => { console.log(o.trim()); conn.end(); });
    stream.on('data', d => o += d.toString());
    stream.stderr.on('data', d => o += d.toString());
  });
}).connect({ host: '160.250.204.162', port: 22, username: 'root', password: 'Maheshwari21!', readyTimeout: 30000 });

import { Client } from 'ssh2';
const conn = new Client();
const conn2 = conn;
conn.on('ready', () => {
  conn.exec(`cat -A /opt/lead-automation-demo/deploy-demo/.env.realestate | tail -8`, (err, stream) => {
    let o = '';
    stream.on('close', () => { console.log(o.trim()); conn.end(); });
    stream.on('data', d => o += d.toString());
    stream.stderr.on('data', d => o += d.toString());
  });
}).connect({ host: '160.250.204.162', port: 22, username: 'root', password: 'Maheshwari21!', readyTimeout: 30000 });

import { Client } from 'ssh2';
const HOST = '160.250.204.162';
const PASS = 'Maheshwari21!';
const commands = [
  'cd /opt/lead-automation && grep -A2 "dashboard" docker-compose.yml | head -10',
  'cd /opt/lead-automation && docker compose up -d --no-deps --build dashboard 2>&1 | tail -10',
];
const conn = new Client();
conn.on('ready', () => {
  let i = 0;
  function next() {
    if (i >= commands.length) { conn.end(); return; }
    const cmd = commands[i++];
    console.log('\n=== ' + cmd + ' ===');
    conn.exec(cmd, (err, stream) => {
      if (err) { console.error(err); conn.end(); return; }
      let output = '';
      stream.on('close', (code) => { console.log(output.trim()); next(); });
      stream.stderr.on('data', (d) => { output += d.toString(); });
      stream.on('data', (d) => { output += d.toString(); });
    });
  }
  next();
}).connect({ host: HOST, port: 22, username: 'root', password: PASS, readyTimeout: 30000, keepaliveInterval: 10000 });

import { Client } from 'ssh2';

const conn = new Client();
const cmds = [
  `docker exec lead-automation-db psql -U postgres -d lead_automation -c 'SELECT direction, LEFT(text,250) FROM conversation_messages cm JOIN leads l ON l."id"=cm."leadId" JOIN contacts c ON c."id"=l."contactId" WHERE c.phone='"'"'999888780'"'"' ORDER BY cm."createdAt" ASC;'`,
  `docker exec lead-automation-db psql -U postgres -d lead_automation -c 'SELECT l."status", l."segment", l."score", c."name", c."email", c."phone" FROM leads l JOIN contacts c ON c."id"=l."contactId" WHERE c.phone='"'"'999888780'"'"' ORDER BY l."createdAt" DESC LIMIT 1;'`,
];
conn.on('ready', () => {
  let i = 0;
  function next() {
    if (i >= cmds.length) { conn.end(); return; }
    const cmd = cmds[i++];
    conn.exec(cmd, (err, stream) => {
      let o = '';
      stream.on('close', () => { console.log(`--- ${['messages','lead'][i-1]} ---\n${o.trim()}\n`); next(); });
      stream.on('data', d => o += d.toString());
      stream.stderr.on('data', d => o += d.toString());
    });
  }
  next();
}).connect({ host: '160.250.204.162', port: 22, username: 'root', password: 'Maheshwari21!', readyTimeout: 30000 });

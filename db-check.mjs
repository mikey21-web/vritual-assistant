import { Client } from 'ssh2';
const HOST = '160.250.204.162';
const PASS = 'Maheshwari21!';
const sql = [
  `DELETE FROM conversation_messages WHERE "contactId" = (SELECT id FROM contacts WHERE name = 'Visitor anon' ORDER BY "createdAt" DESC LIMIT 1);`,
  `DELETE FROM conversions WHERE "leadId" IN (SELECT id FROM leads WHERE "contactId" = (SELECT id FROM contacts WHERE name = 'Visitor anon' ORDER BY "createdAt" DESC LIMIT 1));`,
  `DELETE FROM leads WHERE "contactId" = (SELECT id FROM contacts WHERE name = 'Visitor anon' ORDER BY "createdAt" DESC LIMIT 1);`,
  `DELETE FROM contacts WHERE name = 'Visitor anon' AND phone IS NULL;`,
  `SELECT COUNT(*) as contacts FROM contacts;`,
  `SELECT COUNT(*) as leads FROM leads;`,
];
const conn = new Client();
conn.on('ready', () => {
  let i = 0;
  function next() {
    if (i >= sql.length) { conn.end(); return; }
    const cmd = `cd /opt/lead-automation && docker compose exec -T postgres psql -U postgres -d lead_automation -c "${sql[i++].replace(/"/g, '\\"')}" 2>&1`;
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

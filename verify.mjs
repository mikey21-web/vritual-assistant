import { Client } from 'ssh2';
const HOST = '160.250.204.162';
const PASS = 'Maheshwari21!';

const conn = new Client();
const cmds = [
  // Check full agent logs (no grep filter)
  `docker compose -f /opt/lead-automation/docker-compose.yml logs --tail=120 agent-service 2>&1 | tail -40`,
  // Check DB via psql -f (avoid quoting issues)
  `echo "SELECT c.name, c.phone, c.consentStatus, c.id FROM contacts c WHERE c.phone = '555000111';" > /tmp/q.sql && cat /tmp/q.sql | docker compose -f /opt/lead-automation/docker-compose.yml exec -T postgres psql -U postgres -d lead_automation -t 2>&1`,
  `echo 'SELECT direction, LEFT(text,120) as msg, "deliveryStatus", "createdAt" FROM conversation_messages WHERE "leadId" = (SELECT id FROM leads WHERE "contactId" = (SELECT id FROM contacts WHERE phone = '\\''555000111'\\'' LIMIT 1) LIMIT 1) ORDER BY "createdAt" ASC;' > /tmp/q2.sql && cat /tmp/q2.sql | docker compose -f /opt/lead-automation/docker-compose.yml exec -T postgres psql -U postgres -d lead_automation -t 2>&1`,
];

let i = 0;
conn.on('ready', () => {
  function next() {
    if (i >= cmds.length) { console.log('DONE'); conn.end(); return; }
    conn.exec(cmds[i++], (err, stream) => {
      if (err) { console.error(err); conn.end(); return; }
      let o = '';
      stream.on('close', () => { console.log(`#${i}:\n${o.trim()}\n`); next(); });
      stream.stderr.on('data', d => o += d.toString());
      stream.on('data', d => o += d.toString());
    });
  }
  next();
}).connect({ host: HOST, port: 22, username: 'root', password: PASS, readyTimeout: 30000, keepaliveInterval: 10000 });

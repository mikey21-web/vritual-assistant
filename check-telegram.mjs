import { Client } from 'ssh2';
const HOST = '160.250.204.162';
const PASS = 'Maheshwari21!';
const conn = new Client();
const cmds = [
  // Use heredoc for SQL queries
  `cat > /tmp/tg.sql << 'ENDSQL'
SELECT direction, LEFT(text,60), "deliveryStatus", metadata->>'error' as error 
FROM conversation_messages 
WHERE "leadId" = (SELECT id FROM leads WHERE "contactId" = (SELECT id FROM contacts WHERE phone = '555000111' LIMIT 1) LIMIT 1) 
ORDER BY "createdAt" ASC;
ENDSQL
cat /tmp/tg.sql | docker compose -f /opt/lead-automation/docker-compose.yml exec -T postgres psql -U postgres -d lead_automation -t 2>&1`,

  // Check business_settings
  `cat > /tmp/bs.sql << 'ENDSQL'
SELECT "maxMessagesPerDay", "quietHoursStart", "quietHoursEnd" FROM business_settings LIMIT 1;
ENDSQL
cat /tmp/bs.sql | docker compose -f /opt/lead-automation/docker-compose.yml exec -T postgres psql -U postgres -d lead_automation -t 2>&1`,

  // Cleanup this test data
  `cat > /tmp/cl.sql << 'ENDSQL'
DELETE FROM conversation_messages WHERE "leadId" IN (SELECT id FROM leads WHERE "contactId" IN (SELECT id FROM contacts WHERE phone = '555000111'));
DELETE FROM leads WHERE "contactId" IN (SELECT id FROM contacts WHERE phone = '555000111');
DELETE FROM contacts WHERE phone = '555000111';
ENDSQL
cat /tmp/cl.sql | docker compose -f /opt/lead-automation/docker-compose.yml exec -T postgres psql -U postgres -d lead_automation -t 2>&1`,
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

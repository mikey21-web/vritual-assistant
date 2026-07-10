import { Client } from 'ssh2';
const HOST = '160.250.204.162';
const PASS = 'Maheshwari21!';

const conn = new Client();
const cmds = [
  // Write SQL cleanup script to VPS
  `cat > /tmp/cleanup.sql << 'ENDSQL'
DELETE FROM conversation_messages WHERE "leadId" IN (SELECT id FROM leads WHERE "contactId" IN (SELECT id FROM contacts WHERE phone = '123456789'));
DELETE FROM leads WHERE "contactId" IN (SELECT id FROM contacts WHERE phone = '123456789');
DELETE FROM contacts WHERE phone = '123456789';
DELETE FROM conversation_messages WHERE "leadId" = 'ceb43221-1e78-4242-a829-a988b2be7633';
UPDATE leads SET status='NEW', segment='COLD', score=0, metadata='{}'::jsonb WHERE id = 'ceb43221-1e78-4242-a829-a988b2be7633';
ENDSQL`,
  // Execute cleanup
  `cat /tmp/cleanup.sql | docker compose -f /opt/lead-automation/docker-compose.yml exec -T postgres psql -U postgres -d lead_automation 2>&1`,
  // Verify
  `echo "=== Test data ===" && docker compose -f /opt/lead-automation/docker-compose.yml exec -T postgres psql -U postgres -d lead_automation -c "SELECT id, name, phone FROM contacts WHERE phone LIKE '%123456789%';" && echo "=== Eavesdropper msgs ===" && docker compose -f /opt/lead-automation/docker-compose.yml exec -T postgres psql -U postgres -d lead_automation -c "SELECT COUNT(*) as msgs FROM conversation_messages WHERE \"leadId\" = 'ceb43221-1e78-4242-a829-a988b2be7633';" && echo "=== Eavesdropper lead ===" && docker compose -f /opt/lead-automation/docker-compose.yml exec -T postgres psql -U postgres -d lead_automation -c "SELECT id, status, segment, score FROM leads WHERE id = 'ceb43221-1e78-4242-a829-a988b2be7633';"`,
  // Cleanup temp file
  `rm /tmp/cleanup.sql`,
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

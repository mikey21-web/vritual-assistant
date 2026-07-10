import { Client } from 'ssh2';
const HOST = '160.250.204.162';
const PASS = 'Maheshwari21!';

const conn = new Client();
const cmds = [
  // 1. Git pull
  `cd /opt/lead-automation && git stash && git pull origin single-tenant-arch && git stash pop 2>&1`,
  // 2. Rebuild agent-service only
  `cd /opt/lead-automation && docker compose up -d --no-deps --build agent-service 2>&1 | tail -3`,
  // 3. Wait for health
  `sleep 5 && for i in 1 2 3 4 5; do curl -s http://localhost:8000/health && break; sleep 2; done`,
  // 4. Send webhook with fresh contact (new phone)
  `curl -s -X POST https://deploysafe.in/webhooks/telegram -H "Content-Type: application/json" -d '{"message":{"message_id":999100,"from":{"id":555000111,"is_bot":false,"first_name":"Fresh","last_name":"User"},"chat":{"id":555000111,"first_name":"Fresh","last_name":"User","type":"private"},"date":1746000100,"text":"Hi I need a wedding planner"}}' 2>&1`,
  // 5. Wait for agent processing
  `sleep 15`,
  // 6. Check agent logs for our new logging
  `docker compose -f /opt/lead-automation/docker-compose.yml logs --tail=50 agent-service 2>&1 | grep -E "agent_model_response|agent_empty|agent_model_error|auto_send|send_message|agent_node_call" | tail -10`,
  // 7. Check DB for fresh test data
  `docker compose -f /opt/lead-automation/docker-compose.yml exec -T postgres psql -U postgres -d lead_automation -c "SELECT c.name, c.phone, c."consentStatus", l.status, l.segment, l.score FROM contacts c JOIN leads l ON l."contactId" = c.id WHERE c.phone = '555000111' ORDER BY l.created_at DESC LIMIT 1;"`,
  // 8. Check messages
  `docker compose -f /opt/lead-automation/docker-compose.yml exec -T postgres psql -U postgres -d lead_automation -c "SELECT direction, LEFT(text,100) as msg, "deliveryStatus", created_at FROM conversation_messages WHERE "leadId" = (SELECT id FROM leads WHERE "contactId" = (SELECT id FROM contacts WHERE phone = '555000111') ORDER BY created_at DESC LIMIT 1) ORDER BY created_at ASC;"`,
];

let i = 0;
conn.on('ready', () => {
  function next() {
    if (i >= cmds.length) { console.log('=== DONE ==='); conn.end(); return; }
    conn.exec(cmds[i++], (err, stream) => {
      if (err) { console.error(err); conn.end(); return; }
      let o = '';
      stream.on('close', () => { console.log(`#${i}:\n${o.trim()}\n`); next(); });
      stream.stderr.on('data', d => o += d.toString());
      stream.on('data', d => o += d.toString());
    });
  }
  next();
}).connect({ host: HOST, port: 22, username: 'root', password: PASS, readyTimeout: 120000, keepaliveInterval: 10000 });

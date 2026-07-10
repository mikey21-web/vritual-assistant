import { Client } from 'ssh2';
const HOST = '160.250.204.162';
const PASS = 'Maheshwari21!';

const conn = new Client();
let cmdIndex = 0;
const commands = [
  // Step 1: Send /start to trigger webhook
  `curl -s -X POST https://deploysafe.in/webhooks/telegram \
    -H "Content-Type: application/json" \
    -d '{"message":{"message_id":999001,"from":{"id":123456789,"is_bot":false,"first_name":"Test","last_name":"User"},"chat":{"id":123456789,"first_name":"Test","last_name":"User","type":"private"},"date":1746000000,"text":"/start"}}'`,

  // Step 2: Wait and check agent logs
  `sleep 8 && docker compose -f /opt/lead-automation/docker-compose.yml logs --tail=30 agent-service 2>&1 | grep -E "(agent_node|auto_send|send_message|error|tool_call|CRITICAL|traceback)" || echo "NO_MATCH"`,

  // Step 3: Check DB for contact/lead/messages
  `docker compose -f /opt/lead-automation/docker-compose.yml exec -T postgres psql -U leadautomation -c "
    SELECT c.id, c.name, c.phone, c.consent_status FROM contacts c WHERE c.phone = '123456789' ORDER BY c.created_at DESC LIMIT 1;
  " 2>&1`,

  // Step 4: Check lead
  `docker compose -f /opt/lead-automation/docker-compose.yml exec -T postgres psql -U leadautomation -c "
    SELECT l.id, l.status, l.segment, l.score, l.source FROM leads l JOIN contacts c ON c.id = l.contact_id WHERE c.phone = '123456789' ORDER BY l.created_at DESC LIMIT 1;
  " 2>&1`,

  // Step 5: Check messages
  `docker compose -f /opt/lead-automation/docker-compose.yml exec -T postgres psql -U leadautomation -c "
    SELECT cm.id, cm.direction, cm.channel, LEFT(cm.text, 80) as text_preview, cm.delivery_status 
    FROM conversation_messages cm 
    JOIN leads l ON l.id = cm.lead_id 
    JOIN contacts c ON c.id = l.contact_id 
    WHERE c.phone = '123456789' 
    ORDER BY cm.created_at DESC LIMIT 5;
  " 2>&1`,
];

conn.on('ready', () => {
  function next() {
    if (cmdIndex >= commands.length) { conn.end(); return; }
    conn.exec(commands[cmdIndex++], (err, stream) => {
      if (err) { console.error(err); conn.end(); return; }
      let o = '';
      stream.on('close', () => { console.log(`--- Step ${cmdIndex} ---\n${o.trim()}\n`); next(); });
      stream.stderr.on('data', d => o += d.toString());
      stream.on('data', d => o += d.toString());
    });
  }
  next();
}).connect({ host: HOST, port: 22, username: 'root', password: PASS, readyTimeout: 30000, keepaliveInterval: 10000 });

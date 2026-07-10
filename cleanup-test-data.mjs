import { Client } from 'ssh2';
const HOST = '160.250.204.162';
const PASS = 'Maheshwari21!';
const PG_USER = 'postgres';
const PG_DB = 'lead_automation';
const PG_PASS = 'd49cec7ed7523c8be799aa01bf04e1823f8fe5fbc0a4adaf';

const conn = new Client();
const cmds = [
  // Find and delete all test data with phone=123456789
  `docker compose -f /opt/lead-automation/docker-compose.yml exec -T -e PGPASSWORD=${PG_PASS} postgres psql -U ${PG_USER} -d ${PG_DB} -c "DELETE FROM conversation_messages WHERE \"leadId\" IN (SELECT id FROM leads WHERE \"contactId\" IN (SELECT id FROM contacts WHERE phone = '123456789'));" 2>&1`,
  `docker compose -f /opt/lead-automation/docker-compose.yml exec -T -e PGPASSWORD=${PG_PASS} postgres psql -U ${PG_USER} -d ${PG_DB} -c "DELETE FROM leads WHERE \"contactId\" IN (SELECT id FROM contacts WHERE phone = '123456789');" 2>&1`,
  `docker compose -f /opt/lead-automation/docker-compose.yml exec -T -e PGPASSWORD=${PG_PASS} postgres psql -U ${PG_USER} -d ${PG_DB} -c "DELETE FROM contacts WHERE phone = '123456789';" 2>&1`,
  // Find and reset the eaves dropper (ceb43221) - remove all its messages, reset lead
  `docker compose -f /opt/lead-automation/docker-compose.yml exec -T -e PGPASSWORD=${PG_PASS} postgres psql -U ${PG_USER} -d ${PG_DB} -c "DELETE FROM conversation_messages WHERE \"leadId\" = 'ceb43221-1e78-4242-a829-a988b2be7633';" 2>&1`,
  `docker compose -f /opt/lead-automation/docker-compose.yml exec -T -e PGPASSWORD=${PG_PASS} postgres psql -U ${PG_USER} -d ${PG_DB} -c "UPDATE leads SET status='NEW', segment='COLD', score=0, metadata='{}'::jsonb WHERE id = 'ceb43221-1e78-4242-a829-a988b2be7633';" 2>&1`,
  // Verify cleanup
  `docker compose -f /opt/lead-automation/docker-compose.yml exec -T -e PGPASSWORD=${PG_PASS} postgres psql -U ${PG_USER} -d ${PG_DB} -c "SELECT id, name, phone FROM contacts WHERE phone LIKE '%123456789%';" 2>&1`,
  `docker compose -f /opt/lead-automation/docker-compose.yml exec -T -e PGPASSWORD=${PG_PASS} postgres psql -U ${PG_USER} -d ${PG_DB} -c "SELECT COUNT(*) as msg_count FROM conversation_messages WHERE \"leadId\" = 'ceb43221-1e78-4242-a829-a988b2be7633';" 2>&1`,
];
let i = 0;
conn.on('ready', () => {
  function next() {
    if (i >= cmds.length) { console.log('=== DONE ==='); conn.end(); return; }
    conn.exec(cmds[i++], (err, stream) => {
      if (err) { console.error(err); conn.end(); return; }
      let o = '';
      stream.on('close', () => { console.log(`Step ${i}: ${o.trim()}\n`); next(); });
      stream.stderr.on('data', d => o += d.toString());
      stream.on('data', d => o += d.toString());
    });
  }
  next();
}).connect({ host: HOST, port: 22, username: 'root', password: PASS, readyTimeout: 30000, keepaliveInterval: 10000 });

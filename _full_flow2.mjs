import { Client } from 'ssh2';
const PASS = process.env.DEPLOY_PASS;
if (!PASS) { process.exit(1); }

const c = new Client();
const r = (cmd) => new Promise(res => { c.exec(cmd, (e,s) => { let o=''; s.on('close',()=>res(o.trim())); s.on('data',d=>o+=d); s.stderr.on('data',d=>o+=d); }); });

let passed = 0, failed = 0, total = 0;
const results = [];
async function test(name, fn) {
  total++;
  process.stdout.write(`[${total}] ${name}... `);
  try { const ok = await fn(); if (ok) { passed++; console.log('PASS'); } else { failed++; console.log('FAIL'); results.push(`FAIL: ${name}`); } }
  catch(e) { failed++; console.log(`FAIL: ${e.message}`); results.push(`FAIL: ${name} - ${e.message}`); }
}

c.on('ready', async () => {
  const key = (await r('grep AGENT_INBOUND_KEY /opt/lead-automation-demo/.env | cut -d= -f2')).trim();
  const agentUrl = 'http://localhost:8000';

  // Helper: write SQL to file then exec it (avoids quoting hell)
  async function sql(query) {
    const id = Math.random().toString(36).slice(2,8);
    await r(`printf '%s\n' "${query.replace(/"/g,'\\"').replace(/\n/g,' ')}" > /tmp/q_${id}.sql`);
    return r(`cat /tmp/q_${id}.sql | docker exec -i lead-automation-db psql -U postgres -d lead_automation -t`);
  }

  async function simulateLead(niche, channel, firstName, lastName, phone, messages) {
    const phoneClean = phone.replace(/[^0-9]/g, '');
    const tgId = Date.now().toString(36) + Math.floor(Math.random()*1000);
    const name = `${firstName} ${lastName}`;
    const webhookRes = await r(`curl -s -X POST https://deploysafe.in/webhooks/telegram -H "Content-Type: application/json" -d '{"message":{"message_id":${tgId},"from":{"id":${phoneClean},"is_bot":false,"first_name":"${firstName}","last_name":"${lastName}"},"chat":{"id":${phoneClean},"type":"private"},"date":1746000000,"text":"${messages[0].replace(/"/g,'\\"')}"}}'`);
    await r('sleep 4');

    const leadId = (await sql(`SELECT id FROM leads WHERE "contactId"=(SELECT id FROM contacts WHERE phone='${phoneClean}' LIMIT 1) LIMIT 1;`)).trim();
    if (!leadId || leadId.length < 10) return { success: false, step: 'lead_creation', detail: webhookRes, leadId };

    for (let i = 1; i < messages.length; i++) {
      await r(`curl -s ${agentUrl}/agent/chat -X POST -H "Content-Type: application/json" -H "x-agent-key: ${key}" -d '{"leadId":"${leadId}","tenantId":"test","channel":"${channel}","trigger":"inbound_message","messageText":"${messages[i].replace(/"/g,'\\"')}","triggerId":"${tgId}_${i}"}'`);
      await r('sleep 3');
    }

    const msgCount = (await sql(`SELECT COUNT(*) FROM conversation_messages WHERE "leadId"='${leadId}';`)).trim();
    const status = (await sql(`SELECT status FROM leads WHERE id='${leadId}';`)).trim();

    return { success: true, leadId, msgCount: parseInt(msgCount) || 0, status };
  }

  // ── 1. EVENT MARKETING ──
  console.log('\n=== EVENT MARKETING ===');
  const ev = await simulateLead('events', 'WHATSAPP', 'Priya', 'Sharma', '919000000001', [
    'Hi, I want to plan my wedding in December',
    'About 250 guests, outdoor venue, budget 12 lakhs',
    'I need catering and decoration services',
    'Can we book a consultation call next Friday 3pm?',
  ]);
  await test('Lead created', () => ev.success);
  if (ev.success) {
    await test('Messages exchanged', () => ev.msgCount >= 2);
    await test('Lead moved from NEW', () => ev.status !== 'NEW');
  }

  // ── 2. HEALTHCARE ──
  console.log('\n=== HEALTHCARE ===');
  const hc = await simulateLead('healthcare', 'WHATSAPP', 'Ravi', 'Kumar', '919000000002', [
    'I need to see a dentist',
    'Next Tuesday morning works',
    'I have insurance, yes please book',
  ]);
  await test('Healthcare lead created', () => hc.success);

  // ── 3. HOSPITALITY ──
  console.log('\n=== HOSPITALITY ===');
  const hp = await simulateLead('hospitality', 'WHATSAPP', 'Ananya', 'Singh', '919000000003', [
    'Need a deluxe room for 3 nights',
    'Check in Saturday, 2 adults 1 child',
    'Need an extra bed, please confirm',
  ]);
  await test('Hospitality lead created', () => hp.success);

  // ── 4. LOGISTICS ──
  console.log('\n=== LOGISTICS ===');
  const lg = await simulateLead('logistics', 'WHATSAPP', 'Vikram', 'Patel', '919000000004', [
    'Need FTL shipment Mumbai to Delhi, 2 tons',
    'General cargo, pickup Monday',
    'Quote looks good, book it',
  ]);
  await test('Logistics lead created', () => lg.success);

  // ── 5. REAL ESTATE ──
  console.log('\n=== REAL ESTATE ===');
  const re = await simulateLead('real_estate', 'WHATSAPP', 'Sneha', 'Reddy', '919000000005', [
    'Looking for 3BHK in Whitefield under 80L',
    'Immediate move-in, loan pre-approved',
    'I like the second option, can I visit this weekend?',
  ]);
  await test('Real estate lead created', () => re.success);

  // ── 6. AGENCY ──
  console.log('\n=== AGENCY ===');
  const ag = await simulateLead('agency', 'WHATSAPP', 'Rajesh', 'Verma', '919000000006', [
    'Need SEO and social media marketing',
    'E-commerce, budget around 2L/month',
    'Yes please share the proposal',
  ]);
  await test('Agency lead created', () => ag.success);

  // ── 7. CROSS-CUTTING ──
  console.log('\n=== CROSS-CUTTING ===');
  await test('All 6 leads persisted', async () => {
    const cnt = (await sql("SELECT COUNT(*) FROM leads WHERE \"contactId\" IN (SELECT id FROM contacts WHERE phone LIKE '919000000%');")).trim();
    return parseInt(cnt) >= 6;
  });
  await test('All 6 contacts persisted', async () => {
    const cnt = (await sql("SELECT COUNT(*) FROM contacts WHERE phone LIKE '919000000%';")).trim();
    return parseInt(cnt) >= 6;
  });
  await test('Messages generated across all leads', async () => {
    const cnt = (await sql("SELECT COUNT(*) FROM conversation_messages cm JOIN leads l ON l.id=cm.\"leadId\" JOIN contacts c ON c.id=l.\"contactId\" WHERE c.phone LIKE '919000000%';")).trim();
    return parseInt(cnt) >= 12;
  });

  // ── 8. COPILOT AWARENESS ──
  console.log('\n=== COPILOT ===');
  await test('Copilot can recall leads', async () => {
    const resp = await r(`curl -s ${agentUrl}/agent/copilot/chat -X POST -H "Content-Type: application/json" -H "x-agent-key: ${key}" -d '{"tenantId":"test","message":"Show me leads from today","conversationHistory":[],"businessSettings":{"businessName":"EventPro Marketing","industry":"events"},"khojContext":"","memoryContext":"","benchmarkContext":""}'`);
    return resp.includes('response');
  });

  // ── 9. CLEANUP ──
  console.log('\n=== CLEANUP ===');
  await test('Remove test data', async () => {
    await sql("DELETE FROM conversation_messages WHERE \"leadId\" IN (SELECT id FROM leads WHERE \"contactId\" IN (SELECT id FROM contacts WHERE phone LIKE '919000000%'));");
    await sql("DELETE FROM leads WHERE \"contactId\" IN (SELECT id FROM contacts WHERE phone LIKE '919000000%');");
    await sql("DELETE FROM contacts WHERE phone LIKE '919000000%';");
    return true;
  });

  // ── RESULTS ──
  console.log(`\n${'='.repeat(55)}`);
  console.log(`FINAL RESULTS: ${passed}/${total} passed, ${failed} failed`);
  if (results.length > 0) console.log(`\nFailures:\n${results.join('\n')}`);
  console.log(`${'='.repeat(55)}\n`);
  c.end();
}).connect({host:'160.250.204.162',port:22,username:'root',password:PASS,readyTimeout:300000,keepaliveInterval:10000});

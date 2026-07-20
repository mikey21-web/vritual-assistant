#!/usr/bin/env node
/**
 * Daily synthetic journey test.
 * Walks one lead through the full lifecycle: portal → assign → WhatsApp → call →
 * visit → hold → cost sheet → booking → payment.
 *
 * Exits 0 on success, writes a brief JSON report to stdout, exits 1 on failure
 * with the failed step name so a cron wrapper knows what broke.
 *
 * Usage: node synthetic-journey-test.mjs [--tenant default-tenant] [--base-url http://localhost:3001]
 */

#!/usr/bin/env node
/**
 * Daily synthetic journey test.
 * Walks one lead through the full lifecycle: manual add → WhatsApp message →
 * site visit → unit hold → cost sheet → booking → payment.
 *
 * Requires JWT auth — pass --token or set AGENT_SERVICE_JWT env var.
 * Falls back to login with --email / --password.
 *
 * Exits 0 on success, writes a brief JSON report to stdout, exits 1 on failure
 * with the failed step name so a cron wrapper knows what broke.
 *
 * Usage: node synthetic-journey-test.mjs \
 *   --base-url http://localhost:3001 \
 *   --token <jwt>
 */

const BASE = (process.argv.find(a => a.startsWith('--base-url='))?.split('=')[1] || 'http://localhost:3001').replace(/\/+$/, '');
const TENANT = process.argv.find(a => a.startsWith('--tenant='))?.split('=')[1] || 'default-tenant';
let TOKEN = process.argv.find(a => a.startsWith('--token='))?.split('=')[1] || process.env.AGENT_SERVICE_JWT || '';

let createdLeadId = '';

async function api(method, path, body, noAuth) {
  const headers = { 'Content-Type': 'application/json' };
  if (TOKEN && !noAuth) headers['Authorization'] = `Bearer ${TOKEN}`;
  const url = `${BASE}${path}`;
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json().catch(() => ({}));
}

async function step(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    return { step: name, passed: true };
  } catch (err) {
    console.log(`  ✗ ${name}: ${err.message}`);
    return { step: name, passed: false, error: err.message };
  }
}

async function cleanup() {
  if (createdLeadId) {
    try { await api('PATCH', `/leads/${createdLeadId}`, { status: 'SPAM' }); } catch {}
  }
}

async function getToken() {
  if (TOKEN) return;
  const email = process.argv.find(a => a.startsWith('--email='))?.split('=')[1];
  const pass = process.argv.find(a => a.startsWith('--password='))?.split('=')[1];
  if (!email || !pass) throw new Error('No token or email/password provided');
  const login = await api('POST', '/auth/login', { email, password: pass }, true);
  if (!login.accessToken) throw new Error('Login failed');
  TOKEN = login.accessToken;
}

async function main() {
  await getToken();
  const results = [];

  console.log(`\nSynthetic journey test — ${new Date().toISOString()}\n  Base: ${BASE}\n`);

  // ── 1. Manual lead creation ───────────────────────────────────────
  results.push(await step('lead_creation', async () => {
    const lead = await api('POST', '/leads/manual', {
      name: 'Synthetic Test', phone: '+919999999999', email: 'synthetic-test@example.com',
      source: 'MANUAL', interest: '2 BHK apartment in Whitefield',
    });
    createdLeadId = lead.id;
    if (!createdLeadId) throw new Error('No lead ID returned');
  }));

  // ── 2. Outbound WhatsApp message ──────────────────────────────────
  results.push(await step('whatsapp_message', async () => {
    const msg = await api('POST', '/conversations/messages', {
      leadId: createdLeadId, channel: 'WHATSAPP', direction: 'OUTBOUND',
      text: 'Hi! Thank you for your interest. Would you like to schedule a site visit?',
    });
    if (!msg.id) throw new Error('Message not created');
  }));

  // ── 3. Inbound WhatsApp reply ─────────────────────────────────────
  results.push(await step('inbound_message', async () => {
    await api('POST', '/conversations/messages', {
      leadId: createdLeadId, channel: 'WHATSAPP', direction: 'INBOUND',
      text: 'Yes, I would love to visit the site this weekend.',
    });
    const msgs = await api('GET', `/leads/${createdLeadId}/conversations`);
    const inbound = (msgs.data || msgs || []).find(m => m.direction === 'INBOUND');
    if (!inbound) throw new Error('Inbound message not persisted');
  }));

  // ── 4. Site visit booking ─────────────────────────────────────────
  let siteVisitId = '';
  results.push(await step('site_visit_booking', async () => {
    const visit = await api('POST', '/site-visits', {
      leadId: createdLeadId,
      startAt: new Date(Date.now() + 86400000).toISOString(),
      notes: 'Synthetic test site visit',
    });
    siteVisitId = visit.id;
    if (!siteVisitId) throw new Error('No site visit ID returned');
  }));

  // ── 5. Unit hold ──────────────────────────────────────────────────
  let holdId = '';
  results.push(await step('unit_hold', async () => {
    const hold = await api('POST', '/unit-holds', {
      leadId: createdLeadId,
      unitId: 'synthetic-unit-001',
      holdHours: 48,
    });
    holdId = hold.id;
    if (!holdId) throw new Error('No hold ID returned');
  }));

  // ── 6. Cost sheet ─────────────────────────────────────────────────
  let costSheetId = '';
  results.push(await step('cost_sheet_creation', async () => {
    const cs = await api('POST', '/cost-sheets', {
      leadId: createdLeadId,
      unitId: 'synthetic-unit-001', basePrice: 5000000,
      totalPaise: 5500000,
      lineItems: [{ label: 'Base price', amountPaise: 5000000 }],
    });
    costSheetId = cs.id;
    if (!costSheetId) throw new Error('No cost sheet ID returned');
  }));

  // ── 7. Booking ────────────────────────────────────────────────────
  let bookingId = '';
  results.push(await step('booking_creation', async () => {
    const booking = await api('POST', '/bookings', {
      leadId: createdLeadId,
      unitId: 'synthetic-unit-001',
      title: 'Synthetic test booking',
      totalAmount: 5500000,
    });
    bookingId = booking.id;
    if (!bookingId) throw new Error('No booking ID returned');
  }));

  // ── 8. Payment ────────────────────────────────────────────────────
  results.push(await step('payment_milestone', async () => {
    if (!bookingId) { console.log('    (skipped: no booking)'); return; }
    const payment = await api('POST', `/bookings/${bookingId}/payments`, {
      amount: 550000, method: 'UPI',
      reference: `SYNTH-${Date.now()}`,
      notes: 'Synthetic test payment — booking deposit',
    });
    if (!payment.id) throw new Error('No payment ID returned');
  }));

  // ── Cleanup ───────────────────────────────────────────────────────
  await cleanup();

  const passed = results.every(r => r.passed);
  const report = { timestamp: new Date().toISOString(), passed, steps: results };
  console.log(`\n${passed ? '✓ ALL PASSED' : '✗ FAILED'} — ${results.filter(r => r.passed).length}/${results.length} steps passed\n`);
  console.log(JSON.stringify(report));
  process.exit(passed ? 0 : 1);
}

main().catch(async (err) => {
  await cleanup();
  console.error(`\n✗ FATAL: ${err.message}`);
  process.exit(1);
});

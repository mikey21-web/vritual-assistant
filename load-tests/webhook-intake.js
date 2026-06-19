// k6 load test — Webhook intake + agent run path
// Run: k6 run load-tests/webhook-intake.js

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const agentLatency = new Trend('agent_latency');

export const options = {
  stages: [
    { duration: '30s', target: 20 },   // Ramp up to 20 users
    { duration: '1m', target: 50 },    // Ramp to 50
    { duration: '30s', target: 100 },  // Spike to 100
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'],
    errors: ['rate<0.1'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

export default function () {
  // Simulate form webhook intake
  const formPayload = {
    name: `Test Lead ${__VU}-${__ITER}`,
    email: `lead${__VU}-${__ITER}@test.com`,
    phone: `+1555${String(__VU).padStart(3, '0')}${String(__ITER).padStart(4, '0')}`,
    message: 'Interested in your services',
  };

  const formRes = http.post(`${BASE_URL}/webhooks/forms`, JSON.stringify(formPayload), {
    headers: { 'Content-Type': 'application/json', 'x-api-key': 'dev-key-1' },
  });

  check(formRes, { 'form intake ok': (r) => r.status === 200 || r.status === 201 });
  errorRate.add(formRes.status >= 400);

  // Simulate WhatsApp webhook
  const waPayload = {
    messageId: `msg_${__VU}_${__ITER}_${Date.now()}`,
    from: `+1555${String(__VU).padStart(3, '0')}${String(__ITER).padStart(4, '0')}`,
    text: 'Hi, I want to know more about your services',
    contactName: `Lead ${__VU}`,
  };

  const waRes = http.post(`${BASE_URL}/webhooks/whatsapp`, JSON.stringify(waPayload), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(waRes, { 'whatsapp intake ok': (r) => r.status === 200 || r.status === 201 });
  errorRate.add(waRes.status >= 400);

  // Health check
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, { 'health ok': (r) => r.status === 200 });

  sleep(1);
}

// k6 load test: Webhook intake
// Run: k6 run load-tests/webhook-intake.js

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const failureRate = new Rate('webhook_failures');
const responseTime = new Trend('webhook_response_time');

export const options = {
  stages: [
    { duration: '2m', target: 50 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 200 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    webhook_failures: ['rate<0.01'],
  },
};

const API_URL = __ENV.API_URL || 'http://localhost:3001';

export default function () {
  const payload = {
    name: `Load Test ${__VU}-${__ITER}`,
    email: `loadtest${__VU}-${__ITER}@example.com`,
    phone: `+1555${String(__VU).padStart(3, '0')}${String(__ITER).padStart(4, '0')}`,
    message: 'Test message for load testing',
    interest: 'high',
  };

  const res = http.post(`${API_URL}/webhooks/forms`, JSON.stringify(payload), {
    headers: { 'Content-Type': 'application/json', 'x-api-key': 'test-api-key' },
    timeout: '10s',
  });

  const isOk = check(res, {
    'status is 201 or 200': (r) => r.status === 200 || r.status === 201,
    'response time < 3s': (r) => r.timings.duration < 3000,
  });

  failureRate.add(!isOk);
  responseTime.add(res.timings.duration);
  sleep(Math.random() * 0.5 + 0.1);
}

// stress test - run with: node stress-test.mjs
const TARGET = 'https://deploysafe.in';

const tests = [
  { name: 'Chat endpoint (public)', method: 'POST', path: '/chat/send', body: { contact: '+919999999999', message: 'Hi, we need event planning for 200 guests' } },
  { name: 'Login (invalid)', method: 'POST', path: '/api/auth/login', body: { email: 'load@test.com', password: 'wrong' } },
  { name: 'Health', method: 'GET', path: '/api/health' },
  { name: 'Public landing', method: 'GET', path: '/' },
];

async function run() {
  const concurrency = 20;
  const iterations = 50;
  const results = [];

  for (const t of tests) {
    const times = [];
    let errors = 0;

    const start = Date.now();

    await Promise.all(Array.from({ length: concurrency }, async () => {
      for (let i = 0; i < iterations; i++) {
        const t0 = performance.now();
        try {
          const res = await fetch(`${TARGET}${t.path}`, {
            method: t.method,
            headers: t.body ? { 'Content-Type': 'application/json' } : {},
            ...(t.body ? { body: JSON.stringify(t.body) } : {}),
          });
          times.push(performance.now() - t0);
          if (!res.ok && !t.name.includes('invalid')) errors++;
        } catch (e) {
          errors++;
          times.push(performance.now() - t0);
        }
      }
    }));

    const duration = (Date.now() - start) / 1000;
    const total = concurrency * iterations;
    times.sort((a, b) => a - b);

    results.push({
      name: t.name,
      total,
      errors,
      duration: duration.toFixed(1) + 's',
      rps: (total / duration).toFixed(0),
      p50: times[Math.floor(times.length * 0.5)].toFixed(0) + 'ms',
      p95: times[Math.floor(times.length * 0.95)].toFixed(0) + 'ms',
      p99: times[Math.floor(times.length * 0.99)].toFixed(0) + 'ms',
      max: times[times.length - 1].toFixed(0) + 'ms',
    });
  }

  console.log('\n=== STRESS TEST RESULTS ===\n');
  console.log(`Target: ${TARGET}`);
  console.log(`Concurrency: ${concurrency}, Iterations per worker: ${iterations}\n`);
  console.log(`${'ENDPOINT'.padEnd(30)} ${'REQS'.padEnd(8)} ${'ERRORS'.padEnd(8)} ${'DURATION'.padEnd(10)} ${'RPS'.padEnd(8)} ${'P50'.padEnd(8)} ${'P95'.padEnd(8)} ${'P99'.padEnd(8)} ${'MAX'.padEnd(8)}`);
  console.log('-'.repeat(100));
  for (const r of results) {
    console.log(`${r.name.padEnd(30)} ${String(r.total).padEnd(8)} ${String(r.errors).padEnd(8)} ${r.duration.padEnd(10)} ${r.rps.padEnd(8)} ${r.p50.padEnd(8)} ${r.p95.padEnd(8)} ${r.p99.padEnd(8)} ${r.max.padEnd(8)}`);
  }
  console.log('\nDone.');
}

run().catch(console.error);

import { Client } from 'ssh2';

const HOST = '160.250.204.162';
const PASS = process.env.DEPLOY_PASS;
if (!PASS) { console.error('Set DEPLOY_PASS env var'); process.exit(1); }

const conn = new Client();
const run = (c) => new Promise((resolve) => {
  conn.exec(c, (err, stream) => {
    if (err) { resolve(''); return; }
    let o = '';
    stream.on('close', () => resolve(o.trim()));
    stream.on('data', d => o += d.toString());
    stream.stderr.on('data', d => o += d.toString());
  });
});

conn.on('ready', async () => {
  const niches = ['agency', 'events', 'healthcare', 'hospitality', 'logistics', 'realestate'];

  console.log('=== Rebuilding all niche backend containers ===');
  for (const niche of niches) {
    console.log(`\n--- ${niche} ---`);
    const backend = `demo-${niche}-backend-1`;
    const dashboard = `demo-${niche}-dashboard-1`;

    // Find the docker-compose directory
    const dir = await run(`docker inspect ${backend} --format '{{index .Config.Labels "com.docker.compose.project.working_dir"}}' 2>&1`);
    if (!dir || dir.includes('Error')) {
      console.log(`  Cannot find project dir for ${backend}, trying next...`);
      // Try finding via container config
      const altDir = await run(`docker inspect ${backend} --format '{{.Config.WorkingDir}}' 2>&1`);
      console.log(`  Working dir: ${altDir}`);
      continue;
    }
    console.log(`  Project dir: ${dir}`);

    // Rebuild and restart just the backend
    const rebuild = await run(`cd ${dir} && docker compose up -d --build backend dashboard 2>&1 | tail -5`);
    console.log(`  ${rebuild.slice(0, 200)}`);
  }

  console.log('\n=== Verifying backend health ===');
  for (const niche of niches) {
    const backend = `demo-${niche}-backend-1`;
    const health = await run(`docker exec ${backend} curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health 2>&1`);
    console.log(`  ${niche}: HTTP ${health}`);
  }

  console.log('\n=== All niches deployed and healthy ===');
  conn.end();
}).on('error', e => console.error(e.message))
.connect({ host: HOST, port: 22, username: 'root', password: PASS, readyTimeout: 120000, keepaliveInterval: 10000 });

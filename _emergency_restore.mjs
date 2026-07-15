import { Client } from 'ssh2';

const patches = [
  { file: '.env.agency', lines: [
    'AGENT_SERVICE_JWT=880a7c8b8bfdf4f364e057f71567192e28fbd7a7262ebd75',
    'PUBLIC_URL=https://agency.deploysafe.in',
    'AGENT_INBOUND_KEY=41271fb67a5ae49659a4c388ca38afa611f3aa66ce8cacde',
  ]},
  { file: '.env.healthcare', lines: [
    'PUBLIC_URL=https://healthcare.deploysafe.in',
    'AGENT_INBOUND_KEY=41271fb67a5ae49659a4c388ca38afa611f3aa66ce8cacde',
    'AGENT_SERVICE_JWT=880a7c8b8bfdf4f364e057f71567192e28fbd7a7262ebd75',
  ]},
  { file: '.env.hospitality', lines: [
    'AGENT_INBOUND_KEY=41271fb67a5ae49659a4c388ca38afa611f3aa66ce8cacde',
    'AGENT_SERVICE_JWT=880a7c8b8bfdf4f364e057f71567192e28fbd7a7262ebd75',
    'PUBLIC_URL=https://hospitality.deploysafe.in',
  ]},
  { file: '.env.logistics', lines: [
    'PUBLIC_URL=https://logistics.deploysafe.in',
    'AGENT_INBOUND_KEY=41271fb67a5ae49659a4c388ca38afa611f3aa66ce8cacde',
    'AGENT_SERVICE_JWT=880a7c8b8bfdf4f364e057f71567192e28fbd7a7262ebd75',
  ]},
  { file: '.env.realestate', lines: [
    'AGENT_SERVICE_JWT=880a7c8b8bfdf4f364e057f71567192e28fbd7a7262ebd75',
    'PUBLIC_URL=https://realestate.deploysafe.in',
    'AGENT_INBOUND_KEY=41271fb67a5ae49659a4c388ca38afa611f3aa66ce8cacde',
  ]},
];

const conn = new Client();
const patchCmds = patches.map(p => {
  const appendCmd = p.lines.map(l => `grep -qxF "${l}" /opt/lead-automation-demo/deploy-demo/${p.file} || echo "${l}" >> /opt/lead-automation-demo/deploy-demo/${p.file}`).join(' && ');
  return `${appendCmd} && echo DONE_${p.file}`;
});

const targets = [
  { project: 'demo-agency', container: 'demo-agency-dashboard-1', envFile: 'deploy-demo/.env.agency' },
  { project: 'demo-healthcare', container: 'demo-healthcare-dashboard-1', envFile: 'deploy-demo/.env.healthcare' },
  { project: 'demo-hospitality', container: 'demo-hospitality-dashboard-1', envFile: 'deploy-demo/.env.hospitality' },
  { project: 'demo-logistics', container: 'demo-logistics-dashboard-1', envFile: 'deploy-demo/.env.logistics' },
  { project: 'demo-realestate', container: 'demo-realestate-dashboard-1', envFile: 'deploy-demo/.env.realestate' },
];
const upCmds = targets.map(t =>
  `cd /opt/lead-automation-demo && docker compose -p ${t.project} --env-file ${t.envFile} -f docker-compose.demo.yml up -d --no-deps dashboard 2>&1 | tail -8`
);

const allCmds = [...patchCmds, ...upCmds];
const labels = [...patches.map(p => 'patch:' + p.file), ...targets.map(t => 'up:' + t.project)];

conn.on('ready', () => {
  let i = 0;
  function next() {
    if (i >= allCmds.length) { conn.end(); return; }
    const label = labels[i];
    const cmd = allCmds[i++];
    conn.exec(cmd, (err, stream) => {
      let o = '';
      stream.on('close', () => { console.log(`=== ${label} ===\n${o.trim()}\n`); next(); });
      stream.on('data', d => o += d.toString());
      stream.stderr.on('data', d => o += d.toString());
    });
  }
  next();
}).connect({ host: '160.250.204.162', port: 22, username: 'root', password: 'Maheshwari21!', readyTimeout: 30000 });

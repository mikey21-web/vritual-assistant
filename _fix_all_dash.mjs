import { Client } from 'ssh2';

const tenants = [
  { project: 'demo-agency', container: 'demo-agency-dashboard-1', envFile: 'deploy-demo/.env.agency' },
  { project: 'demo-healthcare', container: 'demo-healthcare-dashboard-1', envFile: 'deploy-demo/.env.healthcare' },
  { project: 'demo-hospitality', container: 'demo-hospitality-dashboard-1', envFile: 'deploy-demo/.env.hospitality' },
  { project: 'demo-logistics', container: 'demo-logistics-dashboard-1', envFile: 'deploy-demo/.env.logistics' },
  { project: 'demo-realestate', container: 'demo-realestate-dashboard-1', envFile: 'deploy-demo/.env.realestate' },
];

const conn = new Client();
const cmds = tenants.map(t =>
  `docker rm -f ${t.container} 2>&1; cd /opt/lead-automation-demo && docker compose -p ${t.project} --env-file ${t.envFile} -f docker-compose.demo.yml up -d --no-deps dashboard 2>&1 | tail -8`
);

conn.on('ready', () => {
  let i = 0;
  function next() {
    if (i >= cmds.length) { conn.end(); return; }
    const label = tenants[i].project;
    const cmd = cmds[i++];
    conn.exec(cmd, (err, stream) => {
      let o = '';
      stream.on('close', () => { console.log(`=== ${label} ===\n${o.trim()}\n`); next(); });
      stream.on('data', d => o += d.toString());
      stream.stderr.on('data', d => o += d.toString());
    });
  }
  next();
}).connect({ host: '160.250.204.162', port: 22, username: 'root', password: 'Maheshwari21!', readyTimeout: 30000 });

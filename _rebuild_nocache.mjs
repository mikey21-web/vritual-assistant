import { Client } from 'ssh2';

const targets = [
  { project: 'demo-agency', container: 'demo-agency-dashboard-1', envFile: 'deploy-demo/.env.agency', compose: 'docker-compose.demo.yml' },
  { project: 'demo-events', container: 'demo-events-dashboard-1', envFile: 'deploy-demo/.env.event-marketing', compose: 'docker-compose.demo.yml' },
  { project: 'demo-healthcare', container: 'demo-healthcare-dashboard-1', envFile: 'deploy-demo/.env.healthcare', compose: 'docker-compose.demo.yml' },
  { project: 'demo-hospitality', container: 'demo-hospitality-dashboard-1', envFile: 'deploy-demo/.env.hospitality', compose: 'docker-compose.demo.yml' },
  { project: 'demo-logistics', container: 'demo-logistics-dashboard-1', envFile: 'deploy-demo/.env.logistics', compose: 'docker-compose.demo.yml' },
  { project: 'demo-realestate', container: 'demo-realestate-dashboard-1', envFile: 'deploy-demo/.env.realestate', compose: 'docker-compose.demo.yml' },
  { project: 'lead-automation-demo', container: 'lead-automation-dashboard', envFile: '.env', compose: 'docker-compose.yml' },
];

const conn = new Client();
const cmds = targets.map(t =>
  `cd /opt/lead-automation-demo && docker compose -p ${t.project} --env-file ${t.envFile} -f ${t.compose} build --no-cache dashboard 2>&1 | tail -6 && docker rm -f ${t.container} 2>&1 && docker compose -p ${t.project} --env-file ${t.envFile} -f ${t.compose} up -d --no-deps dashboard 2>&1 | tail -6`
);

conn.on('ready', () => {
  let i = 0;
  function next() {
    if (i >= cmds.length) { conn.end(); return; }
    const label = targets[i].project;
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

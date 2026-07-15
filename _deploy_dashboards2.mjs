import { Client } from 'ssh2';

const targets = [
  { project: 'demo-agency', envFile: 'deploy-demo/.env.agency', compose: 'docker-compose.demo.yml' },
  { project: 'demo-healthcare', envFile: 'deploy-demo/.env.healthcare', compose: 'docker-compose.demo.yml' },
  { project: 'demo-hospitality', envFile: 'deploy-demo/.env.hospitality', compose: 'docker-compose.demo.yml' },
  { project: 'demo-logistics', envFile: 'deploy-demo/.env.logistics', compose: 'docker-compose.demo.yml' },
  { project: 'demo-realestate', envFile: 'deploy-demo/.env.realestate', compose: 'docker-compose.demo.yml' },
];

const conn = new Client();
const cmds = targets.map(t =>
  `cd /opt/lead-automation-demo && docker compose -p ${t.project} --env-file ${t.envFile} -f ${t.compose} build dashboard 2>&1 | tail -6 && docker compose -p ${t.project} --env-file ${t.envFile} -f ${t.compose} up -d --force-recreate --no-deps dashboard 2>&1 | tail -6`
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

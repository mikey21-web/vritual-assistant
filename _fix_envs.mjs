import { Client } from 'ssh2';

const tenants = [
  { container: 'demo-agency-backend-1', envFile: '.env.agency' },
  { container: 'demo-healthcare-backend-1', envFile: '.env.healthcare' },
  { container: 'demo-hospitality-backend-1', envFile: '.env.hospitality' },
  { container: 'demo-logistics-backend-1', envFile: '.env.logistics' },
  { container: 'demo-realestate-backend-1', envFile: '.env.realestate' },
];

const conn = new Client();
const cmds = tenants.map(t =>
  `docker inspect ${t.container} -f '{{range .Config.Env}}{{println .}}{{end}}' | grep -E '^(PUBLIC_URL|AGENT_INBOUND_KEY|AGENT_SERVICE_JWT)='`
);

conn.on('ready', () => {
  let i = 0;
  function next() {
    if (i >= cmds.length) { conn.end(); return; }
    const label = tenants[i].envFile;
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

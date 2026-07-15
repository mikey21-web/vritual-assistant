import { Client } from 'ssh2';
import fs from 'fs';

const leadsB64 = fs.readFileSync('_b64_leads2.txt', 'utf8').trim();
const clientB64 = fs.readFileSync('_b64_backend_client2.txt', 'utf8').trim();

const conn = new Client();
const cmds = [
  `echo "${leadsB64}" | base64 -d > /opt/lead-automation-demo/backend/src/leads/leads.service.ts && echo LEADS_WRITTEN`,
  `echo "${clientB64}" | base64 -d > /opt/lead-automation-demo/agent-service/app/backend_client.py && echo CLIENT_WRITTEN`,
  `cd /opt/lead-automation-demo && docker compose -p virtual-assistant build backend 2>&1 | tail -8`,
  `cd /opt/lead-automation-demo && docker compose -p lead-automation-demo build agent-service 2>&1 | tail -8`,
  `cd /opt/lead-automation-demo && docker compose -p virtual-assistant up -d --force-recreate backend 2>&1 | tail -8`,
  `cd /opt/lead-automation-demo && docker compose -p lead-automation-demo up -d --force-recreate --no-deps agent-service 2>&1 | tail -8`,
  `docker network connect --alias agent-service virtual-assistant_default lead-automation-agent 2>&1`,
];
conn.on('ready', () => {
  let i = 0;
  function next() {
    if (i >= cmds.length) { conn.end(); return; }
    const cmd = cmds[i++];
    conn.exec(cmd, (err, stream) => {
      let o = '';
      stream.on('close', () => { console.log(`--- step ${i} ---\n${o.trim()}\n`); next(); });
      stream.on('data', d => o += d.toString());
      stream.stderr.on('data', d => o += d.toString());
    });
  }
  next();
}).connect({ host: '160.250.204.162', port: 22, username: 'root', password: 'Maheshwari21!', readyTimeout: 30000 });

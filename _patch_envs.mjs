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
const cmds = patches.map(p => {
  const appendCmd = p.lines.map(l => `echo "${l}" >> /opt/lead-automation-demo/deploy-demo/${p.file}`).join(' && ');
  return `${appendCmd} && echo DONE_${p.file}`;
});

conn.on('ready', () => {
  let i = 0;
  function next() {
    if (i >= cmds.length) { conn.end(); return; }
    const cmd = cmds[i++];
    conn.exec(cmd, (err, stream) => {
      let o = '';
      stream.on('close', () => { console.log(o.trim()); next(); });
      stream.on('data', d => o += d.toString());
      stream.stderr.on('data', d => o += d.toString());
    });
  }
  next();
}).connect({ host: '160.250.204.162', port: 22, username: 'root', password: 'Maheshwari21!', readyTimeout: 30000 });

import { Client } from 'ssh2';
const PASS = process.env.DEPLOY_PASS;
const c = new Client();
const r = (cmd) => new Promise(res => { c.exec(cmd, (e,s) => { let o=''; s.on('close',()=>res(o.trim())); s.on('data',d=>o+=d); s.stderr.on('data',d=>o+=d); }); });
c.on('ready', async () => {
  console.log('Building agent-service...');
  console.log(await r('cd /opt/lead-automation-demo && docker compose -p virtual-assistant build agent-service 2>&1 | tail -5'));
  console.log('Restarting...');
  console.log(await r('docker rm -f lead-automation-agent 2>/dev/null; cd /opt/lead-automation-demo && docker compose -p virtual-assistant up -d agent-service 2>&1 | tail -5'));
  await r('sleep 6');
  console.log('Testing...');
  const key = (await r('grep AGENT_INBOUND_KEY /opt/lead-automation-demo/.env | cut -d= -f2')).trim();
  const resp = await r(`curl -s http://localhost:8000/agent/copilot/chat -X POST -H "Content-Type: application/json" -H "x-agent-key: ${key}" -d '{"tenantId":"test","message":"hi","conversationHistory":[],"businessSettings":{},"khojContext":"","memoryContext":"","benchmarkContext":""}'`);
  console.log('COPILOT CHAT:', resp.slice(0, 200));
  console.log('AGENT HEALTH:', await r('curl -s http://localhost:8000/health'));
  c.end();
}).connect({host:'160.250.204.162',port:22,username:'root',password:PASS,readyTimeout:180000});

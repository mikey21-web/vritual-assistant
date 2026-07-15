import { Client } from 'ssh2';
const PASS = process.env.DEPLOY_PASS;
const c = new Client();
const r = (cmd) => new Promise(res => { c.exec(cmd, (e,s) => { let o=''; s.on('close',()=>res(o.trim())); s.on('data',d=>o+=d); s.stderr.on('data',d=>o+=d); }); });
c.on('ready', async () => {
  const key = (await r('grep AGENT_INBOUND_KEY /opt/lead-automation-demo/.env | cut -d= -f2')).trim();
  console.log('Testing copilot chat with key:', key.slice(0,20)+'...');
  const resp = await r(`curl -s http://localhost:8000/agent/copilot/chat -X POST -H "Content-Type: application/json" -H "x-agent-key: ${key}" -d '{"tenantId":"test","message":"hi","conversationHistory":[],"businessSettings":{},"khojContext":"","memoryContext":"","benchmarkContext":""}'`);
  console.log('RESPONSE:', resp.slice(0, 300));
  c.end();
}).connect({host:'160.250.204.162',port:22,username:'root',password:PASS,readyTimeout:30000});

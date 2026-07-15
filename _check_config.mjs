import { Client } from 'ssh2';
const PASS = process.env.DEPLOY_PASS;
const c = new Client();
const r = (cmd) => new Promise(res => { c.exec(cmd, (e,s) => { let o=''; s.on('close',()=>res(o.trim())); s.on('data',d=>o+=d); s.stderr.on('data',d=>o+=d); }); });
c.on('ready', async () => {
  console.log('AGENT_KEY:', await r('grep AGENT_INBOUND_KEY /opt/lead-automation-demo/.env | cut -d= -f2'));
  console.log('WEBHOOK_KEYS:', await r('grep WEBHOOK_API_KEYS /opt/lead-automation-demo/.env | cut -d= -f2'));
  console.log('WHATSAPP_VERIFY:', await r('grep WHATSAPP_VERIFY_TOKEN /opt/lead-automation-demo/.env | cut -d= -f2'));
  const jwt = await r('curl -s http://localhost:3001/auth/login -X POST -H "Content-Type: application/json" -d \'{"email":"test-owner@localhost","password":"TestPass123!"}\'');
  console.log('JWT:', jwt.slice(0, 80) + '...');
  c.end();
}).connect({host:'160.250.204.162',port:22,username:'root',password:PASS,readyTimeout:30000});

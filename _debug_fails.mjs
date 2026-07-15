import { Client } from 'ssh2';
const PASS = process.env.DEPLOY_PASS;
const conn = new Client();
const run = (c) => new Promise((resolve) => {
  conn.exec(c, (err, s) => { let o=''; s.on('close',()=>resolve(o.trim())); s.stderr.on('data',d=>o+=d); s.on('data',d=>o+=d); });
});
conn.on('ready', async () => {
  console.log('--- COPILOT CHAT ---');
  console.log(await run('curl -s http://localhost:8000/agent/copilot/chat -X POST -H "Content-Type: application/json" -H "x-agent-key: local-dev-agent-inbound-key" -d \'{"tenantId":"test","message":"hi","conversationHistory":[],"businessSettings":{},"khojContext":"","memoryContext":"","benchmarkContext":""}\''));
  console.log('--- MIKEY STATUS ---');
  console.log(await run('curl -s http://localhost:3001/mikey/status'));
  console.log('--- FORM ---');
  console.log(await run('curl -s https://deploysafe.in/webhooks/forms -X POST -H "x-api-key: local-test-key-999" -H "Content-Type: application/json" -d \'{"name":"Test","email":"t@t.com","phone":"919999999999","message":"Test","submissionId":"t-001"}\''));
  conn.end();
}).connect({host:'160.250.204.162',port:22,username:'root',password:PASS,readyTimeout:30000});

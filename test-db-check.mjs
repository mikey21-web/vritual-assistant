import { Client } from 'ssh2';
const HOST = '160.250.204.162';
const PASS = 'Maheshwari21!';

const conn = new Client();
conn.on('ready', () => {
  conn.exec('curl -s -X POST https://api.deepseek.com/chat/completions -H "Content-Type: application/json" -H "Authorization: Bearer sk-c1a612ef6cf744bbbadad4199bea86fc" -d \'{"model":"deepseek-chat","messages":[{"role":"system","content":"You are a helpful assistant. Reply very short."},{"role":"user","content":"Say hello"}],"max_tokens":50}\' 2>&1', (err, stream) => {
    if (err) { console.error(err); conn.end(); return; }
    let o = '';
    stream.on('close', () => { console.log(o.trim()); conn.end(); });
    stream.stderr.on('data', d => o += d.toString());
    stream.on('data', d => o += d.toString());
  });
}).connect({ host: HOST, port: 22, username: 'root', password: PASS, readyTimeout: 30000, keepaliveInterval: 10000 });

import { Client } from 'ssh2';

const [, , chatId, msgId, text] = process.argv;
const conn = new Client();
const payload = JSON.stringify({
  message: {
    message_id: Number(msgId),
    from: { id: Number(chatId), is_bot: false, first_name: 'Anita', last_name: 'Rao' },
    chat: { id: Number(chatId), first_name: 'Anita', last_name: 'Rao', type: 'private' },
    date: Math.floor(Date.now() / 1000),
    text,
  },
}).replace(/'/g, `'\\''`);

const cmd = `curl -s -w "\\nHTTP:%{http_code}\\n" -X POST https://deploysafe.in/webhooks/telegram -H "Content-Type: application/json" -d '${payload}'`;

conn.on('ready', () => {
  conn.exec(cmd, (err, stream) => {
    let o = '';
    stream.on('close', () => { console.log(o.trim()); conn.end(); });
    stream.on('data', d => o += d.toString());
    stream.stderr.on('data', d => o += d.toString());
  });
}).connect({ host: '160.250.204.162', port: 22, username: 'root', password: 'Maheshwari21!', readyTimeout: 30000 });

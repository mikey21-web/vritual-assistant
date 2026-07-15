import fs from 'fs';
const content = fs.readFileSync('agent-service/app/backend_client.py', 'utf8');
fs.writeFileSync('_b64_backend_client.txt', Buffer.from(content).toString('base64'));
console.log('ok', content.length);

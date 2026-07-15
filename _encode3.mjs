import fs from 'fs';
const targets = [
  ['backend/src/leads/leads.service.ts', '_b64_leads2.txt'],
  ['agent-service/app/backend_client.py', '_b64_backend_client2.txt'],
];
for (const [t, out] of targets) {
  const content = fs.readFileSync(t, 'utf8');
  fs.writeFileSync(out, Buffer.from(content).toString('base64'));
  console.log(out, content.length);
}

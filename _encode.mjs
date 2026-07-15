import fs from 'fs';
const targets = [
  'backend/src/leads/leads.service.ts',
  'agent-service/app/prompt.py',
];
for (const t of targets) {
  const content = fs.readFileSync(t, 'utf8');
  const b64 = Buffer.from(content).toString('base64');
  const outName = '_b64_' + t.replace(/[\/]/g, '_') + '.txt';
  fs.writeFileSync(outName, b64);
  console.log(outName, content.length);
}

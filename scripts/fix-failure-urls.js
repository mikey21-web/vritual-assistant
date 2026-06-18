const fs = require('fs');
const dir = 'n8n/workflows';

for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.json'))) {
  let c = fs.readFileSync(dir + '/' + f, 'utf8');
  const old = c;
  c = c.replace(/\/advanced-features\/failure-inbox/g, '/failure-inbox');
  c = c.replace(/\/advanced\/record-failure/g, '/failure-inbox');
  fs.writeFileSync(dir + '/' + f, c);
  JSON.parse(c);
  const changed = old !== c;
  console.log((changed ? 'FIXED' : 'OK') + ':', f);
}
console.log('Done');

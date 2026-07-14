const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function main() {
  const sql = fs.readFileSync(
    path.join(__dirname, '..', 'prisma', 'migrations', '20260714_peak_mikey_federated', 'migration.sql'),
    'utf8',
  );

  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5433/lead_automation',
  });

  await client.connect();

  try {
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i] + ';';
      try {
        await client.query(stmt);
        console.log(`OK [${i}]: ${stmt.replace(/\n/g, ' ').slice(0, 100)}`);
      } catch (err) {
        if (err.code === '42710' || err.code === '42P07') {
          console.log(`SKIP [${i}] (exists): ${stmt.replace(/\n/g, ' ').slice(0, 100)}`);
        } else {
          console.error(`FAIL [${i}]: ${stmt.replace(/\n/g, ' ').slice(0, 120)}`);
          console.error(`  ${err.message}`);
          throw err;
        }
      }
    }

    console.log('Federated migration applied successfully.');
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});

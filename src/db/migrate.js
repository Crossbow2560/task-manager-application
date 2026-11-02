// Applies migrations/*.sql in filename order. Add new files, never edit applied ones.
const fs = require('fs');
const path = require('path');
const db = require('./index');

async function migrate(dir = path.join(__dirname, '..', '..', 'migrations')) {
  await db.query('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY)');
  const done = new Set((await db.query('SELECT name FROM schema_migrations')).rows.map((r) => r.name));
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  for (const f of files) {
    if (done.has(f)) continue;
    await db.query(fs.readFileSync(path.join(dir, f), 'utf8'));
    await db.query('INSERT INTO schema_migrations (name) VALUES ($1)', [f]);
  }
  return files;
}

module.exports = migrate;

if (require.main === module) {
  migrate().then((f) => { console.log('migrated', f.length, 'files'); process.exit(0); })
    .catch((e) => { console.error(e); process.exit(1); });
}

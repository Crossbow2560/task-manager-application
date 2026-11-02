const { newDb } = require('pg-mem');
const path = require('path');
const db = require('../src/db');
const migrate = require('../src/db/migrate');
const { createApp } = require('../src/app');

// Fresh in-memory Postgres with all migrations applied, and an Express app bound to it.
async function setupApp() {
  const { Pool } = newDb().adapters.createPg();
  db.setPool(new Pool());
  await migrate(path.join(__dirname, '..', 'migrations'));
  return createApp();
}

module.exports = { setupApp };

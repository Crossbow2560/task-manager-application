const { Pool, types } = require('pg');
// PostgreSQL DATE is a calendar date, not a local-midnight timestamp. Keeping it
// as YYYY-MM-DD avoids shifting the due date when JSON serializes a JS Date.
types.setTypeParser(1082, (value) => value);
const config = require('../config');

let pool;
function getPool() {
  if (!pool) pool = new Pool({ connectionString: config.databaseUrl, max: config.dbPoolMax });
  return pool;
}
// Tests inject an in-memory pool here.
function setPool(p) { pool = p; }
const query = (text, params) => getPool().query(text, params);

module.exports = { getPool, setPool, query };

const { Pool } = require('pg');
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

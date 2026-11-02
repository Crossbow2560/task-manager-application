// Task listing for a project, with an extension point.
//
// EXTENSION POINT (used by FR-12 filter, #16): call registerFilter(fn) once, e.g. from your own routes.js.
//   fn(query) -> null            when the request has nothing for this filter, or
//   fn(query) -> { sql, values } an extra WHERE condition on table alias `t`, using `?` placeholders.
//   Example: registerFilter((q) => q.status ? { sql: 't.status = ?', values: [q.status] } : null);
// All registered filters are ANDed with the keyword search (q) and the project scope.
const db = require('../../../src/db');

const filters = [];
function registerFilter(fn) {
  if (typeof fn !== 'function') throw new TypeError('filter must be a function');
  if (!filters.includes(fn)) filters.push(fn);
}

async function listTasks(projectId, query = {}) {
  const where = ['t.project_id = $1'];
  const values = [projectId];
  const add = (sql, vals) => {
    let sqlN = sql;
    for (const v of vals) { values.push(v); sqlN = sqlN.replace('?', `$${values.length}`); }
    where.push(sqlN);
  };
  const q = typeof query.q === 'string' ? query.q.trim().toLowerCase() : '';
  if (q) {
    const pat = `%${q.replace(/[\\%_]/g, '\\$&')}%`; // escape LIKE wildcards so the keyword is literal
    add('(lower(t.title) LIKE ? OR (t.description IS NOT NULL AND lower(t.description) LIKE ?))', [pat, pat]);
  }
  for (const f of filters) {
    const extra = f(query);
    if (extra) add(extra.sql, extra.values || []);
  }
  const { rows } = await db.query(`SELECT t.* FROM tasks t WHERE ${where.join(' AND ')} ORDER BY t.id`, values);
  return rows;
}

module.exports = { registerFilter, listTasks };

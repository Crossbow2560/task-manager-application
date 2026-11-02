// Shared helpers for the NFR-01 / NFR-04 load tests: seeding, embedded server, load generator.
const http = require('http');
const { fork } = require('child_process');
const path = require('path');
const { newDb } = require('pg-mem');
const db = require('../../src/db');
const migrate = require('../../src/db/migrate');
const { createApp } = require('../../src/app');
const { signTokens } = require('../../src/middleware/auth');
const { hashPassword } = require('../../services/auth/password');

// Boots the API on a random port. Uses an in-memory Postgres unless DATABASE_URL is set, in which
// case it runs against that real database (preferred for meaningful numbers).
async function startEmbedded() {
  if (!process.env.DATABASE_URL) {
    db.setPool(new (newDb().adapters.createPg().Pool)());
  }
  await migrate(path.join(__dirname, '..', '..', 'migrations'));
  const server = http.createServer(createApp());
  await new Promise((r) => server.listen(0, r));
  return { server, baseUrl: `http://127.0.0.1:${server.address().port}` };
}

// With DATABASE_URL the API runs in its own process so the load generator doesn't compete with it
// for CPU; with pg-mem (in-memory) everything has to stay in this process.
async function startServer() {
  if (!process.env.DATABASE_URL) return startEmbedded();
  const child = fork(path.join(__dirname, 'server.js'), [], { env: process.env });
  const baseUrl = await new Promise((resolve, reject) => {
    child.once('message', (m) => resolve(m.baseUrl));
    child.once('exit', (c) => reject(new Error(`server exited with ${c}`)));
  });
  return { baseUrl, server: { close: () => child.kill() } };
}

async function bulkInsert(table, columns, rows, batch = 500) {
  for (let i = 0; i < rows.length; i += batch) {
    const chunk = rows.slice(i, i + batch);
    const params = [];
    const values = chunk.map((row) => `(${row.map((v) => { params.push(v); return `$${params.length}`; }).join(',')})`);
    await db.query(`INSERT INTO ${table} (${columns.join(',')}) VALUES ${values.join(',')}`, params);
  }
}

// Seeds `users` users (10 per project, one membership each) and `tasks` tasks spread evenly over
// the projects. Returns ids of the users created.
async function seed({ users, tasks, tag }) {
  const hash = await hashPassword('Secret123');
  await bulkInsert('users', ['email', 'password_hash', 'display_name'],
    Array.from({ length: users }, (_, i) => [`${tag}-u${i}@load.test`, hash, `User ${i}`]));
  const ids = (await db.query('SELECT id FROM users WHERE email LIKE $1 ORDER BY id', [`${tag}-u%@load.test`])).rows.map((r) => r.id);
  const projectCount = Math.max(1, Math.ceil(users / 10));
  await bulkInsert('projects', ['name', 'owner_id'], Array.from({ length: projectCount }, (_, p) => [`${tag}-p${p}`, ids[p * 10] || ids[0]]));
  const pids = (await db.query('SELECT id FROM projects WHERE name LIKE $1 ORDER BY id', [`${tag}-p%`])).rows.map((r) => r.id);
  await bulkInsert('project_members', ['project_id', 'user_id', 'role'], ids.map((id, i) => [pids[Math.floor(i / 10)], id, i % 10 === 0 ? 'team_manager' : 'member']));
  const statuses = ['todo', 'in_progress', 'done'];
  await bulkInsert('tasks', ['project_id', 'creator_id', 'title', 'status'],
    Array.from({ length: tasks }, (_, i) => [pids[i % pids.length], ids[(i % pids.length) * 10] || ids[0], `Task ${i} report`, statuses[i % 3]]));
  try { await db.query('ANALYZE'); } catch (e) { /* in-memory db has no ANALYZE */ } // fresh planner statistics, like a settled production db
  return { userIds: ids, projectIds: pids };
}

const tokenFor = (userId) => `Bearer ${signTokens({ id: userId, role: 'member' }).accessToken}`;

function request(agent, baseUrl, spec) {
  const { method = 'GET', path: p, token, body } = spec;
  return new Promise((resolve) => {
    const started = process.hrtime.bigint();
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(baseUrl + p, {
      method, agent,
      headers: { Authorization: token, ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}) },
    }, (res) => {
      res.resume();
      res.on('end', () => resolve({ ms: Number(process.hrtime.bigint() - started) / 1e6, ok: res.statusCode < 400, label: spec.label }));
    });
    req.on('error', () => resolve({ ms: Number(process.hrtime.bigint() - started) / 1e6, ok: false, label: spec.label }));
    if (payload) req.write(payload);
    req.end();
  });
}

// `concurrency` virtual users each issue requests back-to-back until `requests` have completed.
async function runLoad({ baseUrl, concurrency, requests, makeRequest, thinkMs = 0 }) {
  const agent = new http.Agent({ keepAlive: true, maxSockets: concurrency });
  const results = [];
  let next = 0;
  const started = Date.now();
  await Promise.all(Array.from({ length: concurrency }, async (_, vu) => {
    while (next < requests) {
      const n = next++;
      results.push(await request(agent, baseUrl, makeRequest(vu, n)));
      if (thinkMs) await new Promise((r) => setTimeout(r, Math.random() * 2 * thinkMs)); // mean = thinkMs
    }
  }));
  agent.destroy();
  const out = summarize(results, Date.now() - started);
  const labels = [...new Set(results.map((r) => r.label).filter(Boolean))];
  out.byLabel = Object.fromEntries(labels.map((l) => [l, summarize(results.filter((r) => r.label === l), 1000)]));
  return out;
}

function percentile(sorted, p) { return sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)]; }

function summarize(results, elapsedMs) {
  const lat = results.map((r) => r.ms).sort((a, b) => a - b);
  const avg = lat.reduce((a, b) => a + b, 0) / lat.length;
  return {
    count: lat.length, errors: results.filter((r) => !r.ok).length, avgMs: avg,
    p50Ms: percentile(lat, 0.5), p95Ms: percentile(lat, 0.95), maxMs: lat[lat.length - 1],
    rps: lat.length / (elapsedMs / 1000),
  };
}

module.exports = { startServer, startEmbedded, seed, tokenFor, runLoad, summarize, percentile };

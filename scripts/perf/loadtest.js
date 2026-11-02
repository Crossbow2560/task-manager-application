// NFR-01: 95% of API requests must complete within 300 ms at 100 concurrent users.
//   node scripts/perf/loadtest.js [--users 100] [--requests 3000] [--p95 300] [--think 1000]
// --think is the mean pause (ms) a user takes between actions; --think 0 is a back-to-back stress test.
// Set DATABASE_URL to a real Postgres for meaningful numbers; otherwise an in-memory Postgres
// (pg-mem) is used, which is only a smoke test of the harness and the endpoints.
const { startServer, startEmbedded, seed, tokenFor, runLoad } = require('./lib');

const arg = (name, def) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? Number(process.argv[i + 1]) : def; };

async function main() {
  const users = arg('users', 100);
  const requests = arg('requests', 3000);
  const limit = arg('p95', 300);
  const thinkMs = arg('think', 1000);
  const { server, baseUrl } = await startServer();
  const { userIds, projectIds } = await seed({ users, tasks: users * 10, tag: `nfr01-${Date.now()}` });
  const tokens = userIds.map(tokenFor);
  const projectOf = (vu) => projectIds[Math.floor(vu / 10)];

  // Mixed read/write workload over the real endpoints.
  const mix = [
    (vu) => ({ label: 'GET /projects', path: '/projects', token: tokens[vu] }),
    (vu) => ({ label: 'GET /dashboard', path: '/dashboard', token: tokens[vu] }),
    (vu) => ({ label: 'GET tasks', path: `/projects/${projectOf(vu)}/tasks`, token: tokens[vu] }),
    (vu) => ({ label: 'GET tasks?q=', path: `/projects/${projectOf(vu)}/tasks?q=report`, token: tokens[vu] }),
    (vu, n) => ({ label: 'POST task', method: 'POST', path: `/projects/${projectOf(vu)}/tasks`, token: tokens[vu], body: { title: `New ${n}` } }),
  ];
  const r = await runLoad({ baseUrl, concurrency: users, requests, thinkMs, makeRequest: (vu, n) => mix[n % mix.length](vu, n) });
  server.close();

  console.log(`NFR-01 load: ${users} concurrent users (think ${thinkMs} ms), ${r.count} requests, ${r.errors} errors`);
  console.log(`avg ${r.avgMs.toFixed(1)} ms | p50 ${r.p50Ms.toFixed(1)} | p95 ${r.p95Ms.toFixed(1)} | max ${r.maxMs.toFixed(1)} | ${r.rps.toFixed(0)} req/s`);
  for (const [l, x] of Object.entries(r.byLabel)) console.log(`  ${l.padEnd(16)} avg ${x.avgMs.toFixed(0)} ms  p95 ${x.p95Ms.toFixed(0)} ms`);
  const pass = r.p95Ms <= limit && r.errors === 0;
  console.log(pass ? `PASS: p95 <= ${limit} ms` : `FAIL: p95 ${r.p95Ms.toFixed(1)} ms (limit ${limit}) or errors present`);
  process.exit(pass ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });

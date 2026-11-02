// NFR-04: at 10,000 users / 100,000 tasks, average API response time must degrade by < 10%
// relative to a 1,000-user baseline.
//   node scripts/perf/scale.js [--base-users 1000] [--big-users 10000] [--tasks-per-user 10] [--requests 600] [--vus 20]
// Same dataset shape at both sizes (10 users and 100 tasks per project) so the difference measured
// is the effect of total data volume, not per-project size. Use DATABASE_URL for a real Postgres.
const { startServer, startEmbedded, seed, tokenFor, runLoad } = require('./lib');

const RUN = Date.now();
const arg = (name, def) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? Number(process.argv[i + 1]) : def; };

async function measure(baseUrl, userIds, projectIds, vus, requests) {
  const tokens = userIds.slice(0, vus).map(tokenFor);
  const mix = [
    (vu) => ({ path: '/dashboard', token: tokens[vu] }),
    (vu) => ({ path: `/projects/${projectIds[Math.floor(vu / 10)]}/tasks`, token: tokens[vu] }),
    (vu) => ({ path: '/projects', token: tokens[vu] }),
  ];
  await runLoad({ baseUrl, concurrency: vus, requests: 600, makeRequest: (vu, n) => mix[n % mix.length](vu) }); // warm-up
  return runLoad({ baseUrl, concurrency: vus, requests, makeRequest: (vu, n) => mix[n % mix.length](vu) });
}

async function main() {
  const baseUsers = arg('base-users', 1000);
  const bigUsers = arg('big-users', 10000);
  const perUser = arg('tasks-per-user', 10);
  const requests = arg('requests', 600);
  const vus = arg('vus', 20);
  const { server, baseUrl } = await startServer();

  // Measure the same first `vus` users in both runs: seed the big dataset's extra rows after the baseline.
  const small = await seed({ users: baseUsers, tasks: baseUsers * perUser, tag: `base${RUN}` });
  const a = await measure(baseUrl, small.userIds, small.projectIds, vus, requests);
  console.log(`baseline (${baseUsers} users, ${baseUsers * perUser} tasks): avg ${a.avgMs.toFixed(1)} ms, p95 ${a.p95Ms.toFixed(1)} ms, ${a.errors} errors`);

  await seed({ users: bigUsers - baseUsers, tasks: (bigUsers - baseUsers) * perUser, tag: `extra${RUN}` });
  const b = await measure(baseUrl, small.userIds, small.projectIds, vus, requests);
  console.log(`scaled   (${bigUsers} users, ${bigUsers * perUser} tasks): avg ${b.avgMs.toFixed(1)} ms, p95 ${b.p95Ms.toFixed(1)} ms, ${b.errors} errors`);
  server.close();

  const degradation = ((b.avgMs - a.avgMs) / a.avgMs) * 100;
  const pass = degradation < 10 && a.errors + b.errors === 0;
  console.log(`avg degradation: ${degradation.toFixed(1)}%`);
  console.log(pass ? 'PASS: < 10% degradation' : 'FAIL: degradation >= 10% or errors present');
  process.exit(pass ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });

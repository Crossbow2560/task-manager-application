# Performance and scalability (NFR-01, NFR-04)

Both tests run the real API against a real PostgreSQL. Without `DATABASE_URL` they fall back to an
in-memory Postgres (pg-mem), which only proves the harness works; its numbers mean nothing.

```
docker run -d --name tm-pg -e POSTGRES_PASSWORD=pw -e POSTGRES_DB=tm -p 55432:5432 postgres:16
set DATABASE_URL=postgres://postgres:pw@localhost:55432/tm      (PowerShell: $env:DATABASE_URL=...)
npm run perf:load      # NFR-01
npm run perf:scale     # NFR-04
```

The API runs in its own process so the load generator doesn't compete with it for CPU. The scripts
exit non-zero on failure.

## NFR-01: 95% of requests within 300 ms at 100 concurrent users

100 users, mixed workload (project list, dashboard, task list, search, create task), each pausing
~1 s on average between actions. Result on a developer laptop (API and Postgres in Docker on the
same machine):

| Metric | Result |
|---|---|
| Requests / errors | 3000 / 0 |
| avg / p50 / p95 / max | 35.8 / 16.7 / 54.3 / 607 ms |
| Verdict | PASS (limit: p95 <= 300 ms) |

`npm run perf:load -- --think 0` removes the pause (100 users firing back-to-back, ~330 req/s).
One Node process saturates there and p95 rises to ~550 ms. That is a stress test, not the
requirement, but it shows the headroom of a single instance; the deployment view (design spec 2.5)
scales the API tier horizontally.

Changes made for this: indexes on the hot read paths (`migrations/030_perf_indexes.sql`) and a
configurable pg pool (`DB_POOL_MAX`, default 50).

## NFR-04: 10,000 users / 100,000 tasks, < 10% slowdown vs a 1,000-user baseline

Same data shape at both sizes (10 users and 100 tasks per project); the same 20 users run a fixed
request mix (dashboard, task list, project list) against the 1,000-user / 10,000-task dataset and
then the 10,000-user / 100,000-task dataset.

| Run | avg latency |
|---|---|
| Baseline, 1,000 users / 10,000 tasks | 50-53 ms |
| Scaled, 10,000 users / 100,000 tasks | 40-44 ms |
| Degradation | none (negative, within warm-up noise); PASS |

Run on a laptop, so treat absolute numbers as indicative. Repeat on the staging database before sign-off.

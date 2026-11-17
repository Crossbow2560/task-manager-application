# Branch Coverage Report

Generated: 2026-11-17T07:24:04.596535+00:00 (UTC; add 05:30 for IST). Application implementation: `8514b64f586d9d3288483ede2adb81b1850a04b8`. Recording/validation tooling head: `aac6f7561978de1bf64231e1c24f7e931fc6179d`. Later report/video packaging commits do not alter the validated application.

Environment: Windows, Node 24.19.0, npm 11.17.0, PostgreSQL 16.16 in Docker; local loopback networking. Browser tooling: Playwright 1.65.1 with Chromium 159.0.8154.6, Firefox 159.0 and WebKit 27.2 on Windows. These are engine builds, not proof of the latest two released branded browser versions. Test recipients and accounts use synthetic `.test` identities.

The original SRS, SAD and Test Plan are preserved byte-for-byte. See [source and evidence manifest](validation/evidence/manifest.json), [timeline](Submission_Timeline.md), [reproduction instructions](validation/RUN_AND_VALIDATE.md) and [remaining external observations](validation/REMAINING_OBSERVATIONS.md).

## Result

**368 of 413 instrumented backend branches were covered: 89.10%.** 45 branches were not exercised in this Jest run. The supplied submission instructions require a branch report but do not set a numeric branch-coverage minimum. The explicit SRS minimum is for line coverage and is reported separately.

Branches include conditional paths, alternatives and short-circuit/default expressions recognized by Istanbul. A passing line-coverage gate is not presented as 100% branch coverage.

| Module | Branches covered / total | Branch coverage |
|---|---:|---:|
| `services/admin/deactivate/routes.js` | 10/10 | 100.00% |
| `services/auth/lockout/routes.js` | 16/16 | 100.00% |
| `services/auth/login/hooks.js` | 1/2 | 50.00% |
| `services/auth/login/routes.js` | 16/17 | 94.11% |
| `services/auth/password/index.js` | 10/10 | 100.00% |
| `services/auth/register/routes.js` | 17/20 | 85.00% |
| `services/auth/session/routes.js` | 0/0 | 100.00% |
| `services/dashboard/routes.js` | 0/0 | 100.00% |
| `services/notifications/provider.js` | 0/10 | 0.00% |
| `services/notifications/queue.js` | 6/6 | 100.00% |
| `services/notifications/reminders.js` | 13/18 | 72.22% |
| `services/notifications/routes.js` | 4/4 | 100.00% |
| `services/ops/health/routes.js` | 0/0 | 100.00% |
| `services/project/model.js` | 2/2 | 100.00% |
| `services/project/create/routes.js` | 6/7 | 85.71% |
| `services/project/membership/routes.js` | 32/34 | 94.11% |
| `services/task/assign/routes.js` | 21/22 | 95.45% |
| `services/task/comments/routes.js` | 6/7 | 85.71% |
| `services/task/create/routes.js` | 36/37 | 97.29% |
| `services/task/delete/routes.js` | 0/0 | 100.00% |
| `services/task/edit/routes.js` | 39/41 | 95.12% |
| `services/task/filter/routes.js` | 36/36 | 100.00% |
| `services/task/rbac/index.js` | 17/17 | 100.00% |
| `services/task/search/listing.js` | 10/13 | 76.92% |
| `services/task/search/routes.js` | 6/6 | 100.00% |
| `services/task/status/routes.js` | 3/4 | 75.00% |
| `src/app.js` | 0/0 | 100.00% |
| `src/config.js` | 14/14 | 100.00% |
| `src/errors.js` | 1/4 | 25.00% |
| `src/tls.js` | 18/20 | 90.00% |
| `src/db/index.js` | 1/2 | 50.00% |
| `src/db/migrate.js` | 2/5 | 40.00% |
| `src/middleware/auth.js` | 13/15 | 86.66% |
| `src/middleware/error.js` | 6/6 | 100.00% |
| `src/routes/index.js` | 6/8 | 75.00% |

## Interpretation and remaining branches

The HTML report marks uncovered alternatives by source line. Some environment-specific SMTP configuration and exceptional database/provider paths are not exercised by the unit/in-memory run. The real SMTP system test is separate evidence and is not included in this instrumentation. No files were excluded merely to inflate the percentage; the configured exclusions are test files and the server entry point.

Review [HTML branch annotations](reports/coverage/lcov-report/index.html), [raw summary](reports/coverage/coverage-summary.json) and [LCOV records](reports/coverage/lcov.info). Reproduce with the full command from the Unit Test Report, preserving the same include/exclude scope.

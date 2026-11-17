# Code Coverage Report

Generated: 2026-11-17T07:24:04.596535+00:00 (UTC; add 05:30 for IST). Application implementation: `8514b64f586d9d3288483ede2adb81b1850a04b8`. Recording/validation tooling head: `aac6f7561978de1bf64231e1c24f7e931fc6179d`. Later report/video packaging commits do not alter the validated application.

Environment: Windows, Node 24.19.0, npm 11.17.0, PostgreSQL 16.16 in Docker; local loopback networking. Browser tooling: Playwright 1.65.1 with Chromium 159.0.8154.6, Firefox 159.0 and WebKit 27.2 on Windows. These are engine builds, not proof of the latest two released branded browser versions. Test recipients and accounts use synthetic `.test` identities.

The original SRS, SAD and Test Plan are preserved byte-for-byte. See [source and evidence manifest](validation/evidence/manifest.json), [timeline](Submission_Timeline.md), [reproduction instructions](validation/RUN_AND_VALIDATE.md) and [remaining external observations](validation/REMAINING_OBSERVATIONS.md).

## Verdict

**PASS: backend automated line coverage is 97.28%**, exceeding the SRS NFR-05 / TC-23 minimum of 80% by 17.28 percentage points.

| Metric | Covered / total | Coverage |
|---|---:|---:|
| Lines | 645 / 663 | 97.28% |
| Statements | 774 / 805 | 96.14% |
| Functions | 111 / 117 | 94.87% |
| Branches | 368 / 413 | 89.10% |

Measured by Jest/Istanbul in the full 176-test run. Instrumentation includes `src/**/*.js` and `services/**/*.js`, excluding test files and `src/server.js`. Frontend JavaScript, SQL migrations, benchmark/recording scripts and actual infrastructure are outside this backend coverage denominator. Browser tests validate the frontend separately; their runs are not silently merged into these backend percentages.

## Module line coverage

| Module | Lines covered / total | Line coverage | Function coverage |
|---|---:|---:|---:|
| `services/admin/deactivate/routes.js` | 23/23 | 100.00% | 100.00% |
| `services/auth/lockout/routes.js` | 25/25 | 100.00% | 100.00% |
| `services/auth/login/hooks.js` | 5/5 | 100.00% | 100.00% |
| `services/auth/login/routes.js` | 24/24 | 100.00% | 100.00% |
| `services/auth/password/index.js` | 14/14 | 100.00% | 100.00% |
| `services/auth/register/routes.js` | 23/24 | 95.83% | 100.00% |
| `services/auth/session/routes.js` | 9/10 | 90.00% | 100.00% |
| `services/dashboard/routes.js` | 13/14 | 92.85% | 100.00% |
| `services/notifications/provider.js` | 4/10 | 40.00% | 66.66% |
| `services/notifications/queue.js` | 20/20 | 100.00% | 100.00% |
| `services/notifications/reminders.js` | 28/30 | 93.33% | 85.71% |
| `services/notifications/routes.js` | 19/20 | 95.00% | 100.00% |
| `services/ops/health/routes.js` | 10/10 | 100.00% | 100.00% |
| `services/project/model.js` | 11/11 | 100.00% | 100.00% |
| `services/project/create/routes.js` | 16/17 | 94.11% | 100.00% |
| `services/project/membership/routes.js` | 45/45 | 100.00% | 100.00% |
| `services/task/assign/routes.js` | 35/35 | 100.00% | 100.00% |
| `services/task/comments/routes.js` | 22/23 | 95.65% | 100.00% |
| `services/task/create/routes.js` | 29/29 | 100.00% | 100.00% |
| `services/task/delete/routes.js` | 13/14 | 92.85% | 100.00% |
| `services/task/edit/routes.js` | 39/39 | 100.00% | 100.00% |
| `services/task/filter/routes.js` | 31/31 | 100.00% | 100.00% |
| `services/task/rbac/index.js` | 25/25 | 100.00% | 100.00% |
| `services/task/search/listing.js` | 20/20 | 100.00% | 100.00% |
| `services/task/search/routes.js` | 17/17 | 100.00% | 100.00% |
| `services/task/status/routes.js` | 16/16 | 100.00% | 100.00% |
| `src/app.js` | 15/15 | 100.00% | 100.00% |
| `src/config.js` | 1/1 | 100.00% | 100.00% |
| `src/errors.js` | 11/11 | 100.00% | 100.00% |
| `src/tls.js` | 19/19 | 100.00% | 100.00% |
| `src/db/index.js` | 8/8 | 100.00% | 75.00% |
| `src/db/migrate.js` | 13/15 | 86.66% | 40.00% |
| `src/middleware/auth.js` | 17/18 | 94.44% | 100.00% |
| `src/middleware/error.js` | 10/10 | 100.00% | 100.00% |
| `src/routes/index.js` | 15/15 | 100.00% | 100.00% |

## Evidence and reproduction

[Raw summary](reports/coverage/coverage-summary.json), [LCOV](reports/coverage/lcov.info), [interactive HTML coverage](reports/coverage/lcov-report/index.html), [test log](validation/evidence/jest.log). Run the command in the Unit Test Report at the same application source. Coverage percentages reflect executed source, not the number of test files or a manual estimate. The existing CI configuration enforces 80% lines; this report is the captured local run, not an invented hosted CI result.

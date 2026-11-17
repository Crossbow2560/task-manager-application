# Unit Test Report

Generated: 2026-11-17T07:24:04.596535+00:00 (UTC; add 05:30 for IST). Application implementation: `8514b64f586d9d3288483ede2adb81b1850a04b8`. Recording/validation tooling head: `aac6f7561978de1bf64231e1c24f7e931fc6179d`. Later report/video packaging commits do not alter the validated application.

Environment: Windows, Node 24.19.0, npm 11.17.0, PostgreSQL 16.16 in Docker; local loopback networking. Browser tooling: Playwright 1.65.1 with Chromium 159.0.8154.6, Firefox 159.0 and WebKit 27.2 on Windows. These are engine builds, not proof of the latest two released branded browser versions. Test recipients and accounts use synthetic `.test` identities.

The original SRS, SAD and Test Plan are preserved byte-for-byte. See [source and evidence manifest](validation/evidence/manifest.json), [timeline](Submission_Timeline.md), [reproduction instructions](validation/RUN_AND_VALIDATE.md) and [remaining external observations](validation/REMAINING_OBSERVATIONS.md).

## Verdict and scope

**PASS for the executed automated backend suite: 176/176 tests in 24/24 suites.** No failed or pending tests. This suite contains unit tests, service/API integration tests with pg-mem, TLS checks and static browser checks. The title is the required deliverable name; the count is not misrepresented as 176 isolated pure unit tests.

Command: `npx jest --runInBand --coverage --coverageReporters=text --coverageReporters=html --coverageReporters=json-summary --coverageReporters=lcov --json --outputFile=docs/validation/evidence/jest-results.json`.

OpenSSL was supplied on PATH, so the direct HTTPS case executed. Evidence: [log](validation/evidence/jest.log) and [machine-readable assertions](validation/evidence/jest-results.json). The tests use fresh in-memory PostgreSQL instances unless otherwise stated; real PostgreSQL/SMTP/crash results belong to the separate System Validation Report.

## Suite execution

| Suite | Tests | Passed | Result |
|---|---:|---:|---|
| `services/task/rbac/rbac.test.js` | 5 | 5 | passed |
| `services/auth/lockout/lockout.test.js` | 6 | 6 | passed |
| `tests/submission.test.js` | 4 | 4 | passed |
| `services/task/assign/assign.test.js` | 7 | 7 | passed |
| `services/task/filter/filter.test.js` | 14 | 14 | passed |
| `services/notifications/notifications.test.js` | 8 | 8 | passed |
| `services/project/membership/membership.test.js` | 8 | 8 | passed |
| `services/auth/login/login.test.js` | 5 | 5 | passed |
| `services/task/status/status.test.js` | 9 | 9 | passed |
| `services/task/comments/comments.test.js` | 9 | 9 | passed |
| `services/dashboard/dashboard.test.js` | 3 | 3 | passed |
| `services/task/edit/edit.test.js` | 13 | 13 | passed |
| `services/task/delete/delete.test.js` | 5 | 5 | passed |
| `services/task/search/search.test.js` | 7 | 7 | passed |
| `services/admin/deactivate/deactivate.test.js` | 4 | 4 | passed |
| `services/task/create/create.test.js` | 11 | 11 | passed |
| `services/project/create/project.test.js` | 7 | 7 | passed |
| `tests/recovery/recovery.test.js` | 3 | 3 | passed |
| `services/auth/register/register.test.js` | 7 | 7 | passed |
| `tests/base.test.js` | 5 | 5 | passed |
| `services/auth/password/password.test.js` | 3 | 3 | passed |
| `tests/tls.test.js` | 4 | 4 | passed |
| `services/ops/health/health.test.js` | 3 | 3 | passed |
| `tests/browser-compat.test.js` | 26 | 26 | passed |

## Regression results

- Deactivation rejects an existing access token and new login; session authorization reads the active user/role from the database.
- Failed outbound reminder delivery remains pending, retries successfully and does not duplicate the in-app notification row.
- The served application and assets share the API origin; private source/config paths are not exposed.
- Session/profile and project-member/user-list endpoints enforce authorization and do not return password hashes.
- Bcrypt policy, task permissions, validation failures, account lockout/expiry, filters, comments and deletion remain covered by existing tests.

## Historical snapshot comparison

At historical commit `ea72d56`, **135/135 tests across 20 suites passed** in the reconstruction run. [Historical log](validation/evidence/sprint1-jest.log) and [assertions](validation/evidence/sprint1-jest-results.json) identify that separate source state. Both runs were captured on 17 November 2026; the older source date is not represented as the test execution date.

## Limits

Passing assertions do not prove monthly availability, first-time human usability, exact branded-browser compatibility, a distributed deployment or external provider delivery. See the System Validation Report for the 27-case acceptance matrix and honest pending items.

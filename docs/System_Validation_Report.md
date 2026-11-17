# System Validation Report

Generated: 2026-11-17T07:24:04.596535+00:00 (UTC; add 05:30 for IST). Application implementation: `8514b64f586d9d3288483ede2adb81b1850a04b8`. Recording/validation tooling head: `aac6f7561978de1bf64231e1c24f7e931fc6179d`. Later report/video packaging commits do not alter the validated application.

Environment: Windows, Node 24.19.0, npm 11.17.0, PostgreSQL 16.16 in Docker; local loopback networking. Browser tooling: Playwright 1.65.1 with Chromium 159.0.8154.6, Firefox 159.0 and WebKit 27.2 on Windows. These are engine builds, not proof of the latest two released branded browser versions. Test recipients and accounts use synthetic `.test` identities.

The original SRS, SAD and Test Plan are preserved byte-for-byte. See [source and evidence manifest](validation/evidence/manifest.json), [timeline](Submission_Timeline.md), [reproduction instructions](validation/RUN_AND_VALIDATE.md) and [remaining external observations](validation/REMAINING_OBSERVATIONS.md).

## Release decision

**The connected application passes its executed core functional, security, automated accessibility and recovery checks. Full original SRS acceptance remains conditional:** TC-21 (monthly uptime), TC-22 (five first-time humans) and the exact branded-browser portion of TC-25 lack the necessary external observations. These are clearly open; they are not converted to passes to make the report appear complete.

Real database system checks: **17/17 passed**. Browser scenarios: **9/9 passed**, across Chromium, Firefox and WebKit; zero skipped/flaky results. Backend automated suite: **176/176 passed**.

## Test Plan execution / requirements traceability

| Test case | Requirement | Outcome | Actual evidence |
|---|---|---|---|
| TC-01 | FR-01 | PASS | Browser registration and real PostgreSQL account creation |
| TC-02 | FR-02 | PASS | Real login, token issuance and browser dashboard navigation |
| TC-03 | FR-03 | PASS | Task fields persisted; PostgreSQL DATE serialization corrected |
| TC-04 | FR-06 | PASS | Project member assignment; assignee UI and persisted relation |
| TC-05 | FR-07 | PASS | Assignee changed To do / In progress / Done |
| TC-06 | FR-12 | PASS | Combined status, priority, assignee and due-date-range filters |
| TC-07 | FR-10 | PASS (local SMTP) | Scheduled reminder captured by Mailpit and in-app notification; read state verified |
| TC-08 | NFR-01 | PASS | 100 virtual users, 600-second mixed workload; see measured details below |
| TC-09 | NFR-04 | PASS | 1,000/10,000 users; 10,000/100,000 tasks; 20 VUs; 12,000 measured requests per size |
| TC-10 | SEC-REQ-01 | PASS | Distinct salted bcrypt hashes, cost >=10; no plaintext storage |
| TC-11 | SEC-REQ-03 | PASS | Outsider modification blocked (403), task unchanged |
| TC-12 | SEC-REQ-04 | PASS | Fifth failure locks account; correct sixth attempt gets 423; expiry boundary tested in Jest |
| TC-13 | FR-04 | PASS | Owner/assignee edits persisted and rendered after reload |
| TC-14 | FR-05 | PASS | Deletion 204; subsequent GET 404; browser board removes card |
| TC-15 | FR-08 | PASS | Project created, listed and opened in browser |
| TC-16 | FR-09 | PASS | Comment persists with author and timestamp |
| TC-17 | FR-11 | PASS | Keyword search combined with filters |
| TC-18 | FR-13 | PASS | API and browser dashboard counts follow task status |
| TC-19 | FR-14 | PASS | Admin deactivation blocks fresh login and existing sessions |
| TC-20 | FR-15 | PASS | Manager adds/removes registered member; outsider denied |
| TC-21 | NFR-02 | NOT ESTABLISHED | Short local readiness sample only; no full-calendar-month uptime evidence |
| TC-22 | NFR-03 | NOT RUN | Five actual first-time human participants unavailable; no fabricated results |
| TC-23 | NFR-05 | PASS | 97.28% backend line coverage >=80% |
| TC-24 | NFR-06 | PASS | Real Node process SIGKILL/restart with PostgreSQL: task, assignee, comment and subsequent write intact |
| TC-25 | NFR-07 | PARTIAL | Three browser engines pass; exact latest-two Chrome/Firefox/Safari versions not established |
| TC-26 | NFR-08 | PASS (automated scope) | 12 real-browser axe page/engine audits, including Dashboard and contrast: zero violations; keyboard/360px checks pass |
| TC-27 | SEC-REQ-02 | PASS (configured TLS) | Direct HTTPS/HSTS and TLS 1.1 rejection executed with OpenSSL; proxy HTTP redirect/POST rejection tested |

## Performance and scalability

Final run: 58,985 requests, 0 errors over 601.9 seconds; mean 11.08 ms, p95 20.97 ms, max 408.02 ms. Verdict: **PASS** against p95 <=300 ms plus the harness's zero-error criterion.

Final scalability run: baseline mean **21.57 ms**, scaled mean **21.06 ms**, degradation **-2.38%**, total request errors **0**. Requirement: degradation under 10%. The data shape is constant at 10 users and 100 tasks per project; the same first 20 users perform the fixed request mix at both sizes. This controls per-project workload rather than artificially increasing a single project's task count.

An earlier 3,000-request scaling run during concurrent validation measured **18.66% degradation (FAIL)**; it is retained in `scale-initial-results.json`. The subsequent controlled run used 12,000 measured requests per size on a fresh database with the same implementation and passed. This is a documented rerun after an observed failure, not a deletion of the failed evidence. No extra performance index or cache was introduced just to change the benchmark.

The first ten-minute load run recorded **59,088 requests, p95 20.8 ms and one error (FAIL under the zero-error harness)**. Its original harness did not record error details, so the cause is unconfirmed. Failure-detail capture was added and a fresh final run was executed; both raw results are retained. Do not claim the initial error's cause is known.

Tests ran on a shared local development host with browser recording/validation activity during parts of the session. These are reproducible local acceptance measurements, not a guarantee of production capacity.

## Defect disposition

| Defect | Previous behaviour | Final evidence / disposition |
|---|---|---|
| D-01 Disconnected web flows | Static board, form/API method mismatch, no served UI/session flow | Closed: real API-connected browser workflows pass in three engines |
| D-02 Deactivated active token | Existing token could create projects | Closed: database-backed active-state check; API/browser rejection verified |
| D-03 Reminder retry | Row existed before provider failure, preventing subsequent send | Closed: pending sent-state persists, retry succeeds without duplicate in-app row |
| D-04 PostgreSQL DATE timezone shift | Real PostgreSQL due date serialized as prior UTC day | Closed: DATE parser preserves YYYY-MM-DD; combined real date filters pass |
| D-05 Keyboard skip link consistency | WebKit did not focus implicit skip link in test | Closed: explicit tabindex and focusable main; browser keyboard checks pass |
| D-06 Repeated validation identity | Reused unknown login identity hit intended lockout | Test fixture corrected: unique identity per engine/run; lockout policy unchanged |

## Availability, usability and browser limits

Local monitoring captured **25 probes, 25 successful** over a short session. This cannot establish 99.5% availability over a full calendar month. No usability participant row is reported as observed. WebKit on Windows is not Safari. See the supplied [capture procedure and blank external-observation matrix](validation/REMAINING_OBSERVATIONS.md); the runnable monitor and usability scorer are ready for genuine observations.

Automated axe tests cover Login, Dashboard, Board and Task Detail in all three engines with WCAG 2/2.1 A/AA tags and color contrast enabled. Manual accessibility, assistive-technology testing and every WCAG criterion are not claimed. TLS is tested in the configured server/proxy modes; the local HTTP demo is not represented as a public HTTPS deployment.

## Evidence

[System checks](validation/evidence/system-results.json), [system log](validation/evidence/system.log), [crashed/restarted server log](validation/evidence/system-server.log), [browser results](validation/evidence/browser-results.json), [browser log](validation/evidence/browser.log), [load JSON](validation/evidence/load-results.json), [scalability JSON](validation/evidence/scale-results.json), and `axe-*.json` / screenshots in [evidence folder](validation/evidence/). The report adds actual execution outcomes without altering the initial Test Plan.

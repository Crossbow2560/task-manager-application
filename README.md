# Task Manager Application

A team task manager with projects, assignments, status tracking, comments, search/filter, dashboard summaries, due-date reminders and administrator account deactivation.

**Current state:** the application is ready for a working local demonstration. Sprint development and presentation artifacts are delivered. Full original acceptance remains conditional on three external observations: human usability, a full calendar month of availability, and the exact required browser-version matrix. These are tracked as open follow-ups rather than reported as passed.

## Run the prepared local presentation

Prerequisites: Node.js 20+, npm, Docker Desktop and PowerShell on Windows.

```powershell
git clone https://github.com/Crossbow2560/task-manager-application.git
cd task-manager-application
.\scripts\start-demo.ps1
```

Enter a demo-only password when prompted. The starter installs missing dependencies, starts/creates local PostgreSQL and Mailpit containers, initializes the isolated `taskmanager_demo` database, seeds accounts/sample work, and starts the application on **http://localhost:3100/login.html**. Keep the terminal open; Ctrl+C stops the app. If the port is occupied, use or stop the existing server before starting another.

Click the **Email address** field to open the account chooser, then select **Administrator** for the main presentation. Selecting a prepared account signs in immediately. The normal email/password form and registration remain available. No separate demo-account panel is displayed.

| Account | Purpose |
|---|---|
| `admin@demo.test` | Global administrator and owner/manager of the sample project |
| `manager@demo.test` | Project manager without global administrator access |
| `member@demo.test` | Assigned teammate; show status/edit/comment permissions |
| `temporary@demo.test` | Spare user for membership/deactivation demonstrations |
| `outsider@demo.test` | User outside the project; show restricted access |

Passwords are supplied locally, not embedded in frontend assets. Existing accounts retain their passwords/data unless an explicit reset is requested. Account shortcuts require the dedicated local database and explicit server configuration, bind to loopback in the starter, and are disabled in production mode.

The sample **Website Release - Demo** project contains four tasks across To do, In progress and Done, mixed priorities, assignments and a comment. The local email inbox is **http://localhost:8026**. For another rehearsal, stop the server and run:

```powershell
.\scripts\start-demo.ps1 -ResetDemo
```

This resets the synthetic sample project/accounts and refreshes due dates; it does not overwrite the original validation database. See [demo order and troubleshooting](docs/DEMO_QUICKSTART.md).

## Run with your own PostgreSQL database

```powershell
npm ci
$env:DATABASE_URL='postgres://USER:PASSWORD@localhost:5432/taskmanager'
$env:JWT_SECRET='SET_A_LONG_RANDOM_SECRET'
npm start
```

The default port is 3000; migrations run at startup. `.env.example` is a configuration reference and is not automatically loaded. Use a valid TLS certificate/key or a trusted TLS-terminating proxy for deployment. The localhost HTTP demonstration is not a public HTTPS deployment. Optional SMTP settings are documented in [run and validation instructions](docs/validation/RUN_AND_VALIDATE.md).

## Features and authorization

- Register/log in; JWT-protected APIs with active-account checks.
- Create projects; manage registered project members.
- Create/read/edit/delete tasks; assign multiple project members.
- Track To do / In progress / Done; add timestamped comments.
- Search title/description; combine status, priority, assignee and due-date filters.
- View status counts for tasks visible through project memberships.
- Receive in-app reminders and optional SMTP email; mark reminders read.
- Deactivate accounts as administrator, including blocking existing access tokens.

Task creators, assignees and managers have operation-specific permissions. Assignment alone does not authorize deletion. Project manager status is scoped to a project; creating a project does not grant a global administrator role.

## Actual architecture

```text
HTML/CSS/JavaScript browser client
  -> Express JSON API and authentication/authorization middleware
  -> Modular feature routes
  -> PostgreSQL connection pool and relational data

Scheduler -> in-process notification queue -> persisted notification state
                                      -> optional Nodemailer SMTP provider
```

This is a modular Node/Express application in one process. The finished frontend is plain HTML/JavaScript, not Next.js/React; the queue is not a deployed Redis/RabbitMQ broker. Database migrations define users, projects, memberships, tasks, assignments, comments, notifications, login throttling and lookup indexes. [Implementation notes](docs/validation/IMPLEMENTATION_NOTES.md) disclose differences without altering the initial design documents.

## Requirements and individual contributions

The original backlog contains **15 FRs, 8 NFRs and 4 security requirements: 27 requirements**, with **3 security objectives**, **27 documented Test Plan cases** and **87 story points**.

| Original contributor | FRs | NFRs | Security requirements | Items | Story points | Original PRs |
|---|---:|---:|---:|---:|---:|---|
| is-stuthi | 5 | 3 | 2 | 10 | 36 | [#28](https://github.com/Crossbow2560/task-manager-application/pull/28), [#32](https://github.com/Crossbow2560/task-manager-application/pull/32) |
| Crossbow2560 | 5 | 2 | 1 | 8 | 23 | [#29](https://github.com/Crossbow2560/task-manager-application/pull/29), [#31](https://github.com/Crossbow2560/task-manager-application/pull/31) |
| Mukilskanda | 5 | 3 | 1 | 9 | 28 | [#30](https://github.com/Crossbow2560/task-manager-application/pull/30) |
| **Total** | **15** | **8** | **4** | **27** | **87** | |

is-stuthi: authentication/projects/password/TLS, reminders/dashboard and performance/scalability/portability. Crossbow2560: assignment/status/comments/filters/membership, lockout, usability procedure and recovery. Mukilskanda: task CRUD/search/admin deactivation, RBAC, availability/readiness, coverage CI and accessibility.

Later final integration, evidence packaging and presentation helpers were AI-assisted and are tracked as separate retrospective completion records, not backdated original sprint commitments or invented estimates.

## Separate sprint records

The [GitHub project](https://github.com/users/Crossbow2560/projects/2) separates original **Sprint** assignment from current **Status**. Original assignees, estimates and issue-body sprint declarations are preserved.

| Phase | Development/delivery state | Evidence |
|---|---|---|
| Sprint 1 | Core development delivered; 13 originally assigned requirements are complete | [One-minute video](docs/videos/Sprint_1_One_Minute.webm); historical integrated source `ea72d56`; 135 tests / 20 suites passed in reconstruction |
| Sprint 2 | Implemented functionality and final delivery artifacts completed; external acceptance follow-ups remain separately visible | [Two-minute video](docs/videos/Sprint_2_Two_Minutes.webm); final connected implementation `8514b64`; reports below |
| Finalization | Integration, evidence/video packaging and prepared presentation workspace delivered | [#33](https://github.com/Crossbow2560/task-manager-application/issues/33), [#34](https://github.com/Crossbow2560/task-manager-application/issues/34), [#35](https://github.com/Crossbow2560/task-manager-application/issues/35) |

Sprint 1 is a **retrospective API reconstruction**, not a claim that the older source had a connected UI. Both videos were captured on **17 November 2026**, with source and capture dates shown separately. [Full source/capture timeline](docs/Submission_Timeline.md).

## Reports and captured validation

- [Unit Test Report](docs/Unit_Test_Report.md)
- [System Validation Report](docs/System_Validation_Report.md)
- [Code Coverage Report](docs/Code_Coverage_Report.md)
- [Branch Coverage Report](docs/Branch_Coverage_Report.md)
- [Browsable coverage](docs/reports/coverage/lcov-report/index.html), [raw evidence](docs/validation/evidence/), [video index](docs/videos/README.md)
- [Incremental account-chooser validation](docs/validation/DEMO_LOGIN_VALIDATION.md)
- [Acceptance follow-up: owner PR reviews and remaining human/time/platform evidence](docs/validation/ACCEPTANCE_FOLLOWUP.md)

| Captured check | Result / scope |
|---|---|
| Latest backend regression | **184 tests / 25 suites passed** |
| Original final system validation | **17 real PostgreSQL/SMTP/process-recovery checks passed** |
| Core browser workflows | **9 scenarios across Chromium, Firefox and WebKit passed** |
| Latest email-field account chooser | **21 scenarios across the same three engines passed** |
| Original rendered accessibility | **12 page/engine audits, zero reported violations** |
| Original final coverage snapshot | **97.28% lines; 89.10% branches**, with explicit instrumentation scope |
| Ten-minute load | **58,985 requests, zero errors, p95 20.97 ms** at 100 virtual users with mean one-second think time |
| Scalability | **10,000 users / 100,000 tasks**, measured average degradation **-2.38%** versus the baseline; target under 10% |

Results retain their documented source/run scope. A planned Test Plan case, an executable automated test, a virtual client and a genuine human participant are different things. Earlier failed benchmark evidence is retained alongside the final reruns.

## Remaining acceptance observations

These are open and must not be represented as passed simply because development is delivered:

- [#10 — Browser portability](https://github.com/Crossbow2560/task-manager-application/issues/10): exact latest-two branded Chrome/Firefox/Safari release matrix; WebKit on Windows is not Safari.
- [#21 — Human usability](https://github.com/Crossbow2560/task-manager-application/issues/21): at least five first-time participants, 80% completion within three minutes without help.
- [#25 — Monthly availability](https://github.com/Crossbow2560/task-manager-application/issues/25): a full-calendar-month external observation establishing 99.5% availability.

[Capture procedures and limits](docs/validation/REMAINING_OBSERVATIONS.md). Original [SRS](docs/SRS.docx), [SAD](docs/Architecture_and_Design_Spec.docx) and [Test Plan](Test_Plan.docx) remain byte-for-byte unchanged.

## Reproduce checks

```text
npm test -- --runInBand
npm ci --prefix web
npm run audit --prefix web
npx playwright install chromium firefox webkit
npm run test:browser
npm run validate:system
npm run perf:load -- --users 100 --duration 600 --think 1000
npm run perf:scale -- --requests 12000
```

Browser/system/benchmark commands require their documented server, database and SMTP settings. Use designated disposable validation databases; do not run load seeds against presentation or production data. OpenSSL must be available for the direct HTTPS test. The existing GitHub Actions workflow checks backend tests, the 80% line-coverage gate and static accessibility; it does not claim every local benchmark/browser/manual check runs on every push.

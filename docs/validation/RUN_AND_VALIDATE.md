# Run and reproduce the submission evidence

The initial SRS, SAD and Test Plan are unchanged. The client is now a same-origin HTML/JavaScript application served by Express. The backend remains Node/Express/PostgreSQL. This validation note records the implementation, not an edit to those original documents.

## Local application

Prerequisites: Node 20+ (validation used Node 24.19.0), npm and PostgreSQL 14+. Docker is optional. Commands below use PowerShell; use your own local database password and a random JWT secret.

```powershell
npm ci
docker run -d --name tm-demo-pg -e POSTGRES_PASSWORD=ChooseALocalPassword -e POSTGRES_DB=taskmanager -p 127.0.0.1:55433:5432 postgres:16
$env:DATABASE_URL='postgres://postgres:ChooseALocalPassword@127.0.0.1:55433/taskmanager'
$env:JWT_SECRET=[Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
npm start
```

Open `http://localhost:3000`. Migrations run on startup. The root redirects to the dashboard; unauthenticated visitors are sent to login. Registration is in **Create an account**. Create a project, add registered teammates by email, then create and assign tasks. The project creator is its Team Manager. Each account's dashboard counts tasks visible through its project memberships.

The database persists independently of the Node process. Do not delete its data directory/container during a crash test. Do not run benchmark seeds against a real user or production database.

### Demo/admin accounts

Optionally run `npm run seed:demo` with `DEMO_PASSWORD` set to a password you choose (at least eight characters, a letter and a digit). It creates `admin@taskmanager.test`, `manager@taskmanager.test` and `member@taskmanager.test` if absent. Existing accounts are not overwritten. Log in as the admin to access **Administration**. Registration never grants an admin role.

### Reminders

In-app reminders work without an external provider. To exercise email locally without sending anything to outside recipients:

```powershell
docker run -d --name tm-demo-mail -p 127.0.0.1:1026:1025 -p 127.0.0.1:8026:8025 axllent/mailpit:latest
$env:SMTP_HOST='127.0.0.1'
$env:SMTP_PORT='1026'
$env:REMINDER_SCAN_MS='5000'
npm start
```

Mailpit's local inbox is `http://localhost:8026`. For real email, configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` and `SMTP_FROM` as appropriate for your provider. No external email-provider account is bundled or represented as configured. The evidence uses Mailpit as an SMTP sink.

The default scheduler scans hourly. It considers open assigned tasks due within 48 hours; tasks assigned shortly before their due date receive best-effort reminders. Pending outbound failures retry without duplicating the in-app row. Delivery is at-least-once around process crashes/provider acknowledgements; this is an in-process queue backed by persisted pending notification state, not a distributed managed broker.

### TLS

HTTP examples are local development only. For an actual deployment, set `TLS_CERT_FILE` and `TLS_KEY_FILE` to a valid certificate/key pair, or use a trusted TLS-terminating proxy with `TRUST_PROXY=1`. Do not expose the app directly with `TRUST_PROXY=1`; only the trusted proxy should reach that listener. HTTPS requests receive HSTS; insecure requests are redirected/rejected. Never deploy with the development JWT secret.

## Tests

```powershell
npm test -- --runInBand
npm ci --prefix web
npm run audit --prefix web
npx playwright install chromium firefox webkit
# Start the application on port 3100 with the dedicated validation database first.
$env:BASE_URL='http://127.0.0.1:3100'
npm run test:browser
# DATABASE_URL must point to the same designated local validation database.
$env:SMTP_HOST='127.0.0.1'
$env:SMTP_PORT='1026'
npm run validate:system
```

`validate:system` starts/kills/restarts its own server on port 3101 and records actual PostgreSQL/SMTP/API results. It uses fresh synthetic `.test` accounts. `test:browser` also adds synthetic accounts/projects and needs `DATABASE_URL` for admin-role fixture setup. Do not point either command at production.

OpenSSL must be on PATH to execute the direct HTTPS case. On this Windows machine, Git's bundled `C:\Program Files\Git\usr\bin` was added to the test process PATH. The original TLS test silently returns if OpenSSL is unavailable, so inspect the log rather than relying on the green test count alone.

## Performance

Use two fresh, dedicated PostgreSQL databases, one for load and one for scaling. Set `DATABASE_URL` for each run, with the same `JWT_SECRET` inherited by the generated API process. Avoid other heavy work when comparing latency. For machine-readable output set `PERF_REPORT_FILE` to a writable JSON path.

```text
npm run perf:load -- --users 100 --duration 600 --think 1000
npm run perf:scale -- --requests 12000
```

The load case runs for at least ten minutes, with 100 virtual users, a one-second mean think time, and a read/write/search mix. The scalability case compares the same 20 active users at 1,000 users/10,000 tasks and 10,000 users/100,000 tasks. A shared development machine is not a production capacity guarantee. Raw failed and final runs are retained separately.

## Videos and historical reconstruction

- `docs/videos/Sprint_1_One_Minute.webm`: real API calls to historical commit `ea72d56`, shown in a separate recording viewer. That revision has static web placeholders; the video does not claim an integrated historical UI.
- `docs/videos/Sprint_2_Two_Minutes.webm`: connected final application at the implementation commit documented in its capture metadata.
- `scripts/validation/record-videos.js` provides repeatable recording. Both videos state their actual capture date and source revision; they are not backdated.

See `../Submission_Timeline.md` for source/capture chronology, `REMAINING_OBSERVATIONS.md` for human/time/platform checks, and the four report files under `docs/` for outcomes.

# Observations requiring people, elapsed time or another platform

These acceptance requirements come from the unchanged original SRS and Test Plan. They must not be replaced by invented observations or automated agents posing as people.

## TC-22 / NFR-03: five first-time participants

Status: **NOT RUN**. The application workflow is automated-tested, but automated timings are not human usability evidence.

1. Recruit at least five people who have not used this application. Do not use the developers as participants.
2. Before each session, register a teammate account and a project. After the participant registers, the facilitator may prepare the specified project membership as setup, without coaching task creation/assignment. Use a separate participant session and document this preparation.
3. Give the participant the login-page URL and this prompt: "Create an account, create a task named Review report in the supplied project, and assign it to the supplied teammate. You have three minutes. I cannot help you."
4. Start a stopwatch at first interaction. Record whether registration, creation and assignment completed, the seconds elapsed and any assistance.
5. Fill `usability-results.csv` with actual observations only. Run `node docs/usability/score.js docs/validation/usability-results.csv`. At least five valid participants and 80% completion within 180 seconds without assistance are required.
6. Save the scored output and facilitator/date information in `docs/validation/evidence/`. Do not publish personal participant identifiers or recordings without consent; anonymous P1-P5 are enough for the results.

## TC-21 / NFR-02: full-calendar-month availability

Status: **NOT ESTABLISHED**. A short local readiness sample is included separately and does not establish a full month's 99.5% uptime.

Run the monitor from a machine external to the deployed application, keeping it running over a complete calendar month:

```text
MONITOR_URL=https://YOUR_DEPLOYED_HOST/ready
MONITOR_FILE=docs/validation/evidence/uptime-samples.jsonl
node scripts/validation/monitor.js
```

Set environment variables in the syntax for your shell. Default interval is 60 seconds. Record announced maintenance windows separately. At month end calculate successful non-maintenance probes / all non-maintenance probes * 100, report gaps in monitoring, and retain the raw samples. Local tests cannot recover a missing historical month.

## TC-25 / NFR-07: exact released-browser/version matrix

Status: **PARTIAL**. The repeatable Playwright run covers Chromium, Firefox and WebKit engines on Windows. Engine testing does not establish the latest two branded Chrome, Firefox and Safari releases; WebKit on Windows is not Safari.

Run the supplied workflow on each actual version and save the version/device/date, outcome and screenshot. Safari needs macOS/iOS or a remote browser service. No remote browser account was available in this task. Do not silently relabel engine results as Safari results.

| Browser/version | Device/OS | Date | Register/login | Create/edit/assign/comment | Search/filter/dashboard | Keyboard/360px | Evidence |
|---|---|---|---|---|---|---|---|
| Chrome current | | | | | | | |
| Chrome previous | | | | | | | |
| Firefox current | | | | | | | |
| Firefox previous | | | | | | | |
| Safari current | | | | | | | |
| Safari previous | | | | | | | |

## Scope preservation

The initial `docs/SRS.docx`, `docs/Architecture_and_Design_Spec.docx` and `Test_Plan.docx` are preserved byte-for-byte. This task does not create sprint videos, rewrite GitHub planning/history, backdate reviews or claim any of these external acceptance observations passed.

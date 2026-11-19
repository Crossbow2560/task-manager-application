# Acceptance follow-up (2026-11-19)

This record distinguishes actions completed during the follow-up from acceptance evidence that still needs external participants, time, or platforms. It supplements the original SRS, Test Plan, and SAD; it does not change their requirements.

## PR owner reviews

Repository owner `Crossbow2560` merged the five original contributor PRs. A retrospective approval was added on 2026-11-19 to PRs #29, #30, and #31 by the repository owner account available for this review. GitHub rejected owner approvals on #28 and #32 because GitHub prohibits approving one's own pull request. Those two still need approval from another collaborator if formal review records are required. These present-day reviews are not represented as having occurred before the 2026-11-02 merges.

## TC-22 / NFR-03 usability

Status: **WAITING FOR FIVE REAL PARTICIPANTS**. The result template remains blank. No participant results have been invented. Run five first-time, non-team participants using the instructions in `docs/usability/USABILITY_TEST_PLAN.md`, write their actual anonymous observations to `docs/validation/usability-results.csv`, and score it with `node docs/usability/score.js docs/validation/usability-results.csv`. At least four of five must complete independently within 180 seconds.

## TC-21 / NFR-02 availability

Status: **MONITOR READY; MONTH NOT YET OBSERVED**. `scripts/validation/monitor.js` appends timestamped readiness observations. Start it from a machine external to the deployed host and keep it running for a complete calendar month. Set `MONITOR_URL`, `MONITOR_FILE`, and optionally `MONITOR_INTERVAL_MS`; see `docs/validation/REMAINING_OBSERVATIONS.md`. The existing 25 local probes are not month-long or external availability evidence.

## TC-25 / NFR-07 branded browser matrix

Status: **PARTIAL; CURRENT MACHINE LIMITS**. Captured Playwright runs use Chromium, Firefox, and WebKit engines, and do not establish the latest two branded Chrome, Firefox, and Safari versions. A current branded Chrome installation is available, but this machine has no local Firefox or Safari/macOS. The checked-in `scripts/validation/browser-matrix.js` records actual manually verified browser outcomes without converting missing runs into passes. Each actual version/OS combination should be tested and its evidence recorded. Safari needs Apple hardware or an appropriate remote browser service.

No browser result is inferred from a version number alone: execute and observe the workflows before recording `PASS`. Use `NOT_RUN` for scenarios not exercised.

## Reviewer evidence

See the live GitHub review timelines for PRs [#29](https://github.com/Crossbow2560/task-manager-application/pull/29), [#30](https://github.com/Crossbow2560/task-manager-application/pull/30), and [#31](https://github.com/Crossbow2560/task-manager-application/pull/31). PRs [#28](https://github.com/Crossbow2560/task-manager-application/pull/28) and [#32](https://github.com/Crossbow2560/task-manager-application/pull/32) require a reviewer other than their author.

# Submission timeline and evidence provenance
+
+All dates below come from Git or the actual validation/recording run. **No commit, test report or video has been backdated.** Original source chronology and retrospective capture chronology are separate.
+
+## Source chronology
+
+| Commit | Actual commit date/time | Event |
+|---|---|---|
+| `d6524605` | 29 Sep 2026, 20:08:37 IST | doc: architecture and design specs |
| `1f526885` | 29 Sep 2026, 20:27:15 IST | Add SRS document |
| `ee7d9f60` | 29 Sep 2026, 21:18:23 IST | Add files via upload |
| `ea72d56a` | 02 Nov 2026, 23:37:26 IST | Merge pull request #31 from Crossbow2560/crossbow2560/work |
| `c2a652c4` | 03 Nov 2026, 00:04:12 IST | Merge pull request #32 from Crossbow2560/is-stuthi/phase2 |
| `8514b64f` | 17 Nov 2026, 12:41:02 IST | Connect task manager web workflows and add reproducible validation |
| `aac6f756` | 17 Nov 2026, 12:45:52 IST | Frame completed task boards clearly in submission videos |
+
+The Part 1 handout gives 28 September 2026 as its ETA, and Part 3 specifies testing during 2-6 November. Existing Git timestamps are preserved as they are; newly captured evidence is dated 17 November and is not represented as work captured during an earlier deadline window.
+
+## Historical restoration and return to HEAD
+
+1. Preserved the initial documents and their SHA-256 hashes.
+2. Committed the connected application and validation tools at `8514b64`.
+3. Restored `ea72d56` in an isolated detached worktree, using a separate real PostgreSQL database. This was selected because it integrates all three contributors' Sprint 1 core task features. No Sprint 1 tag exists, and this source also contains some later-sprint work; it is a declared reconstruction boundary, not a fabricated historical release tag.
+4. Executed its original suite: **135 tests / 20 suites passed**. Captured the one-minute API demonstration from that restored code. That revision has static web placeholders, so the separate response viewer is labelled as a recording aid rather than an old application UI.
+5. Captured the final connected browser application and tested it against real PostgreSQL, SMTP, browser engines and crash recovery. The application implementation is `8514b64`; `aac6f75` improves only the recording framing.
+6. Returned the historical worktree to `aac6f75` after capture. The primary checkout remained on the final implementation throughout, preventing loss of finished changes. Both worktrees were back at the current code head before report packaging.
+7. Committed the reports, evidence, videos and this timeline afterward. A documentation/media packaging commit does not imply the tests ran against a different application implementation.
+
+## Capture chronology
+
+| Artifact | Source revision | Actual recording date/time | Verified final duration |
+|---|---|---|---:|
+| Sprint 1 API reconstruction | `ea72d56a9c0c16a1f618cb8b218eac64f18d000d` | 17 Nov 2026, 12:41:20 IST | 60 seconds |
+| Sprint 2 connected application | `8514b64f586d9d3288483ede2adb81b1850a04b8` | 17 Nov 2026, 12:45:00 IST | 120 seconds |
+
+Backend, browser, real-database and benchmark JSON/logs contain their own actual run timestamps. Earlier failed benchmark evidence is retained beside the final reruns. The manifest binds source/evidence hashes, and the four final reports summarize those actual results.
+
+## Contents ready for review
+
+- [Unit Test Report](Unit_Test_Report.md)
+- [System Validation Report](System_Validation_Report.md)
+- [Code Coverage Report](Code_Coverage_Report.md)
+- [Branch Coverage Report](Branch_Coverage_Report.md)
+- [One-minute and two-minute videos](videos/README.md)
+- [Reproduction instructions](validation/RUN_AND_VALIDATE.md)
+- [Implementation differences without changing original documents](validation/IMPLEMENTATION_NOTES.md)
+- [Remaining genuine human/time/platform observations](validation/REMAINING_OBSERVATIONS.md)
+
+GitHub planning, story ownership and formal review history were not rewritten. Missing genuine human observations, a full calendar month's uptime and exact branded Safari/version tests are disclosed; neither a historical checkout nor a video can manufacture them.
+
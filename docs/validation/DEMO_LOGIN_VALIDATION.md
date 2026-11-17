# One-click local demo login validation

## Current email-field account chooser

The standalone account-button section has been removed. The regular login form remains visible, and clicking/focusing the email field opens a compact account list. Choosing a role signs in through the same guarded endpoint. Ordinary email typing still supports manual password login. The chooser filters typed text, supports arrow keys/Enter/Escape, and closes on focus/click outside it.

Current browser validation: **21/21 scenarios passed** across Chromium, Firefox and WebKit (five role logins, keyboard/filter/dismiss interaction, and manual-email flow in each engine). Login-page accessibility was audited with the chooser open. See `evidence/account-picker-browser.log`; the adjacent login screenshot shows the current chooser. The earlier button-layout validation below is retained as historical evidence.

This is an incremental validation note for the demo-login addition. The four original captured final reports remain tied to their documented source/run; this note does not claim that their performance benchmarks were rerun for this UI convenience feature.

- Full backend regression: **184 tests / 25 suites passed**, with direct TLS tests enabled through OpenSSL on PATH.
- Targeted authentication checks: **18 passed**, including normal login and shortcut guards.
- Chromium browser tests: **5 passed**, one actual one-click login for each prepared account; verified identity, admin navigation and project visibility.
- Rendered login page accessibility: zero critical/serious WCAG A/AA violations in the browser audit.
- Manual browser check: Demo Admin button opened the authenticated dashboard with Administration access.

Shortcuts are disabled by default, disabled in production mode, require the dedicated local `taskmanager_demo` database and a server-side demo password, and accept loopback connections only. The demo starter binds the server to 127.0.0.1. Neither the account-list API nor static assets expose the demo password. Only the five fixed synthetic accounts may be selected. Actual login still uses bcrypt, failed-login hooks and active-account checks.

The regular password login/registration flow remains available. A deactivated demo account remains blocked rather than being silently reactivated by a button. Restore synthetic accounts through the explicit demo reset only when appropriate.

Evidence: `evidence/demo-login-browser.log`, `evidence/demo-login-regression.log` and `evidence/demo-login-preview.png`. To repeat the browser check against the running local demo, set `LOCAL_DEMO_UI=1` and run `npx playwright test e2e/demo-login.spec.js --project=chromium --reporter=list`.

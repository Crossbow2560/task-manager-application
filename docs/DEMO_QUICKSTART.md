# Run and present the prepared demo

The prepared fixture uses a separate local PostgreSQL database named `taskmanager_demo`. It does not overwrite the validation database or the original SRS/SAD/Test Plan. Accounts and sample tasks are local data; seed them on another machine rather than expecting a Git clone to contain database rows.

## Start

Open Docker Desktop and wait for its engine. In PowerShell, from the repository directory:

```powershell
.\scripts\start-demo.ps1
```

Enter a demo-only password when prompted. First use creates five accounts and a sample project. Later starts preserve existing passwords/data. The starter checks dependencies, starts or creates the dedicated local PostgreSQL/Mailpit containers, initializes the demo database and runs the app on port 3100. It refuses to start a second server on an occupied port. Keep its terminal open; Ctrl+C stops the app.

Open `http://localhost:3100/login.html`; the local email inbox is `http://localhost:8026`.

The login page now has **Try a demo account** buttons. Click **Demo Admin** for the main presentation, or pick another role. No typing or separate submit is needed. The starter enables these shortcuts only for the dedicated local demo database and binds the demo server to loopback. Normal password login/registration remains available. Production mode disables the shortcut endpoints; passwords are not sent to the frontend or embedded in its assets.

| Login | Purpose |
|---|---|
| admin@demo.test | Main presentation account: global admin plus owner/Team Manager of the sample project |
| manager@demo.test | Project Team Manager without global admin access |
| member@demo.test | Assigned teammate: edit/status/comment, with stricter delete permissions |
| temporary@demo.test | Spare registered user for add/remove-member and deactivate demonstrations |
| outsider@demo.test | User outside the project for unauthorized-access demonstrations |

Passwords are supplied locally during seeding, not embedded in this repository's code. Each account receives its own bcrypt salt. The current user's local handoff file contains the initialized demo password.

## Presentation order (about 5-8 minutes)

1. Log in as `admin@demo.test`. Open Dashboard: four sample tasks across all three statuses.
2. Open **Website Release - Demo**. Show task columns and mixed priorities.
3. Open **Review homepage**: show fields, assignees and existing comment. Edit/save, then refresh to show persistence.
4. Create a fresh task. Set priority/date, assign **Demo Teammate**, and add a comment.
5. In a separate browser/private session, log in as `member@demo.test`. Open the task and change its status. Refresh the admin board to show the update. This app uses request/reload updates rather than WebSockets.
6. Search/filter the board by keyword, status, priority, assignee and date. Clear filters afterward.
7. Show the dashboard counts after a status change.
8. Open Notifications as admin and teammate. The seeded Review homepage task has a due date around two days ahead and is assigned to both. The demo scheduler checks every five seconds. Show the matching captured SMTP message in Mailpit; this is local capture, not an external mailbox.
9. As admin, add `temporary@demo.test` in Project members, then remove it to show membership controls.
10. Delete **Disposable task - delete me** as admin. Use this spare instead of destroying the main example. An assignee alone cannot delete a task they do not own/manage.
11. Open **Administration** as admin; deactivate **Temporary Demo User**. Do this last and keep the main demo account active.
12. Open the four reports under docs/, GitHub CI and the contribution PR. Explain the observed results and the remaining human/month-long/exact-version acceptance observations.

For live registration, use a new email once, then return to the prepared main account. A newly registered account starts with no sample-project membership and is not an administrator.

## Restore before another rehearsal

Stop the server with Ctrl+C, then:

```powershell
.\scripts\start-demo.ps1 -ResetDemo
```

This explicitly restores the synthetic demo users/passwords/active status, clears their login locks, recreates the four sample tasks/memberships/comments and refreshes sample due dates. It resets the seeded sample project's work; it does not reset other databases. Only run it when you want to discard changes to that synthetic sample project.

## Useful commands and common issues

| Need / symptom | Action |
|---|---|
| Run backend test evidence live | `npm test -- --runInBand` in a second terminal; allow roughly a minute |
| Show browser/system/performance evidence | Open the committed reports and logs; these specialized reruns need the dedicated validation environment, not the demo database |
| Port 3100 already occupied | The app may already be running. Open its URL; stop the existing server before restarting |
| Docker engine unavailable | Open Docker Desktop and wait until it is running |
| Password rejected after changing seed input | Existing accounts keep their password unless an explicit demo reset is requested |
| Account locked after repeated wrong passwords | Wait 15 minutes or explicitly reset this synthetic demo fixture |
| Session expired | Log in again; access tokens last 15 minutes by default |
| Another user sees stale task status | Refresh their view |
| Reminder not appearing | Use an open, assigned task due about two days ahead; allow a scan and reload Notifications |
| Main app works, email does not | Check the Mailpit container and SMTP variables; in-app notification and SMTP are separate observations |

The shortcut and initialized credentials supplied in the local handoff are for this development machine. They are not production deployment credentials.

# Final implementation notes and disclosed differences

This file supplements validation evidence. It does not replace or alter the initial SRS, SAD or Test Plan.

| Design statement / intended capability | Implemented and validated state |
|---|---|
| Next.js/React single-page client | Same-origin plain HTML/JavaScript client served by Express; real API-connected workflows are implemented. |
| Managed queue and distributed services | Modular routes in one Node process; in-process notification queue with persisted pending notification state. A distributed managed broker is not deployed. |
| CDN/load balancer/managed database deployment view | Validation used a local Node server and real PostgreSQL 16.16 in Docker. A public production deployment is not claimed. |
| Email/push outbound provider | SMTP delivery is implemented and exercised with a local Mailpit sink. In-app reminders work without SMTP. No real external email/push service account is represented as configured. |
| Admin deactivate path in SAD uses POST | The implemented client/API use `PATCH /admin/users/:id/deactivate`. |
| Task assignments in combined PATCH contract | Assignments use `POST /tasks/:id/assignees` and `DELETE /tasks/:id/assignees/:userId`; the client uses these endpoints. |
| Comments included in task GET | Comments use separate GET/POST endpoints; the detail page loads the task, assignees and comments. |
| Error catalog includes optimistic-update conflicts and general endpoint throttling | Implemented validation/auth/RBAC/not-found/duplicate/lockout errors are tested. Optimistic concurrent-edit conflict detection, general route rate limiting, and correlation IDs are not represented as implemented. |
| Sequence diagram rejects past due dates | Current task APIs accept valid calendar dates, including past dates; they do not implement that diagram-only restriction. |
| Reminder always at least 24 hours early | Scanner uses a 48-hour lookahead and an hourly default schedule. New/late assignments less than 24 hours before due time are best effort; no impossible retroactive notification is claimed. |
| Nightly staging performance testing | Reproducible local performance scripts and captured runs are supplied. The existing CI is unchanged; no nightly hosted staging job is represented as configured. |
| Complete standards/acceptance assurance | Original document contents are preserved. Reports identify actual tested scope and the remaining human, month-long uptime and exact branded-browser observations. |

Changes made for final connection/validation: served frontend; real registration/login/session/profile; project/member/user selectors; task CRUD, assignments, status, comments, search/filter/dashboard/notification/admin flows; existing-session deactivation enforcement; failed-notification retry persistence; calendar-date serialization; reproducible real-database/system/browser/monitor/video capture tools. These changes do not revise project-board history, original document contents, or historical commit dates.

# Availability plan (NFR-02: 99.5% per calendar month)

99.5% allows about 3 hours 36 minutes of unplanned downtime in a 30-day month (0.5% of 720 h).

| Measure | How |
|---|---|
| Health checks | `GET /health` (liveness) and `GET /ready` (readiness, checks the database). Point the load balancer and container health check at `/ready`. |
| Automatic restart | Run the API under a process manager or orchestrator with a restart policy (for example `restart: unless-stopped` in Docker Compose, or a Kubernetes Deployment with a liveness probe on `/health`). |
| No single instance | Run at least 2 API instances behind the load balancer; take an instance out of rotation when `/ready` returns 503. |
| Database | Managed PostgreSQL with automated backups and a standby replica. Crash-recovery behaviour is covered by NFR-06 (#23). |
| Monitoring | An external uptime monitor polls `/ready` every minute; availability = successful checks / total checks, excluding announced maintenance windows. Alert after 3 consecutive failures. |
| Planned maintenance | Announce windows in advance; they are excluded from the 99.5% figure. |

Verification: the uptime monitor's monthly report, plus the automated tests for `/health` and `/ready` in `services/ops/health/`.

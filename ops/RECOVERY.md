# NFR-06: Reliability / crash recovery (#23)

**Requirement:** no committed task data is lost after a single application-server crash, verified by a recovery test that restarts the server and confirms data integrity.

## Why the design meets it

- The API servers are stateless. Every task, assignment, status change and comment is written to PostgreSQL before the API answers `201`/`200`. Nothing is held in server memory or only in a queue.
- Each write is a single SQL statement (one `INSERT` or `UPDATE`), so it is atomic: after a crash a row is either fully there or not there.
- Durability is Postgres's job. Keep the defaults `fsync = on`, `synchronous_commit = on` and `full_page_writes = on`. The write-ahead log then guarantees an acknowledged commit survives a crash of the application server (and of Postgres itself).
- On restart, `src/server.js` runs `migrate()`, which is idempotent (already-applied files are skipped), then serves requests. There is no recovery step to run.

## Automated test

`tests/recovery/recovery.test.js` (part of `npm test`):

1. Starts the API on a real HTTP socket and fires 30 concurrent task creations.
2. Crashes the server mid-flight by destroying all sockets with no graceful shutdown.
3. Starts a fresh server on the same database.
4. Checks that every task acknowledged with `201` is present with identical fields, and that no stored task is half-written.
5. Checks that status changes, assignees and comments committed before a crash are intact after restart, and that the restarted server accepts new writes.

The test uses in-memory Postgres, so it proves the application layer loses nothing it acknowledged. It cannot prove Postgres's own durability, which is what the manual check below covers.

## Manual check against real PostgreSQL

```bash
export DATABASE_URL=postgres://localhost:5432/taskmanager JWT_SECRET=change-me
npm run migrate && npm start &                 # note the server PID
# register, log in, then create a task through the API and note its id
kill -9 <server PID>                           # simulate the crash
npm start &                                    # restart
# GET /tasks/<id> with the same token: the task must still be there, fields unchanged
```

Expected: every task the API acknowledged before the `kill -9` is returned after restart.

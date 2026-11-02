// NFR-06 (#23): no committed task data may be lost after a single application-server crash.
// A "committed" write is one the server acknowledged with 201. The test crashes the server while
// writes are in flight (sockets destroyed, no graceful shutdown), starts a fresh server on the
// same database, and checks every acknowledged task is intact and no half-written task exists.
// Runs against in-memory Postgres; see ops/RECOVERY.md for the same check against a real
// Postgres with `kill -9`.
const http = require('http');
const request = require('supertest');
const db = require('../../src/db');
const { createApp } = require('../../src/app');
const { setupApp } = require('../helpers');
const { signup, createProject } = require('../support/fixtures');

const start = (app) => new Promise((resolve) => {
  const server = http.createServer(app).listen(0, () => resolve(server));
});
const crash = (server) => new Promise((resolve) => {
  server.closeAllConnections(); // drop sockets immediately: in-flight requests are cut off, nothing is flushed
  server.close(resolve);
});
const url = (server) => `http://127.0.0.1:${server.address().port}`;

let ann, project;
let server;
beforeAll(async () => {
  const app = await setupApp();
  ann = await signup(app, 'ann@example.com');
  project = await createProject(app, ann);
});
afterEach(() => new Promise((r) => (server && server.listening ? server.close(r) : r())));

test('acknowledged tasks survive a crash during concurrent writes; no partial rows', async () => {
  server = await start(createApp());
  const acknowledged = [];
  const writes = Array.from({ length: 30 }, (_, i) =>
    request(url(server)).post(`/projects/${project.id}/tasks`).set('Authorization', ann.auth)
      .send({ title: `crash-${i}`, description: `body ${i}`, priority: 'high', dueDate: '2026-06-01' })
      .then((r) => { if (r.status === 201) acknowledged.push(r.body); })
      .catch(() => {}), // requests cut off by the crash simply fail
  );
  await new Promise((r) => setTimeout(r, 15));
  await crash(server);
  await Promise.all(writes);

  server = await start(createApp()); // restart
  const listed = (await request(url(server)).get(`/projects/${project.id}/tasks`).set('Authorization', ann.auth)).body;
  const byId = new Map(listed.map((t) => [t.id, t]));

  for (const t of acknowledged) {
    expect(byId.get(t.id)).toMatchObject({ title: t.title, description: t.description, priority: 'high', status: 'todo', projectId: project.id });
  }
  // Every stored task is complete: the crash never leaves a half-written row.
  for (const t of listed) {
    expect(t.title).toMatch(/^crash-\d+$/);
    expect(t.description).toBe(`body ${t.title.split('-')[1]}`);
  }
});

test('tasks, status changes, assignees and comments committed before a crash are intact after restart', async () => {
  server = await start(createApp());
  const auth = ann.auth;
  const api = (method, path, body) => request(url(server))[method](path).set('Authorization', auth).send(body);
  const task = (await api('post', `/projects/${project.id}/tasks`, { title: 'durable' })).body;
  await api('patch', `/tasks/${task.id}/status`, { status: 'done' });
  await api('post', `/tasks/${task.id}/assignees`, { userId: ann.id });
  await api('post', `/tasks/${task.id}/comments`, { body: 'still here' });

  await crash(server);
  server = await start(createApp());

  expect((await api('get', `/tasks/${task.id}`)).body).toMatchObject({ title: 'durable', status: 'done' });
  expect((await api('get', `/tasks/${task.id}/assignees`)).body.map((a) => a.userId)).toEqual([ann.id]);
  expect((await api('get', `/tasks/${task.id}/comments`)).body.map((c) => c.body)).toEqual(['still here']);
});

test('the restarted server accepts new writes and the old data stays consistent', async () => {
  server = await start(createApp());
  const before = (await db.query('SELECT count(*) AS n FROM tasks')).rows[0].n;
  const r = await request(url(server)).post(`/projects/${project.id}/tasks`).set('Authorization', ann.auth).send({ title: 'after restart' });
  expect(r.status).toBe(201);
  expect(Number((await db.query('SELECT count(*) AS n FROM tasks')).rows[0].n)).toBe(Number(before) + 1);
});

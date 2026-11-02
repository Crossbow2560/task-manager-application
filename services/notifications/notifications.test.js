const request = require('supertest');
const db = require('../../src/db');
const { setupApp } = require('../../tests/helpers');
const { signup, createProject, addMember, createTask } = require('../../tests/support/fixtures');
const reminders = require('./reminders');
const provider = require('./provider');
const { createQueue, MAX_ATTEMPTS } = require('./queue');

let app, ann, bob, project;
const sent = [];
const NOW = new Date('2026-11-10T10:00:00Z');

async function assigned(title, dueDate, assignee = bob) {
  const t = await createTask(app, ann, project.id, { title, dueDate });
  await request(app).post(`/tasks/${t.id}/assignees`).set('Authorization', ann.auth).send({ userId: assignee.id });
  return t;
}

beforeAll(async () => {
  app = await setupApp();
  ann = await signup(app, 'ann@example.com');
  bob = await signup(app, 'bob@example.com');
  project = await createProject(app, ann);
  await addMember(app, ann, project.id, bob);
  provider.setProvider({ send: async (m) => { sent.push(m); } });
});

test('only open, assigned tasks inside the lead window are picked up', async () => {
  const soon = await assigned('Soon', '2026-11-12');
  await assigned('Far', '2026-11-20');
  await assigned('Past', '2026-11-01');
  const done = await assigned('Done', '2026-11-11');
  await request(app).patch(`/tasks/${done.id}/status`).set('Authorization', ann.auth).send({ status: 'done' });
  await createTask(app, ann, project.id, { title: 'Unassigned', dueDate: '2026-11-11' });
  const pending = await reminders.findPending(NOW);
  expect(pending.map((p) => p.task_id)).toEqual([soon.id]);
});

test('queue delivers once per assignee, in-app and via provider, and is idempotent', async () => {
  reminders.queue.start(reminders.deliver);
  expect(await reminders.scanAndEnqueue(NOW)).toBe(1);
  await reminders.queue.drain();
  expect(sent).toHaveLength(1);
  expect(sent[0]).toMatchObject({ to: 'bob@example.com' });
  expect(sent[0].body).toMatch(/"Soon" is due on 2026-11-12/);
  expect(await reminders.scanAndEnqueue(NOW)).toBe(0);
  // duplicate job (e.g. retry) does not notify twice
  await reminders.deliver({ taskId: 1, userId: bob.id, email: bob.email, title: 'Soon', dueDate: '2026-11-12' });
  expect(sent).toHaveLength(1);
});

test('GET /notifications is per-user; mark read', async () => {
  const mine = await request(app).get('/notifications').set('Authorization', bob.auth);
  expect(mine.body).toHaveLength(1);
  expect(mine.body[0]).toMatchObject({ kind: 'due_reminder', read: false });
  expect((await request(app).get('/notifications').set('Authorization', ann.auth)).body).toEqual([]);
  expect((await request(app).get('/notifications')).status).toBe(401);
  const id = mine.body[0].id;
  expect((await request(app).post(`/notifications/${id}/read`).set('Authorization', ann.auth)).status).toBe(404);
  expect((await request(app).post('/notifications/abc/read').set('Authorization', bob.auth)).status).toBe(404);
  const r = await request(app).post(`/notifications/${id}/read`).set('Authorization', bob.auth);
  expect(r.body.read).toBe(true);
});

test('deactivated assignees are not reminded', async () => {
  await assigned('Later', '2026-11-12', ann);
  await db.query('UPDATE users SET is_active = false WHERE id = $1', [ann.id]);
  expect(await reminders.findPending(NOW)).toEqual([]);
});

describe('queue', () => {
  test('retries failed jobs then drops them', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const q = createQueue();
    let calls = 0;
    await q.start(async () => { calls += 1; throw new Error('smtp down'); });
    q.enqueue({ a: 1 });
    await q.drain();
    await new Promise((r) => setImmediate(r));
    expect(calls).toBe(MAX_ATTEMPTS);
    expect(q.size()).toBe(0);
  });

  test('job succeeds on retry', async () => {
    const q = createQueue();
    let calls = 0;
    await q.start(async () => { calls += 1; if (calls < 2) throw new Error('x'); });
    q.enqueue({});
    await q.drain();
    expect(calls).toBe(2);
  });
});

test('scheduler starts, scans and can be stopped', async () => {
  const t = reminders.startScheduler();
  clearInterval(t);
  await reminders.queue.drain();
});

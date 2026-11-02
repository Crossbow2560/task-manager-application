const request = require('supertest');
const { setupApp } = require('../../tests/helpers');
const { signup, createProject, addMember, createTask } = require('../../tests/support/fixtures');

let app, ann, bob, cat;
const dash = (as) => request(app).get('/dashboard').set('Authorization', as.auth);
const setStatus = (as, id, status) => request(app).patch(`/tasks/${id}/status`).set('Authorization', as.auth).send({ status });

beforeAll(async () => {
  app = await setupApp();
  ann = await signup(app, 'ann@example.com');
  bob = await signup(app, 'bob@example.com');
  cat = await signup(app, 'cat@example.com');
});

test('requires auth', async () => {
  expect((await request(app).get('/dashboard')).status).toBe(401);
});

test('empty dashboard has zero for every status', async () => {
  expect((await dash(ann)).body).toEqual({ total: 0, byStatus: { todo: 0, in_progress: 0, done: 0 } });
});

test('counts per status for the caller\'s projects only', async () => {
  const p1 = await createProject(app, ann, 'P1');
  await addMember(app, ann, p1.id, bob);
  const t1 = await createTask(app, ann, p1.id);
  const t2 = await createTask(app, ann, p1.id);
  await createTask(app, ann, p1.id);
  await setStatus(ann, t1.id, 'done');
  await setStatus(ann, t2.id, 'in_progress');
  const p2 = await createProject(app, cat, 'P2');
  await createTask(app, cat, p2.id);

  const expected = { total: 3, byStatus: { todo: 1, in_progress: 1, done: 1 } };
  expect((await dash(ann)).body).toEqual(expected);
  expect((await dash(bob)).body).toEqual(expected);
  expect((await dash(cat)).body).toEqual({ total: 1, byStatus: { todo: 1, in_progress: 0, done: 0 } });
});

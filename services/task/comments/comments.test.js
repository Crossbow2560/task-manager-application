const request = require('supertest');
const { setupApp } = require('../../../tests/helpers');
const { signup, createProject, addMember, createTask } = require('../../../tests/support/fixtures');
const { MAX_LENGTH } = require('./routes');

let app, ann, bob, eve, project, task;
const post = (as, body, id = task.id) => request(app).post(`/tasks/${id}/comments`).set('Authorization', as.auth).send(body);
const list = (as, id = task.id) => request(app).get(`/tasks/${id}/comments`).set('Authorization', as.auth);

beforeAll(async () => {
  app = await setupApp();
  ann = await signup(app, 'ann@example.com');
  bob = await signup(app, 'bob@example.com');
  eve = await signup(app, 'eve@example.com');
  project = await createProject(app, ann);
  await addMember(app, ann, project.id, bob);
  task = await createTask(app, ann, project.id);
});

test('requires auth', async () => {
  expect((await request(app).post(`/tasks/${task.id}/comments`).send({ body: 'hi' })).status).toBe(401);
  expect((await request(app).get(`/tasks/${task.id}/comments`)).status).toBe(401);
});

test('project members can comment; comments list in order with author', async () => {
  const a = await post(ann, { body: '  First  ' });
  expect(a.status).toBe(201);
  expect(a.body).toMatchObject({ taskId: task.id, authorId: ann.id, body: 'First' });
  await post(bob, { body: 'Second' });
  const r = await list(bob);
  expect(r.status).toBe(200);
  expect(r.body.map((c) => [c.authorId, c.body])).toEqual([[ann.id, 'First'], [bob.id, 'Second']]);
});

test('a non-member can neither comment nor read comments (403)', async () => {
  expect((await post(eve, { body: 'sneaky' })).status).toBe(403);
  expect((await list(eve)).status).toBe(403);
  expect((await list(ann)).body.some((c) => c.body === 'sneaky')).toBe(false);
});

test.each([[{}], [{ body: '' }], [{ body: '   ' }], [{ body: 5 }], [{ body: 'x'.repeat(MAX_LENGTH + 1) }]])('invalid body %#', async (body) => {
  const r = await post(ann, body);
  expect(r.status).toBe(400);
  expect(r.body.error.details).toHaveProperty('body');
});

test('unknown task gives 404', async () => {
  expect((await post(ann, { body: 'x' }, 9999)).status).toBe(404);
  expect((await list(ann, 9999)).status).toBe(404);
});

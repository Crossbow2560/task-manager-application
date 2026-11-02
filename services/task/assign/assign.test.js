const request = require('supertest');
const { setupApp } = require('../../../tests/helpers');
const { signup, createProject, addMember, createTask } = require('../../../tests/support/fixtures');

let app, ann, bob, cat, dan, project, task;
const post = (as, body, id = task.id) => request(app).post(`/tasks/${id}/assignees`).set('Authorization', as.auth).send(body);

beforeAll(async () => {
  app = await setupApp();
  ann = await signup(app, 'ann@example.com');
  bob = await signup(app, 'bob@example.com');
  cat = await signup(app, 'cat@example.com');
  dan = await signup(app, 'dan@example.com');
  project = await createProject(app, ann);
  await addMember(app, ann, project.id, bob);
  await addMember(app, ann, project.id, cat);
  task = await createTask(app, ann, project.id);
});

test('requires auth', async () => {
  expect((await request(app).post(`/tasks/${task.id}/assignees`).send({ userId: bob.id })).status).toBe(401);
});

test('assigns one member, then several at once; repeats are ignored', async () => {
  const one = await post(ann, { userId: bob.id });
  expect(one.status).toBe(201);
  expect(one.body.map((a) => a.userId)).toEqual([bob.id]);
  const many = await post(ann, { userIds: [bob.id, cat.id, cat.id] });
  expect(many.body.map((a) => a.userId)).toEqual([bob.id, cat.id]);
  const list = await request(app).get(`/tasks/${task.id}/assignees`).set('Authorization', ann.auth);
  expect(list.body).toHaveLength(2);
});

test('cannot assign a user who is not a project member, or does not exist', async () => {
  const outsider = await post(ann, { userId: dan.id });
  expect(outsider.status).toBe(400);
  expect(outsider.body.error.details).toHaveProperty('userIds');
  expect((await post(ann, { userId: 9999 })).status).toBe(404);
});

test('validation: missing or malformed ids give 400', async () => {
  for (const body of [{}, { userId: 'x' }, { userIds: [] }, { userIds: [1, 'a'] }, { userId: -1 }]) {
    expect((await post(ann, body)).status).toBe(400);
  }
});

test('an unrelated project member cannot assign; an assignee can', async () => {
  const t = await createTask(app, ann, project.id, { title: 'Other' });
  expect((await post(bob, { userId: cat.id }, t.id)).status).toBe(403);
  await post(ann, { userId: bob.id }, t.id);
  expect((await post(bob, { userId: cat.id }, t.id)).status).toBe(201);
});

test('unknown task gives 404', async () => {
  expect((await post(ann, { userId: bob.id }, 9999)).status).toBe(404);
});

test('unassign removes the assignee; missing assignee gives 404', async () => {
  const t = await createTask(app, ann, project.id, { title: 'Unassign' });
  await post(ann, { userIds: [bob.id, cat.id] }, t.id);
  const del = await request(app).delete(`/tasks/${t.id}/assignees/${bob.id}`).set('Authorization', ann.auth);
  expect(del.status).toBe(204);
  const list = await request(app).get(`/tasks/${t.id}/assignees`).set('Authorization', ann.auth);
  expect(list.body.map((a) => a.userId)).toEqual([cat.id]);
  expect((await request(app).delete(`/tasks/${t.id}/assignees/${bob.id}`).set('Authorization', ann.auth)).status).toBe(404);
  expect((await request(app).delete(`/tasks/${t.id}/assignees/abc`).set('Authorization', ann.auth)).status).toBe(404);
});

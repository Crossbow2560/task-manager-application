const request = require('supertest');
const { setupApp } = require('../../../tests/helpers');
const { signup, createProject, addMember, createTask } = require('../../../tests/support/fixtures');

let app, ann, bob, cat, project, task;
const patch = (as, body, id = task.id) => request(app).patch(`/tasks/${id}/status`).set('Authorization', as.auth).send(body);

beforeAll(async () => {
  app = await setupApp();
  ann = await signup(app, 'ann@example.com');
  bob = await signup(app, 'bob@example.com');
  cat = await signup(app, 'cat@example.com');
  project = await createProject(app, ann);
  await addMember(app, ann, project.id, bob);
  await addMember(app, ann, project.id, cat);
  task = await createTask(app, ann, project.id);
  await request(app).post(`/tasks/${task.id}/assignees`).set('Authorization', ann.auth).send({ userId: bob.id });
});

test('requires auth', async () => {
  expect((await request(app).patch(`/tasks/${task.id}/status`).send({ status: 'done' })).status).toBe(401);
});

test('assignee moves the task through To Do, In Progress and Done', async () => {
  for (const status of ['in_progress', 'done', 'todo']) {
    const r = await patch(bob, { status });
    expect(r.status).toBe(200);
    expect(r.body.status).toBe(status);
  }
});

test('owner and project manager can also change status', async () => {
  expect((await patch(ann, { status: 'done' })).status).toBe(200);
});

test('a member who is not owner, assignee or manager gets 403 and the status is unchanged', async () => {
  const before = (await request(app).get(`/tasks/${task.id}`).set('Authorization', ann.auth)).body.status;
  expect((await patch(cat, { status: 'in_progress' })).status).toBe(403);
  const after = (await request(app).get(`/tasks/${task.id}`).set('Authorization', ann.auth)).body.status;
  expect(after).toBe(before);
});

test.each([[{}], [{ status: 'finished' }], [{ status: 3 }], [{ status: 'DONE' }]])('invalid status %#', async (body) => {
  const r = await patch(bob, body);
  expect(r.status).toBe(400);
  expect(r.body.error.details).toHaveProperty('status');
});

test('unknown task gives 404', async () => {
  expect((await patch(ann, { status: 'done' }, 9999)).status).toBe(404);
});

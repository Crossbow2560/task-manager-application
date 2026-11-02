const request = require('supertest');
const db = require('../../../src/db');
const { setupApp } = require('../../../tests/helpers');

let app, ann, bob, cat, task;
async function signup(email) {
  await request(app).post('/auth/register').send({ email, password: 'Secret123', displayName: email });
  const r = await request(app).post('/auth/login').send({ email, password: 'Secret123' });
  return { id: r.body.user.id, auth: `Bearer ${r.body.accessToken}` };
}
beforeAll(async () => {
  app = await setupApp();
  ann = await signup('ann@example.com'); bob = await signup('bob@example.com'); cat = await signup('cat@example.com');
  const p = (await request(app).post('/projects').set('Authorization', ann.auth).send({ name: 'P' })).body;
  task = (await request(app).post(`/projects/${p.id}/tasks`).set('Authorization', ann.auth).send({ title: 'T' })).body;
  await db.query('INSERT INTO task_assignees (task_id, user_id) VALUES ($1, $2)', [task.id, bob.id]);
});
const patch = (auth, body, id = task.id) => request(app).patch(`/tasks/${id}`).set('Authorization', auth).send(body);

test('requires auth', async () => { expect((await request(app).patch(`/tasks/${task.id}`).send({ title: 'x' })).status).toBe(401); });
test('owner edits all fields', async () => {
  const r = await patch(ann.auth, { title: 'New', description: 'd', dueDate: '2026-12-31', priority: 'LOW', status: 'in_progress' });
  expect(r.status).toBe(200);
  expect(r.body).toMatchObject({ title: 'New', description: 'd', priority: 'low', status: 'in_progress' });
});
test('assignee may edit', async () => { expect((await patch(bob.auth, { status: 'done' })).body.status).toBe('done'); });
test('clearing description and due date', async () => {
  const r = await patch(ann.auth, { description: null, dueDate: null });
  expect(r.body.description).toBeNull();
});
test('other users are forbidden', async () => { expect((await patch(cat.auth, { title: 'x' })).status).toBe(403); });
test('unknown task is 404', async () => { expect((await patch(ann.auth, { title: 'x' }, 9999)).status).toBe(404); expect((await patch(ann.auth, { title: 'x' }, 'abc')).status).toBe(404); });
test.each([[{}], [{ title: '' }], [{ priority: 'urgent' }], [{ status: 'finished' }], [{ dueDate: 'tomorrow' }], [{ description: 5 }]])('invalid body %#', async (b) => {
  expect((await patch(ann.auth, b)).status).toBe(400);
});
test('GET returns task for project members only', async () => {
  expect((await request(app).get(`/tasks/${task.id}`).set('Authorization', ann.auth)).status).toBe(200);
  expect((await request(app).get(`/tasks/${task.id}`).set('Authorization', cat.auth)).status).toBe(403);
  expect((await request(app).get('/tasks/9999').set('Authorization', ann.auth)).status).toBe(404);
});

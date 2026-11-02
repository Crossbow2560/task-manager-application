const request = require('supertest');
const { setupApp } = require('../../../tests/helpers');

let app, ann, bob, project;
async function signup(email) {
  await request(app).post('/auth/register').send({ email, password: 'Secret123', displayName: email });
  const r = await request(app).post('/auth/login').send({ email, password: 'Secret123' });
  return { id: r.body.user.id, auth: `Bearer ${r.body.accessToken}` };
}
beforeAll(async () => {
  app = await setupApp();
  ann = await signup('ann@example.com');
  bob = await signup('bob@example.com');
  project = (await request(app).post('/projects').set('Authorization', ann.auth).send({ name: 'P' })).body;
});
const post = (id, auth, body) => request(app).post(`/projects/${id}/tasks`).set('Authorization', auth).send(body);

test('requires auth', async () => {
  expect((await request(app).post(`/projects/${project.id}/tasks`).send({ title: 'x' })).status).toBe(401);
});
test('creates a task with defaults', async () => {
  const r = await post(project.id, ann.auth, { title: '  Write docs ' });
  expect(r.status).toBe(201);
  expect(r.body).toMatchObject({ title: 'Write docs', priority: 'medium', status: 'todo', creatorId: ann.id, projectId: project.id });
});
test('accepts description, due date and priority', async () => {
  const r = await post(project.id, ann.auth, { title: 'T', description: 'd', dueDate: '2026-12-01', priority: 'High' });
  expect(r.status).toBe(201);
  expect(r.body).toMatchObject({ description: 'd', priority: 'high' });
});
test('non-member is forbidden', async () => {
  expect((await post(project.id, bob.auth, { title: 'T' })).status).toBe(403);
});
test('unknown project is 404', async () => {
  expect((await post(9999, ann.auth, { title: 'T' })).status).toBe(404);
  expect((await post('abc', ann.auth, { title: 'T' })).status).toBe(404);
});
test.each([[{}], [{ title: '' }], [{ title: 'x'.repeat(201) }], [{ title: 'a', priority: 'urgent' }], [{ title: 'a', dueDate: '12/01/2026' }], [{ title: 'a', description: 5 }]])('invalid body %#', async (b) => {
  expect((await post(project.id, ann.auth, b)).status).toBe(400);
});

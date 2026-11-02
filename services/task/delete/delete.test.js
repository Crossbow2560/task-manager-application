const request = require('supertest');
const db = require('../../../src/db');
const { setupApp } = require('../../../tests/helpers');

let app, ann, bob, cat, project;
async function signup(email) {
  await request(app).post('/auth/register').send({ email, password: 'Secret123', displayName: email });
  const r = await request(app).post('/auth/login').send({ email, password: 'Secret123' });
  return { id: r.body.user.id, auth: `Bearer ${r.body.accessToken}` };
}
beforeAll(async () => {
  app = await setupApp();
  ann = await signup('ann@example.com'); bob = await signup('bob@example.com'); cat = await signup('cat@example.com');
  project = (await request(app).post('/projects').set('Authorization', ann.auth).send({ name: 'P' })).body;
  await db.query("INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, 'member')", [project.id, bob.id]);
});
const mk = async (auth) => (await request(app).post(`/projects/${project.id}/tasks`).set('Authorization', auth).send({ title: 'T' })).body;
const del = (auth, id) => request(app).delete(`/tasks/${id}`).set('Authorization', auth);

test('requires auth', async () => { const t = await mk(ann.auth); expect((await request(app).delete(`/tasks/${t.id}`)).status).toBe(401); });
test('owner can delete, task is gone', async () => {
  const t = await mk(bob.auth);
  expect((await del(bob.auth, t.id)).status).toBe(204);
  expect((await db.query('SELECT 1 FROM tasks WHERE id = $1', [t.id])).rows).toHaveLength(0);
});
test('team manager can delete another member\'s task, with its assignees and comments', async () => {
  const t = await mk(bob.auth);
  await db.query('INSERT INTO task_assignees (task_id, user_id) VALUES ($1, $2)', [t.id, ann.id]);
  await db.query("INSERT INTO comments (task_id, author_id, body) VALUES ($1, $2, 'hi')", [t.id, ann.id]);
  expect((await del(ann.auth, t.id)).status).toBe(204);
  expect((await db.query('SELECT 1 FROM comments WHERE task_id = $1', [t.id])).rows).toHaveLength(0);
});
test('plain member cannot delete someone else\'s task', async () => {
  const t = await mk(ann.auth);
  expect((await del(bob.auth, t.id)).status).toBe(403);
  expect((await del(cat.auth, t.id)).status).toBe(403);
});
test('unknown task is 404', async () => { expect((await del(ann.auth, 9999)).status).toBe(404); expect((await del(ann.auth, 'abc')).status).toBe(404); });

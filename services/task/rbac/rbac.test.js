const request = require('supertest');
const express = require('express');
const db = require('../../../src/db');
const { authorizeTask, RULES } = require('./index');
const { setupApp } = require('../../../tests/helpers');

let app, ann, bob, cat, dan, task;
async function signup(email) {
  await request(app).post('/auth/register').send({ email, password: 'Secret123', displayName: email });
  const r = await request(app).post('/auth/login').send({ email, password: 'Secret123' });
  return { id: r.body.user.id, auth: `Bearer ${r.body.accessToken}` };
}
beforeAll(async () => {
  app = await setupApp();
  ann = await signup('ann@example.com'); bob = await signup('bob@example.com'); cat = await signup('cat@example.com'); dan = await signup('dan@example.com');
  const p = (await request(app).post('/projects').set('Authorization', ann.auth).send({ name: 'P' })).body;
  await db.query("INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, 'member'), ($1, $3, 'member')", [p.id, bob.id, dan.id]);
  task = (await request(app).post(`/projects/${p.id}/tasks`).set('Authorization', dan.auth).send({ title: 'T' })).body; // owner = dan
  await db.query('INSERT INTO task_assignees (task_id, user_id) VALUES ($1, $2)', [task.id, bob.id]);
});
const patch = (u) => request(app).patch(`/tasks/${task.id}`).set('Authorization', u.auth).send({ title: 'x' });
const del = (u, id = task.id) => request(app).delete(`/tasks/${id}`).set('Authorization', u.auth);

test('modify: owner, assignee and team manager allowed; outsider denied', async () => {
  expect((await patch(dan)).status).toBe(200);
  expect((await patch(bob)).status).toBe(200);
  expect((await patch(ann)).status).toBe(200);
  expect((await patch(cat)).status).toBe(403);
});
test('delete: assignee (not owner/manager) is denied, outsider denied, manager allowed', async () => {
  expect((await del(bob)).status).toBe(403);
  expect((await del(cat)).status).toBe(403);
  expect((await del(ann)).status).toBe(204);
});
test('global admin acts as a manager', async () => {
  const p = (await request(app).post('/projects').set('Authorization', bob.auth).send({ name: 'Q' })).body;
  const t = (await request(app).post(`/projects/${p.id}/tasks`).set('Authorization', bob.auth).send({ title: 'T2' })).body;
  const { signTokens } = require('../../../src/middleware/auth');
  const admin = signTokens({ id: cat.id, role: 'admin' }).accessToken;
  expect((await request(app).delete(`/tasks/${t.id}`).set('Authorization', `Bearer ${admin}`)).status).toBe(204);
});
test('rules table', () => {
  const none = { isMember: false, isOwner: false, isAssignee: false, isManager: false };
  expect(RULES.view({ ...none, isMember: true })).toBe(true);
  expect(RULES.view(none)).toBe(false);
  expect(RULES.modify({ ...none, isAssignee: true })).toBe(true);
  expect(RULES.delete({ ...none, isAssignee: true })).toBe(false);
});
test('unknown action throws; missing task is 404', async () => {
  expect(() => authorizeTask('fly')).toThrow();
  const a = express();
  a.use((req, res, next) => { req.user = { id: 1, role: 'member' }; next(); });
  a.get('/t/:id', authorizeTask('view'), (req, res) => res.json({}));
  a.use((err, req, res, next) => res.status(err.status || 500).json({}));
  expect((await request(a).get('/t/abc')).status).toBe(404);
  expect((await request(a).get('/t/9999')).status).toBe(404);
});

const request = require('supertest');
const db = require('../../../src/db');
const model = require('../model');
const { setupApp } = require('../../../tests/helpers');

let app, ann, bob, cat, project;
async function signup(email) {
  await request(app).post('/auth/register').send({ email, password: 'Secret123', displayName: email });
  const r = await request(app).post('/auth/login').send({ email, password: 'Secret123' });
  return { id: r.body.user.id, email, auth: `Bearer ${r.body.accessToken}` };
}
const add = (as, body, id = project.id) => request(app).post(`/projects/${id}/members`).set('Authorization', as.auth).send(body);
const remove = (as, userId, id = project.id) => request(app).delete(`/projects/${id}/members/${userId}`).set('Authorization', as.auth);

beforeAll(async () => {
  app = await setupApp();
  ann = await signup('ann@example.com');
  bob = await signup('bob@example.com');
  cat = await signup('cat@example.com');
});
beforeEach(async () => {
  await db.query('DELETE FROM project_members');
  await db.query('DELETE FROM projects');
  project = await model.createProject(ann.id, 'Alpha');
});

test('requires auth', async () => {
  expect((await request(app).post(`/projects/${project.id}/members`).send({ userId: bob.id })).status).toBe(401);
  expect((await request(app).delete(`/projects/${project.id}/members/${bob.id}`)).status).toBe(401);
});

test('manager adds a member by id and by email', async () => {
  const a = await add(ann, { userId: bob.id });
  expect(a.status).toBe(201);
  expect(a.body).toMatchObject({ userId: bob.id, role: 'member' });
  expect(await model.getMemberRole(project.id, bob.id)).toBe('member');
  const b = await add(ann, { email: 'CAT@example.com' });
  expect(b.status).toBe(201);
  expect(await model.getMemberRole(project.id, cat.id)).toBe('member');
});

test('added member sees the project in their list', async () => {
  await add(ann, { userId: bob.id });
  expect((await model.listProjectsForUser(bob.id)).map((p) => p.name)).toEqual(['Alpha']);
});

test('non-manager (plain member or outsider) gets 403', async () => {
  await add(ann, { userId: bob.id });
  expect((await add(bob, { userId: cat.id })).status).toBe(403);
  expect((await add(cat, { userId: cat.id })).status).toBe(403);
  expect((await remove(bob, ann.id)).status).toBe(403);
  expect(await model.getMemberRole(project.id, cat.id)).toBeNull();
});

test('adding twice gives 409; unknown or deactivated user gives 404; missing field gives 400', async () => {
  await add(ann, { userId: bob.id });
  expect((await add(ann, { userId: bob.id })).status).toBe(409);
  expect((await add(ann, { userId: 9999 })).status).toBe(404);
  expect((await add(ann, { email: 'nobody@example.com' })).status).toBe(404);
  await db.query('UPDATE users SET is_active = false WHERE id = $1', [cat.id]);
  expect((await add(ann, { userId: cat.id })).status).toBe(404);
  await db.query('UPDATE users SET is_active = true WHERE id = $1', [cat.id]);
  const r = await add(ann, {});
  expect(r.status).toBe(400);
  expect(r.body.error.details).toHaveProperty('userId');
});

test('unknown project gives 404', async () => {
  expect((await add(ann, { userId: bob.id }, 9999)).status).toBe(404);
  expect((await add(ann, { userId: bob.id }, 'abc')).status).toBe(404);
});

test('manager removes a member; removed member loses access', async () => {
  await add(ann, { userId: bob.id });
  expect((await remove(ann, bob.id)).status).toBe(204);
  expect(await model.getMemberRole(project.id, bob.id)).toBeNull();
  expect((await model.listProjectsForUser(bob.id))).toEqual([]);
  expect((await remove(ann, bob.id)).status).toBe(404);
});

test('the project owner cannot be removed', async () => {
  const r = await remove(ann, ann.id);
  expect(r.status).toBe(400);
  expect(await model.getMemberRole(project.id, ann.id)).toBe('team_manager');
});

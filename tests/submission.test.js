const request = require('supertest');
const { setupApp } = require('./helpers');
const { signup, createProject, addMember } = require('./support/fixtures');
const db = require('../src/db');
let app, owner, other, project;
beforeAll(async () => {
  app = await setupApp();
  owner = await signup(app, 'submission-owner@example.com');
  other = await signup(app, 'submission-other@example.com');
  project = await createProject(app, owner);
});
test('web pages and the API share one server', async () => {
  expect((await request(app).get('/')).headers.location).toBe('/dashboard.html');
  for (const p of ['login','dashboard','board','task','notifications','admin']) {
    const r = await request(app).get(`/${p}.html`);
    expect(r.status).toBe(200); expect(r.text).toContain('app.js');
  }
  expect((await request(app).get('/app.js')).status).toBe(200);
  expect((await request(app).get('/.env')).status).toBe(404);
  expect((await request(app).get('/src/config.js')).status).toBe(404);
});
test('session profile is authenticated and exposes no password/token data', async () => {
  expect((await request(app).get('/auth/me')).status).toBe(401);
  const r = await request(app).get('/auth/me').set('Authorization', owner.auth);
  expect(r.body).toEqual({ id:owner.id, email:owner.email, displayName:owner.email, role:'member' });
});
test('project member picker is scoped to project membership', async () => {
  const url = `/projects/${project.id}/members`;
  expect((await request(app).get(url).set('Authorization',other.auth)).status).toBe(403);
  await addMember(app,owner,project.id,other);
  const r = await request(app).get(url).set('Authorization',other.auth);
  expect(r.body.map(u=>u.userId)).toEqual([owner.id,other.id]);
  expect(r.body[0].password_hash).toBeUndefined();
});
test('admin user picker is protected, and deactivation blocks existing tokens', async () => {
  expect((await request(app).get('/admin/users').set('Authorization',other.auth)).status).toBe(403);
  await db.query("UPDATE users SET role = 'admin' WHERE id = $1",[owner.id]);
  const list=await request(app).get('/admin/users').set('Authorization',owner.auth);
  expect(list.status).toBe(200); expect(list.body).toHaveLength(2);
  expect(list.body[0].password_hash).toBeUndefined();
  await request(app).patch(`/admin/users/${other.id}/deactivate`).set('Authorization',owner.auth).expect(200);
  await request(app).post('/projects').set('Authorization',other.auth).send({name:'Blocked'}).expect(401);
  await request(app).get('/auth/me').set('Authorization',other.auth).expect(401);
});

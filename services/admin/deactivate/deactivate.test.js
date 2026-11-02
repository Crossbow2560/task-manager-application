const request = require('supertest');
const db = require('../../../src/db');
const { setupApp } = require('../../../tests/helpers');

let app, admin, bob;
const creds = (email) => ({ email, password: 'Secret123' });
async function signup(email) {
  await request(app).post('/auth/register').send({ ...creds(email), displayName: email });
  const r = await request(app).post('/auth/login').send(creds(email));
  return { id: r.body.user.id, auth: `Bearer ${r.body.accessToken}` };
}
beforeAll(async () => {
  app = await setupApp();
  admin = await signup('admin@example.com');
  bob = await signup('bob@example.com');
  await db.query("UPDATE users SET role = 'admin' WHERE id = $1", [admin.id]);
  const r = await request(app).post('/auth/login').send(creds('admin@example.com')); // new token carries role=admin
  admin.auth = `Bearer ${r.body.accessToken}`;
});
const deact = (auth, id) => request(app).patch(`/admin/users/${id}/deactivate`).set('Authorization', auth);

test('requires auth', async () => { expect((await request(app).patch(`/admin/users/${bob.id}/deactivate`)).status).toBe(401); });
test('non-admin is forbidden', async () => { expect((await deact(bob.auth, admin.id)).status).toBe(403); });
test('admin deactivates a user, who can then no longer log in', async () => {
  const r = await deact(admin.auth, bob.id);
  expect(r.status).toBe(200);
  expect(r.body).toMatchObject({ id: bob.id, isActive: false });
  expect((await request(app).post('/auth/login').send(creds('bob@example.com'))).status).toBe(401);
});
test('admin cannot deactivate self; unknown user is 404', async () => {
  expect((await deact(admin.auth, admin.id)).status).toBe(400);
  expect((await deact(admin.auth, 9999)).status).toBe(404);
  expect((await deact(admin.auth, 'abc')).status).toBe(404);
});

const request = require('supertest');
const model = require('../model');
const { setupApp } = require('../../../tests/helpers');

let app, ann, bob;
async function signup(email) {
  await request(app).post('/auth/register').send({ email, password: 'Secret123', displayName: email });
  const r = await request(app).post('/auth/login').send({ email, password: 'Secret123' });
  return { id: r.body.user.id, auth: `Bearer ${r.body.accessToken}` };
}
beforeAll(async () => {
  app = await setupApp();
  ann = await signup('ann@example.com');
  bob = await signup('bob@example.com');
});

test('requires auth', async () => {
  expect((await request(app).post('/projects').send({ name: 'x' })).status).toBe(401);
  expect((await request(app).get('/projects')).status).toBe(401);
});

test('creator becomes team_manager and owner', async () => {
  const r = await request(app).post('/projects').set('Authorization', ann.auth).send({ name: '  Alpha ' });
  expect(r.status).toBe(201);
  expect(r.body).toMatchObject({ name: 'Alpha', ownerId: ann.id, role: 'team_manager' });
  expect(await model.getMemberRole(r.body.id, ann.id)).toBe('team_manager');
  expect(await model.getMemberRole(r.body.id, bob.id)).toBeNull();
});

test('list only returns projects the user belongs to', async () => {
  await request(app).post('/projects').set('Authorization', bob.auth).send({ name: 'Bobs' });
  const a = (await request(app).get('/projects').set('Authorization', ann.auth)).body;
  const b = (await request(app).get('/projects').set('Authorization', bob.auth)).body;
  expect(a.map((p) => p.name)).toEqual(['Alpha']);
  expect(b.map((p) => p.name)).toEqual(['Bobs']);
});

test.each([[{}], [{ name: '' }], [{ name: 5 }], [{ name: 'x'.repeat(101) }]])('invalid name %#', async (body) => {
  const r = await request(app).post('/projects').set('Authorization', ann.auth).send(body);
  expect(r.status).toBe(400);
  expect(r.body.error.details).toHaveProperty('name');
});

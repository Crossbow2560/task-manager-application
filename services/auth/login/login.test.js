const request = require('supertest');
const jwt = require('jsonwebtoken');
const db = require('../../../src/db');
const config = require('../../../src/config');
const { locked } = require('../../../src/errors');
const { registerLoginHook, clearLoginHooks } = require('./hooks');
const { setupApp } = require('../../../tests/helpers');

let app;
const creds = { email: 'ann@example.com', password: 'Secret123' };
beforeAll(async () => {
  app = await setupApp();
  await request(app).post('/auth/register').send({ ...creds, displayName: 'Ann' });
});
afterEach(clearLoginHooks);

test('valid login returns token pair; access token verifies', async () => {
  const r = await request(app).post('/auth/login').send({ ...creds, email: 'ANN@example.com' });
  expect(r.status).toBe(200);
  const p = jwt.verify(r.body.accessToken, config.jwtSecret);
  expect(p).toMatchObject({ typ: 'access', role: 'member' });
  expect(jwt.verify(r.body.refreshToken, config.jwtSecret).typ).toBe('refresh');
  expect(r.body.user.email).toBe('ann@example.com');
  expect(JSON.stringify(r.body)).not.toMatch(/password/i);
});

test('wrong password and unknown email both give identical 401', async () => {
  const a = await request(app).post('/auth/login').send({ ...creds, password: 'Wrong1234' });
  const b = await request(app).post('/auth/login').send({ email: 'x@example.com', password: 'Wrong1234' });
  expect(a.status).toBe(401);
  expect(b.status).toBe(401);
  expect(a.body).toEqual(b.body);
});

test('deactivated user cannot log in', async () => {
  await db.query('UPDATE users SET is_active = false WHERE email = $1', [creds.email]);
  expect((await request(app).post('/auth/login').send(creds)).status).toBe(401);
  await db.query('UPDATE users SET is_active = true WHERE email = $1', [creds.email]);
});

test('missing fields give 400', async () => {
  expect((await request(app).post('/auth/login').send({ email: 'a@b.co' })).status).toBe(400);
});

test('lockout hooks: beforeAttempt can refuse with 423; failure/success callbacks fire', async () => {
  const events = [];
  let block = false;
  registerLoginHook({
    beforeAttempt: async () => { if (block) throw locked(); },
    onFailure: async ({ user }) => events.push(['fail', user && user.id]),
    onSuccess: async ({ user }) => events.push(['ok', user.id]),
  });
  await request(app).post('/auth/login').send({ ...creds, password: 'Wrong1234' });
  await request(app).post('/auth/login').send(creds);
  expect(events).toEqual([['fail', expect.any(Number)], ['ok', expect.any(Number)]]);
  block = true;
  const r = await request(app).post('/auth/login').send(creds);
  expect(r.status).toBe(423);
  expect(r.body.error.code).toBe('LOCKED');
});

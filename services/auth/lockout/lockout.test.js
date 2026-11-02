const request = require('supertest');
const db = require('../../../src/db');
const { setupApp } = require('../../../tests/helpers');
const { setClock, MAX_FAILURES, WINDOW_MS, LOCK_MS } = require('./routes');

let app;
let now;
const creds = { email: 'lock@example.com', password: 'Secret123' };
const bad = { email: creds.email, password: 'Wrong1234' };
const login = (body) => request(app).post('/auth/login').send(body);
const fail = async (n, body = bad) => { for (let i = 0; i < n; i++) await login(body); };

beforeAll(async () => {
  app = await setupApp();
  setClock(() => new Date(now));
  now = Date.parse('2026-01-01T00:00:00Z');
  await request(app).post('/auth/register').send({ ...creds, displayName: 'Lock' });
});
beforeEach(() => { now = Date.parse('2026-01-01T00:00:00Z'); });
afterEach(() => db.query('DELETE FROM login_throttle'));

test('4 failures do not lock; 5th failure locks even the correct password (423)', async () => {
  await fail(MAX_FAILURES - 1);
  expect((await login(creds)).status).toBe(200);
  await fail(MAX_FAILURES);
  const r = await login(creds);
  expect(r.status).toBe(423);
  expect(r.body.error.code).toBe('LOCKED');
});

test('lock lasts 15 minutes then clears', async () => {
  await fail(MAX_FAILURES);
  now += LOCK_MS - 1000;
  expect((await login(creds)).status).toBe(423);
  now += 2000;
  expect((await login(creds)).status).toBe(200);
});

test('a successful login resets the consecutive-failure counter', async () => {
  await fail(MAX_FAILURES - 1);
  expect((await login(creds)).status).toBe(200);
  await fail(MAX_FAILURES - 1);
  expect((await login(creds)).status).toBe(200);
});

test('failures older than the 15-minute window do not count', async () => {
  await fail(MAX_FAILURES - 1);
  now += WINDOW_MS + 1000;
  await fail(1);
  expect((await login(creds)).status).toBe(200);
});

test('unknown emails are throttled too, with the same 423', async () => {
  const ghost = { email: 'ghost@example.com', password: 'Wrong1234' };
  await fail(MAX_FAILURES, ghost);
  expect((await login(ghost)).status).toBe(423);
});

test('lockout is per account', async () => {
  await fail(MAX_FAILURES);
  await request(app).post('/auth/register').send({ email: 'other@example.com', password: 'Secret123', displayName: 'O' });
  expect((await login({ email: 'other@example.com', password: 'Secret123' })).status).toBe(200);
});

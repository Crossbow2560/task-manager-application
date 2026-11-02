const request = require('supertest');
const db = require('../../../src/db');
const { setupApp } = require('../../../tests/helpers');

let app;
beforeAll(async () => { app = await setupApp(); });
const ok = { email: 'Ann@Example.com', password: 'Secret123', displayName: 'Ann' };

test('registers, normalizes email, stores only a hash', async () => {
  const r = await request(app).post('/auth/register').send(ok);
  expect(r.status).toBe(201);
  expect(r.body).toEqual({ id: expect.any(Number), email: 'ann@example.com', displayName: 'Ann', role: 'member' });
  expect(JSON.stringify(r.body)).not.toMatch(/hash|Secret123/);
  const row = (await db.query('SELECT password_hash FROM users WHERE id=$1', [r.body.id])).rows[0];
  expect(row.password_hash).toMatch(/^\$2[aby]\$1\d\$/);
});

test('duplicate email (case-insensitive) is 409', async () => {
  const r = await request(app).post('/auth/register').send({ ...ok, email: 'ANN@example.com' });
  expect(r.status).toBe(409);
  expect(r.body.error.code).toBe('CONFLICT');
});

test('role in body is ignored', async () => {
  const r = await request(app).post('/auth/register').send({ ...ok, email: 'b@example.com', role: 'admin' });
  expect(r.body.role).toBe('member');
});

test.each([
  [{ ...ok, email: 'nope' }, 'email'],
  [{ ...ok, password: 'short' }, 'password'],
  [{ ...ok, displayName: '  ' }, 'displayName'],
  [{}, 'email'],
])('invalid input %#', async (body, field) => {
  const r = await request(app).post('/auth/register').send(body);
  expect(r.status).toBe(400);
  expect(r.body.error.details).toHaveProperty(field);
});

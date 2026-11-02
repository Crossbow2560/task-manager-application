const request = require('supertest');
const jwt = require('jsonwebtoken');
const express = require('express');
const config = require('../src/config');
const { signTokens, requireAuth } = require('../src/middleware/auth');
const { errorHandler } = require('../src/middleware/error');
const { setupApp } = require('./helpers');

let app;
beforeAll(async () => { app = await setupApp(); });

test('health and 404 envelope', async () => {
  expect((await request(app).get('/health')).body).toEqual({ status: 'ok' });
  const r = await request(app).get('/nope');
  expect(r.status).toBe(404);
  expect(r.body.error.code).toBe('NOT_FOUND');
});

test('malformed JSON gives 400', async () => {
  const r = await request(app).post('/health').set('content-type', 'application/json').send('{bad');
  expect(r.status).toBe(400);
});

describe('requireAuth', () => {
  const a = express();
  a.get('/me', requireAuth, (req, res) => res.json(req.user));
  a.get('/boom', () => { throw new Error('x'); });
  a.use(errorHandler);
  const { accessToken, refreshToken } = signTokens({ id: 7, role: 'member' });

  test('accepts access token', async () => {
    const r = await request(a).get('/me').set('Authorization', `Bearer ${accessToken}`);
    expect(r.body).toEqual({ id: 7, role: 'member' });
  });
  test('rejects missing, refresh and garbage tokens', async () => {
    expect((await request(a).get('/me')).status).toBe(401);
    expect((await request(a).get('/me').set('Authorization', `Bearer ${refreshToken}`)).status).toBe(401);
    expect((await request(a).get('/me').set('Authorization', 'Bearer junk')).status).toBe(401);
    const expired = jwt.sign({ sub: 1, typ: 'access' }, config.jwtSecret, { expiresIn: -10 });
    expect((await request(a).get('/me').set('Authorization', `Bearer ${expired}`)).status).toBe(401);
  });
  test('unexpected errors are hidden as 500', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const r = await request(a).get('/boom');
    expect(r.status).toBe(500);
    expect(r.body.error.message).toBe('Internal server error');
  });
});

const request = require('supertest');
const db = require('../../../src/db');
const { setupApp } = require('../../../tests/helpers');

let app;
beforeAll(async () => { app = await setupApp(); });

test('/health reports liveness', async () => {
  expect((await request(app).get('/health')).body).toEqual({ status: 'ok' });
});
test('/ready is 200 when the database answers', async () => {
  const r = await request(app).get('/ready');
  expect(r.status).toBe(200);
  expect(r.body).toMatchObject({ status: 'ready', db: 'up' });
});
test('/ready is 503 when the database is down', async () => {
  const spy = jest.spyOn(db, 'query').mockRejectedValueOnce(new Error('connection refused'));
  const r = await request(app).get('/ready');
  expect(r.status).toBe(503);
  expect(r.body).toEqual({ status: 'not_ready', db: 'down' });
  spy.mockRestore();
});

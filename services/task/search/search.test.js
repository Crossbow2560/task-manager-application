const request = require('supertest');
const { setupApp } = require('../../../tests/helpers');
const { registerFilter } = require('./listing');

let app, ann, bob, p, q;
async function signup(email) {
  await request(app).post('/auth/register').send({ email, password: 'Secret123', displayName: email });
  const r = await request(app).post('/auth/login').send({ email, password: 'Secret123' });
  return { id: r.body.user.id, auth: `Bearer ${r.body.accessToken}` };
}
const mk = (proj, auth, body) => request(app).post(`/projects/${proj.id}/tasks`).set('Authorization', auth).send(body);
beforeAll(async () => {
  app = await setupApp();
  ann = await signup('ann@example.com'); bob = await signup('bob@example.com');
  p = (await request(app).post('/projects').set('Authorization', ann.auth).send({ name: 'P' })).body;
  q = (await request(app).post('/projects').set('Authorization', bob.auth).send({ name: 'Q' })).body;
  await mk(p, ann.auth, { title: 'Write Report', priority: 'high' });
  await mk(p, ann.auth, { title: 'Fix bug', description: 'the REPORT page crashes', priority: 'low' });
  await mk(p, ann.auth, { title: 'Lunch' });
  await mk(q, bob.auth, { title: 'Report in other project' });
});
const list = (proj, auth, qs = '') => request(app).get(`/projects/${proj.id}/tasks${qs}`).set('Authorization', auth);

test('requires auth', async () => { expect((await request(app).get(`/projects/${p.id}/tasks`)).status).toBe(401); });
test('no keyword lists the whole project', async () => { expect((await list(p, ann.auth)).body).toHaveLength(3); });
test('matches title and description, case-insensitively, only inside the project', async () => {
  const r = await list(p, ann.auth, '?q=rEpOrT');
  expect(r.body.map((t) => t.title)).toEqual(['Write Report', 'Fix bug']);
});
test('blank or unmatched keyword', async () => {
  expect((await list(p, ann.auth, '?q=%20')).body).toHaveLength(3);
  expect((await list(p, ann.auth, '?q=zzz')).body).toEqual([]);
});
test('wildcard characters are treated literally', async () => { expect((await list(p, ann.auth, '?q=%25')).body).toEqual([]); });
test('non-members are forbidden, unknown project is 404', async () => {
  expect((await list(p, bob.auth)).status).toBe(403);
  expect((await request(app).get('/projects/9999/tasks').set('Authorization', ann.auth)).status).toBe(404);
  expect((await request(app).get('/projects/abc/tasks').set('Authorization', ann.auth)).status).toBe(404);
});
test('registered filters extend the listing (extension point for FR-12)', async () => {
  registerFilter((query) => (query.priority ? { sql: 't.priority = ?', values: [query.priority] } : null));
  registerFilter((query) => (query.priority ? { sql: 't.priority = ?', values: [query.priority] } : null));
  const r = await list(p, ann.auth, '?q=report&priority=low');
  expect(r.body.map((t) => t.title)).toEqual(['Fix bug']);
  expect(() => registerFilter('nope')).toThrow(TypeError);
});

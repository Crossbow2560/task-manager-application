const request = require('supertest');
const { setupApp } = require('../../../tests/helpers');
const { signup, createProject, addMember, createTask } = require('../../../tests/support/fixtures');

let app, ann, bob, eve, project;
const get = (as, qs = '') => request(app).get(`/projects/${project.id}/tasks${qs}`).set('Authorization', as.auth);
const titles = async (qs, as = ann) => (await get(as, qs)).body.map((t) => t.title);

beforeAll(async () => {
  app = await setupApp();
  ann = await signup(app, 'ann@example.com');
  bob = await signup(app, 'bob@example.com');
  eve = await signup(app, 'eve@example.com');
  project = await createProject(app, ann);
  await addMember(app, ann, project.id, bob);
  const mk = (b) => createTask(app, ann, project.id, b);
  const a = await mk({ title: 'alpha report', priority: 'high', dueDate: '2026-03-01' });
  const b = await mk({ title: 'beta report', priority: 'low', dueDate: '2026-03-15' });
  await mk({ title: 'gamma', priority: 'high', dueDate: '2026-04-01' });
  await mk({ title: 'delta' });
  const set = (id, status) => request(app).patch(`/tasks/${id}/status`).set('Authorization', ann.auth).send({ status });
  await set(a.id, 'done');
  await set(b.id, 'in_progress');
  await request(app).post(`/tasks/${a.id}/assignees`).set('Authorization', ann.auth).send({ userIds: [bob.id] });
  await request(app).post(`/tasks/${b.id}/assignees`).set('Authorization', ann.auth).send({ userIds: [bob.id, ann.id] });
});

test('no filters returns every task', async () => {
  expect(await titles('')).toEqual(['alpha report', 'beta report', 'gamma', 'delta']);
});

test('filters by status', async () => {
  expect(await titles('?status=done')).toEqual(['alpha report']);
  expect(await titles('?status=in_progress')).toEqual(['beta report']);
  expect(await titles('?status=todo')).toEqual(['gamma', 'delta']);
});

test('filters by priority (case-insensitive)', async () => {
  expect(await titles('?priority=high')).toEqual(['alpha report', 'gamma']);
  expect(await titles('?priority=LOW')).toEqual(['beta report']);
});

test('filters by assignee', async () => {
  expect(await titles(`?assignee=${bob.id}`)).toEqual(['alpha report', 'beta report']);
  expect(await titles(`?assignee=${ann.id}`)).toEqual(['beta report']);
  expect(await titles('?assignee=9999')).toEqual([]);
});

test('filters by due-date range, inclusive, with open ends', async () => {
  expect(await titles('?dueFrom=2026-03-01&dueTo=2026-03-15')).toEqual(['alpha report', 'beta report']);
  expect(await titles('?dueFrom=2026-03-02')).toEqual(['beta report', 'gamma']);
  expect(await titles('?dueTo=2026-03-01')).toEqual(['alpha report']);
});

test('filters combine with each other and with keyword search', async () => {
  expect(await titles('?priority=high&dueFrom=2026-03-15')).toEqual(['gamma']);
  expect(await titles(`?assignee=${bob.id}&status=done`)).toEqual(['alpha report']);
  expect(await titles('?q=report&priority=low')).toEqual(['beta report']);
});

test.each([
  ['status=finished', 'status'], ['priority=urgent', 'priority'], ['assignee=bob', 'assignee'],
  ['dueFrom=tomorrow', 'dueFrom'], ['dueTo=2026-13-45', 'dueTo'], ['dueFrom=2026-05-01&dueTo=2026-04-01', 'dueTo'],
  ['status=done&status=todo', 'status'],
])('invalid filter %s gives 400', async (qs, field) => {
  const r = await get(ann, `?${qs}`);
  expect(r.status).toBe(400);
  expect(r.body.error.details).toHaveProperty(field);
});

test('empty filter values are ignored; non-members are still refused', async () => {
  expect(await titles('?status=&priority=')).toHaveLength(4);
  expect((await get(eve, '?status=done')).status).toBe(403);
});

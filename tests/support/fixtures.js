// Test fixtures for task features (assign, status, comments, filter, recovery).
const request = require('supertest');

async function signup(app, email) {
  await request(app).post('/auth/register').send({ email, password: 'Secret123', displayName: email });
  const r = await request(app).post('/auth/login').send({ email, password: 'Secret123' });
  return { id: r.body.user.id, email, auth: `Bearer ${r.body.accessToken}` };
}

async function createProject(app, as, name = 'Alpha') {
  return (await request(app).post('/projects').set('Authorization', as.auth).send({ name })).body;
}

async function addMember(app, as, projectId, user) {
  return request(app).post(`/projects/${projectId}/members`).set('Authorization', as.auth).send({ userId: user.id });
}

async function createTask(app, as, projectId, body = {}) {
  return (await request(app).post(`/projects/${projectId}/tasks`).set('Authorization', as.auth).send({ title: 'Task', ...body })).body;
}

module.exports = { signup, createProject, addMember, createTask };

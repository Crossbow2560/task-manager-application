const request = require('supertest');
const { setupApp } = require('../../../tests/helpers');
const db = require('../../../src/db');
let app;
const keys=['LOCAL_DEMO_LOGIN','LOCAL_DEMO_PASSWORD','DATABASE_URL','NODE_ENV'];
const before=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
beforeAll(async()=>{
  app=await setupApp();
  await request(app).post('/auth/register').send({email:'admin@demo.test',displayName:'Demo Admin',password:'DemoTest123'}).expect(201);
  await db.query("UPDATE users SET role='admin' WHERE email='admin@demo.test'");
});
beforeEach(()=>{
  process.env.LOCAL_DEMO_LOGIN='1';process.env.LOCAL_DEMO_PASSWORD='DemoTest123';
  process.env.DATABASE_URL='postgres://localhost/taskmanager_demo';process.env.NODE_ENV='test';
});
afterAll(()=>{for(const k of keys){if(before[k]===undefined)delete process.env[k];else process.env[k]=before[k];}});
test.each([
  ['LOCAL_DEMO_LOGIN','0'],['LOCAL_DEMO_PASSWORD',''],['DATABASE_URL','postgres://localhost/taskmanager'],
  ['DATABASE_URL','postgres://remote.example/taskmanager_demo'],['NODE_ENV','production'],
])('shortcut routes are unavailable with %s=%s',async(key,value)=>{
  process.env[key]=value;
  await request(app).get('/demo/accounts').expect(404);
  await request(app).post('/demo/login').send({email:'admin@demo.test'}).expect(404);
});
test('account list exposes labels but no password; unlisted accounts cannot be selected',async()=>{
  const r=await request(app).get('/demo/accounts').expect(200);
  expect(r.headers['cache-control']).toBe('no-store');expect(r.body.accounts).toHaveLength(5);
  expect(JSON.stringify(r.body)).not.toContain('DemoTest123');
  await request(app).post('/demo/login').send({email:'unknown@example.com'}).expect(400);
});
test('one-click login uses normal credentials and issues a working authenticated session',async()=>{
  const r=await request(app).post('/demo/login').send({email:'admin@demo.test'}).expect(200);
  expect(r.body.user.role).toBe('admin');
  await request(app).get('/auth/me').set('Authorization','Bearer '+r.body.accessToken).expect(200);
});
test('wrong configured password and deactivation still prevent shortcut login',async()=>{
  process.env.LOCAL_DEMO_PASSWORD='Incorrect123';
  await request(app).post('/demo/login').send({email:'admin@demo.test'}).expect(401);
  process.env.LOCAL_DEMO_PASSWORD='DemoTest123';
  await db.query("UPDATE users SET is_active=false WHERE email='admin@demo.test'");
  await request(app).post('/demo/login').send({email:'admin@demo.test'}).expect(401);
});

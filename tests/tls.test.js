const request = require('supertest');
const express = require('express');
const https = require('https');
const http = require('http');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createServer, tlsOptions, HSTS } = require('../src/tls');

const app = express();
app.get('/x', (req, res) => res.json({ ok: true }));
app.post('/x', (req, res) => res.json({ ok: true }));

test('no TLS env: plain http, no redirect (dev)', async () => {
  const s = createServer(app, {});
  expect(s).toBeInstanceOf(http.Server);
  expect((await request(s).get('/x')).status).toBe(200);
});

test('behind proxy: insecure GET redirects, POST refused, secure gets HSTS', async () => {
  const s = createServer(app, { TRUST_PROXY: '1' });
  const r = await request(s).get('/x?a=1').set('Host', 'api.test');
  expect(r.status).toBe(308);
  expect(r.headers.location).toBe('https://api.test/x?a=1');
  expect((await request(s).post('/x')).status).toBe(403);
  const ok = await request(s).get('/x').set('X-Forwarded-Proto', 'https');
  expect(ok.status).toBe(200);
  expect(ok.headers['strict-transport-security']).toBe(HSTS);
});

test('tlsOptions is null without files', () => {
  expect(tlsOptions({})).toBeNull();
});

describe('direct HTTPS with a self-signed cert', () => {
  let dir, env, haveOpenssl = true;
  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tls-'));
    try {
      execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=localhost',
        '-keyout', path.join(dir, 'k.pem'), '-out', path.join(dir, 'c.pem')], { stdio: 'ignore' });
      env = { TLS_CERT_FILE: path.join(dir, 'c.pem'), TLS_KEY_FILE: path.join(dir, 'k.pem') };
    } catch (e) { haveOpenssl = false; }
  });

  test('serves HTTPS, sets minVersion 1.2, rejects TLS 1.1', async () => {
    if (!haveOpenssl) return console.warn('openssl not available; skipping');
    expect(tlsOptions(env).minVersion).toBe('TLSv1.2');
    const s = createServer(app, env);
    expect(s).toBeInstanceOf(https.Server);
    await new Promise((r) => s.listen(0, r));
    const port = s.address().port;
    const get = (extra = {}) => new Promise((resolve, reject) => {
      https.get({ port, path: '/x', rejectUnauthorized: false, ...extra }, (res) => resolve(res)).on('error', reject);
    });
    const res = await get();
    expect(res.statusCode).toBe(200);
    expect(res.headers['strict-transport-security']).toBe(HSTS);
    await expect(get({ maxVersion: 'TLSv1.1', minVersion: 'TLSv1' })).rejects.toThrow();
    s.close();
  });
});

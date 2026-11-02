// SEC-REQ-02: TLS 1.2+ for all traffic.
// Set TLS_CERT_FILE and TLS_KEY_FILE to serve HTTPS directly. Behind a TLS-terminating load
// balancer set TRUST_PROXY=1 instead: plain-HTTP requests (X-Forwarded-Proto) are redirected.
// With neither set (local dev only) the server stays on plain HTTP.
const fs = require('fs');
const http = require('http');
const https = require('https');
const express = require('express');

const HSTS = 'max-age=31536000; includeSubDomains';

// Adds HSTS on secure requests and redirects insecure ones to HTTPS.
function enforceHttps(req, res, next) {
  if (req.secure) {
    res.set('Strict-Transport-Security', HSTS);
    return next();
  }
  if (req.method === 'GET' || req.method === 'HEAD') return res.redirect(308, `https://${req.headers.host}${req.originalUrl}`);
  return res.status(403).json({ error: { code: 'HTTPS_REQUIRED', message: 'HTTPS is required' } });
}

function tlsOptions(env = process.env) {
  if (!env.TLS_CERT_FILE || !env.TLS_KEY_FILE) return null;
  return {
    cert: fs.readFileSync(env.TLS_CERT_FILE),
    key: fs.readFileSync(env.TLS_KEY_FILE),
    minVersion: 'TLSv1.2',
  };
}

// Wraps `app` per the environment; returns the Node server to listen on.
function createServer(app, env = process.env) {
  const opts = tlsOptions(env);
  const wrapper = express();
  if (env.TRUST_PROXY) wrapper.set('trust proxy', 1);
  if (opts || env.TRUST_PROXY) wrapper.use(enforceHttps);
  wrapper.use(app);
  return opts ? https.createServer(opts, wrapper) : http.createServer(wrapper);
}

module.exports = { createServer, enforceHttps, tlsOptions, HSTS };

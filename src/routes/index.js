// Route registry. Auto-discovers every services/**/routes.js, so a new feature just adds a
// routes.js file and this file is never edited again.
// A routes.js exports { router } (or the router itself); the router declares its own full
// paths (e.g. router.post('/auth/login', ...)) and applies requireAuth per route.
const fs = require('fs');
const path = require('path');
const express = require('express');

const root = path.join(__dirname, '..', '..', 'services');

function findRouteFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return findRouteFiles(p);
    return e.name === 'routes.js' ? [p] : [];
  }).sort();
}

function buildRouter() {
  const router = express.Router();
  for (const f of findRouteFiles(root)) {
    const mod = require(f);
    router.use(mod.router || mod);
  }
  return router;
}

module.exports = { buildRouter, findRouteFiles };

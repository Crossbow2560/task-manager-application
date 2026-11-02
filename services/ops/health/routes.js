// NFR-02 (availability): readiness probe for load balancers / orchestrators.
// /health (liveness) already exists in src/app.js; /ready also verifies the database is reachable,
// so traffic is routed away from an instance that has lost its database.
const express = require('express');
const db = require('../../../src/db');

const router = express.Router();

router.get('/ready', async (req, res) => {
  const started = Date.now();
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ready', db: 'up', uptimeSeconds: Math.round(process.uptime()), checkMs: Date.now() - started });
  } catch (e) {
    res.status(503).json({ status: 'not_ready', db: 'down' });
  }
});

module.exports = { router };

// FR-13: GET /dashboard - task counts per status for the logged-in user.
// Counts the tasks the user can see: those in projects they are a member of.
const express = require('express');
const db = require('../../src/db');
const { requireAuth } = require('../../src/middleware/auth');
const { STATUSES } = require('../task/status/routes');

const router = express.Router();

router.get('/dashboard', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT t.status AS status, COUNT(*) AS n
       FROM tasks t JOIN project_members m ON m.project_id = t.project_id
       WHERE m.user_id = $1 GROUP BY t.status`,
      [req.user.id],
    );
    const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0]));
    for (const r of rows) byStatus[r.status] = Number(r.n);
    const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
    res.json({ total, byStatus });
  } catch (e) { next(e); }
});

module.exports = { router };

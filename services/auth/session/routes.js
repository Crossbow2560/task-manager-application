const express = require('express');
const db = require('../../../src/db');
const { requireAuth } = require('../../../src/middleware/auth');
const router = express.Router();
router.get('/auth/me', requireAuth, async (req, res, next) => {
  try {
    const u = (await db.query('SELECT id, email, display_name, role FROM users WHERE id = $1', [req.user.id])).rows[0];
    res.json({ id: u.id, email: u.email, displayName: u.display_name, role: u.role });
  } catch (e) { next(e); }
});
module.exports = { router };

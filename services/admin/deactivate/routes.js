// FR-14: PATCH /admin/users/:id/deactivate  (global Admin role only)
const express = require('express');
const db = require('../../../src/db');
const { requireAuth } = require('../../../src/middleware/auth');
const { badRequest, forbidden, notFound } = require('../../../src/errors');

const router = express.Router();

router.patch('/admin/users/:id/deactivate', requireAuth, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') throw forbidden('Admin role required');
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw notFound('User not found');
    if (id === req.user.id) throw badRequest('Admins cannot deactivate their own account');
    const { rows } = await db.query('UPDATE users SET is_active = false WHERE id = $1 RETURNING id, email, display_name, role, is_active', [id]);
    if (!rows[0]) throw notFound('User not found');
    const u = rows[0];
    res.json({ id: u.id, email: u.email, displayName: u.display_name, role: u.role, isActive: u.is_active });
  } catch (e) { next(e); }
});

module.exports = { router };

// GET /notifications - the caller's in-app notifications; POST /notifications/:id/read
const express = require('express');
const db = require('../../src/db');
const { requireAuth } = require('../../src/middleware/auth');
const { notFound } = require('../../src/errors');

const router = express.Router();
const toNotification = (r) => ({ id: r.id, taskId: r.task_id, kind: r.kind, message: r.message, createdAt: r.created_at, read: !!r.read_at });

router.get('/notifications', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM notifications WHERE user_id = $1 ORDER BY id DESC', [req.user.id]);
    res.json(rows.map(toNotification));
  } catch (e) { next(e); }
});

router.post('/notifications/:id/read', requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw notFound('Notification not found');
    const { rows } = await db.query(
      'UPDATE notifications SET read_at = now() WHERE id = $1 AND user_id = $2 RETURNING *', [id, req.user.id],
    );
    if (!rows[0]) throw notFound('Notification not found');
    res.json(toNotification(rows[0]));
  } catch (e) { next(e); }
});

module.exports = { router };

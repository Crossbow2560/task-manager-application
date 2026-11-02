// FR-09 (#13): POST /tasks/:id/comments, GET /tasks/:id/comments
// Any user who can view the task (a member of its project) may comment.
const express = require('express');
const db = require('../../../src/db');
const { requireAuth } = require('../../../src/middleware/auth');
const { badRequest } = require('../../../src/errors');
const { authorizeTask } = require('../rbac');

const MAX_LENGTH = 2000;
const router = express.Router();

const toComment = (r) => ({ id: r.id, taskId: r.task_id, authorId: r.author_id, authorName: r.display_name, body: r.body, createdAt: r.created_at });

router.post('/tasks/:id/comments', requireAuth, authorizeTask('view'), async (req, res, next) => {
  try {
    const { body } = req.body || {};
    if (typeof body !== 'string' || !body.trim() || body.length > MAX_LENGTH) {
      throw badRequest('Validation failed', { body: `body is required (max ${MAX_LENGTH} chars)` });
    }
    const c = (await db.query(
      'INSERT INTO comments (task_id, author_id, body) VALUES ($1, $2, $3) RETURNING *',
      [req.task.id, req.user.id, body.trim()],
    )).rows[0];
    const author = (await db.query('SELECT display_name FROM users WHERE id = $1', [req.user.id])).rows[0];
    res.status(201).json(toComment({ ...c, display_name: author.display_name }));
  } catch (e) { next(e); }
});

router.get('/tasks/:id/comments', requireAuth, authorizeTask('view'), async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT c.*, u.display_name FROM comments c JOIN users u ON u.id = c.author_id
       WHERE c.task_id = $1 ORDER BY c.id`,
      [req.task.id],
    );
    res.json(rows.map(toComment));
  } catch (e) { next(e); }
});

module.exports = { router, MAX_LENGTH };

// FR-07 (#12): PATCH /tasks/:id/status  { status: 'todo' | 'in_progress' | 'done' }
// Authorization via RBAC: an assignee, the task owner, or a project Admin/Team Manager.
const express = require('express');
const db = require('../../../src/db');
const { requireAuth } = require('../../../src/middleware/auth');
const { badRequest } = require('../../../src/errors');
const { authorizeTask } = require('../rbac');
const { toTask } = require('../create/routes');

const STATUSES = ['todo', 'in_progress', 'done'];
const router = express.Router();

router.patch('/tasks/:id/status', requireAuth, authorizeTask('modify'), async (req, res, next) => {
  try {
    const { status } = req.body || {};
    if (!STATUSES.includes(status)) throw badRequest('Validation failed', { status: 'status must be todo, in_progress or done' });
    const { rows } = await db.query('UPDATE tasks SET status = $1 WHERE id = $2 RETURNING *', [status, req.task.id]);
    res.json(toTask(rows[0]));
  } catch (e) { next(e); }
});

module.exports = { router, STATUSES };

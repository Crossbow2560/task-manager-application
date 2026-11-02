// FR-05: DELETE /tasks/:id (task owner or project Admin/Team Manager, enforced by RBAC)
const express = require('express');
const db = require('../../../src/db');
const { requireAuth } = require('../../../src/middleware/auth');
const { authorizeTask } = require('../rbac');

const router = express.Router();

router.delete('/tasks/:id', requireAuth, authorizeTask('delete'), async (req, res, next) => {
  try {
    const t = req.task;
    await db.query('DELETE FROM task_assignees WHERE task_id = $1', [t.id]);
    await db.query('DELETE FROM comments WHERE task_id = $1', [t.id]);
    await db.query('DELETE FROM tasks WHERE id = $1', [t.id]);
    res.status(204).end();
  } catch (e) { next(e); }
});

module.exports = { router };

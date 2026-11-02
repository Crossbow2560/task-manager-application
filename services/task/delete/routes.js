// FR-05: DELETE /tasks/:id (task owner or project Admin/Team Manager)
const express = require('express');
const db = require('../../../src/db');
const { requireAuth } = require('../../../src/middleware/auth');
const { forbidden, notFound } = require('../../../src/errors');
const { getMemberRole, ROLES } = require('../../project/model');

const router = express.Router();

router.delete('/tasks/:id', requireAuth, async (req, res, next) => {
  try {
    if (!Number.isInteger(Number(req.params.id))) throw notFound('Task not found');
    const t = (await db.query('SELECT * FROM tasks WHERE id = $1', [Number(req.params.id)])).rows[0];
    if (!t) throw notFound('Task not found');
    const isOwner = t.creator_id === req.user.id;
    const isManager = (await getMemberRole(t.project_id, req.user.id)) === ROLES.MANAGER;
    if (!isOwner && !isManager && req.user.role !== 'admin') throw forbidden('Only the task owner or a project Admin/Team Manager may delete this task');
    await db.query('DELETE FROM task_assignees WHERE task_id = $1', [t.id]);
    await db.query('DELETE FROM comments WHERE task_id = $1', [t.id]);
    await db.query('DELETE FROM tasks WHERE id = $1', [t.id]);
    res.status(204).end();
  } catch (e) { next(e); }
});

module.exports = { router };

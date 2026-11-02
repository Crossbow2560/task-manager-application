// FR-06 (#11): POST /tasks/:id/assignees, DELETE /tasks/:id/assignees/:userId
// A task can have one or more assignees, who must be members of the task's project.
// Authorization via RBAC: task owner, an assignee, or a project Admin/Team Manager.
const express = require('express');
const db = require('../../../src/db');
const { requireAuth } = require('../../../src/middleware/auth');
const { badRequest, notFound } = require('../../../src/errors');
const { authorizeTask } = require('../rbac');
const { getMemberRole } = require('../../project/model');

const router = express.Router();

async function listAssignees(taskId) {
  const { rows } = await db.query(
    `SELECT u.id, u.email, u.display_name FROM task_assignees a JOIN users u ON u.id = a.user_id
     WHERE a.task_id = $1 ORDER BY u.id`,
    [taskId],
  );
  return rows.map((r) => ({ userId: r.id, email: r.email, displayName: r.display_name }));
}

router.get('/tasks/:id/assignees', requireAuth, authorizeTask('view'), async (req, res, next) => {
  try { res.json(await listAssignees(req.task.id)); } catch (e) { next(e); }
});

// Body: { userId } or { userIds: [..] }. Already-assigned users are left as they are.
router.post('/tasks/:id/assignees', requireAuth, authorizeTask('modify'), async (req, res, next) => {
  try {
    const b = req.body || {};
    const ids = Array.isArray(b.userIds) ? b.userIds : b.userId !== undefined ? [b.userId] : [];
    if (!ids.length || !ids.every((i) => Number.isInteger(i) && i > 0)) {
      throw badRequest('Validation failed', { userIds: 'userId or a non-empty userIds array of user ids is required' });
    }
    const unique = [...new Set(ids)];
    for (const id of unique) {
      const user = (await db.query('SELECT is_active FROM users WHERE id = $1', [id])).rows[0];
      if (!user || !user.is_active) throw notFound(`User ${id} not found`);
      if (!(await getMemberRole(req.task.project_id, id))) {
        throw badRequest('Validation failed', { userIds: `User ${id} is not a member of this project` });
      }
    }
    for (const id of unique) {
      await db.query('INSERT INTO task_assignees (task_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.task.id, id]);
    }
    res.status(201).json(await listAssignees(req.task.id));
  } catch (e) { next(e); }
});

router.delete('/tasks/:id/assignees/:userId', requireAuth, authorizeTask('modify'), async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);
    const { rowCount } = Number.isInteger(userId)
      ? await db.query('DELETE FROM task_assignees WHERE task_id = $1 AND user_id = $2', [req.task.id, userId])
      : { rowCount: 0 };
    if (!rowCount) throw notFound('Assignee not found');
    res.status(204).end();
  } catch (e) { next(e); }
});

module.exports = { router };

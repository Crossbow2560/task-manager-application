// SEC-REQ-03: role-based access control for tasks.
// Only a task's owner (creator), its assignees, or a project Admin/Team Manager may modify it;
// delete is limited to the owner or a project Admin/Team Manager (FR-05).
// Usage: router.patch('/tasks/:id', requireAuth, authorizeTask('modify'), handler)  -> req.task is set.
const db = require('../../../src/db');
const { forbidden, notFound } = require('../../../src/errors');
const { getMemberRole, ROLES } = require('../../project/model');

async function resolveAccess(user, task) {
  const role = await getMemberRole(task.project_id, user.id);
  const isOwner = task.creator_id === user.id;
  const isManager = role === ROLES.MANAGER || user.role === 'admin';
  const isAssignee = (await db.query('SELECT 1 FROM task_assignees WHERE task_id = $1 AND user_id = $2', [task.id, user.id])).rows.length > 0;
  return { isMember: role !== null, isOwner, isManager, isAssignee };
}

const RULES = {
  view: (a) => a.isMember || a.isManager,
  modify: (a) => a.isOwner || a.isAssignee || a.isManager,
  delete: (a) => a.isOwner || a.isManager,
};
const MESSAGES = {
  view: 'Not a member of this project',
  modify: 'Only the task owner, an assignee, or a project Admin/Team Manager may modify this task',
  delete: 'Only the task owner or a project Admin/Team Manager may delete this task',
};

// Middleware factory. Loads the task, enforces the rule for `action`, exposes it as req.task.
function authorizeTask(action) {
  if (!RULES[action]) throw new Error(`Unknown task action: ${action}`);
  return async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) throw notFound('Task not found');
      const task = (await db.query('SELECT * FROM tasks WHERE id = $1', [id])).rows[0];
      if (!task) throw notFound('Task not found');
      if (!RULES[action](await resolveAccess(req.user, task))) throw forbidden(MESSAGES[action]);
      req.task = task;
      next();
    } catch (e) { next(e); }
  };
}

module.exports = { authorizeTask, resolveAccess, RULES };

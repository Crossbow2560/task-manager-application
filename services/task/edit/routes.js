// FR-04: GET /tasks/:id, PATCH /tasks/:id (title, description, dueDate, priority, status)
// Authorization via RBAC (SEC-REQ-03): task owner, an assignee, or a project Admin/Team Manager.
const express = require('express');
const db = require('../../../src/db');
const { requireAuth } = require('../../../src/middleware/auth');
const { badRequest, forbidden, notFound } = require('../../../src/errors');
const { authorizeTask } = require('../rbac');
const { getMemberRole } = require('../../project/model');
const { toTask, PRIORITIES } = require('../create/routes');

const STATUSES = ['todo', 'in_progress', 'done'];
const router = express.Router();

async function loadTask(id) {
  if (!Number.isInteger(Number(id))) throw notFound('Task not found');
  const t = (await db.query('SELECT * FROM tasks WHERE id = $1', [Number(id)])).rows[0];
  if (!t) throw notFound('Task not found');
  return t;
}

router.get('/tasks/:id', requireAuth, async (req, res, next) => {
  try {
    const t = await loadTask(req.params.id);
    if (!(await getMemberRole(t.project_id, req.user.id))) throw forbidden('Not a member of this project');
    res.json(toTask(t));
  } catch (e) { next(e); }
});

router.patch('/tasks/:id', requireAuth, authorizeTask('modify'), async (req, res, next) => {
  try {
    const t = req.task;
    const b = req.body || {};
    const sets = []; const vals = []; const d = {};
    const add = (col, v) => { vals.push(v); sets.push(`${col} = $${vals.length}`); };
    if ('title' in b) { if (typeof b.title !== 'string' || !b.title.trim() || b.title.length > 200) d.title = 'title must be 1-200 chars'; else add('title', b.title.trim()); }
    if ('description' in b) { if (b.description !== null && typeof b.description !== 'string') d.description = 'description must be a string'; else add('description', b.description); }
    if ('dueDate' in b) {
      if (b.dueDate !== null && (typeof b.dueDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(b.dueDate) || Number.isNaN(Date.parse(b.dueDate)))) d.dueDate = 'dueDate must be YYYY-MM-DD';
      else add('due_date', b.dueDate);
    }
    if ('priority' in b) { if (!PRIORITIES.includes(String(b.priority).toLowerCase())) d.priority = 'priority must be low, medium or high'; else add('priority', String(b.priority).toLowerCase()); }
    if ('status' in b) { if (!STATUSES.includes(b.status)) d.status = 'status must be todo, in_progress or done'; else add('status', b.status); }
    if (Object.keys(d).length) throw badRequest('Validation failed', d);
    if (!sets.length) throw badRequest('Validation failed', { body: 'no editable fields supplied' });
    vals.push(t.id);
    const { rows } = await db.query(`UPDATE tasks SET ${sets.join(', ')} WHERE id = $${vals.length} RETURNING *`, vals);
    res.json(toTask(rows[0]));
  } catch (e) { next(e); }
});

module.exports = { router };

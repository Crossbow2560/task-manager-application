// FR-11: GET /projects/:id/tasks?q=keyword  (search title and description, project members only)
const express = require('express');
const db = require('../../../src/db');
const { requireAuth } = require('../../../src/middleware/auth');
const { forbidden, notFound } = require('../../../src/errors');
const { getMemberRole } = require('../../project/model');
const { toTask } = require('../create/routes');
const { listTasks } = require('./listing');

const router = express.Router();

router.get('/projects/:id/tasks', requireAuth, async (req, res, next) => {
  try {
    const projectId = Number(req.params.id);
    if (!Number.isInteger(projectId)) throw notFound('Project not found');
    if (!(await db.query('SELECT 1 FROM projects WHERE id = $1', [projectId])).rows[0]) throw notFound('Project not found');
    if (!(await getMemberRole(projectId, req.user.id))) throw forbidden('Not a member of this project');
    res.json((await listTasks(projectId, req.query)).map(toTask));
  } catch (e) { next(e); }
});

module.exports = { router };

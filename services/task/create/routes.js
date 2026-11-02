// FR-03: POST /projects/:id/tasks
const express = require('express');
const db = require('../../../src/db');
const { requireAuth } = require('../../../src/middleware/auth');
const { badRequest, forbidden, notFound } = require('../../../src/errors');
const { getMemberRole } = require('../../project/model');

const PRIORITIES = ['low', 'medium', 'high'];
const router = express.Router();

function validate(body) {
  const d = {};
  const { title, description, dueDate, priority } = body || {};
  if (typeof title !== 'string' || !title.trim() || title.length > 200) d.title = 'title is required (max 200 chars)';
  if (description != null && typeof description !== 'string') d.description = 'description must be a string';
  if (dueDate != null && (typeof dueDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || Number.isNaN(Date.parse(dueDate)))) d.dueDate = 'dueDate must be YYYY-MM-DD';
  if (priority != null && !PRIORITIES.includes(String(priority).toLowerCase())) d.priority = 'priority must be low, medium or high';
  return d;
}

const toTask = (r) => ({
  id: r.id, projectId: r.project_id, creatorId: r.creator_id, title: r.title, description: r.description,
  dueDate: r.due_date, priority: r.priority, status: r.status, createdAt: r.created_at,
});

router.post('/projects/:id/tasks', requireAuth, async (req, res, next) => {
  try {
    const projectId = Number(req.params.id);
    if (!Number.isInteger(projectId)) throw notFound('Project not found');
    const exists = (await db.query('SELECT 1 FROM projects WHERE id = $1', [projectId])).rows[0];
    if (!exists) throw notFound('Project not found');
    if (!(await getMemberRole(projectId, req.user.id))) throw forbidden('Not a member of this project');
    const details = validate(req.body);
    if (Object.keys(details).length) throw badRequest('Validation failed', details);
    const { title, description, dueDate, priority } = req.body;
    const { rows } = await db.query(
      `INSERT INTO tasks (project_id, creator_id, title, description, due_date, priority)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [projectId, req.user.id, title.trim(), description || null, dueDate || null, (priority || 'medium').toLowerCase()],
    );
    res.status(201).json(toTask(rows[0]));
  } catch (e) { next(e); }
});

module.exports = { router, toTask, PRIORITIES };

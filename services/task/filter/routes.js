// FR-12 (#16): filter the project task list by status, assignee, priority and due-date range.
//   GET /projects/:id/tasks?status=done&priority=high&assignee=3&dueFrom=2026-01-01&dueTo=2026-01-31
// Registers on the extension point in ../search/listing, so it adds no route of its own.
// Filters combine with each other and with the keyword search (q).
const express = require('express');
const { badRequest } = require('../../../src/errors');
const { registerFilter } = require('../search/listing');

const STATUSES = ['todo', 'in_progress', 'done'];
const PRIORITIES = ['low', 'medium', 'high'];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const bad = (field, msg) => badRequest('Validation failed', { [field]: msg });
const isDate = (v) => typeof v === 'string' && DATE.test(v) && !Number.isNaN(Date.parse(v));

function filter(query) {
  const conds = [];
  const values = [];
  const add = (sql, v) => { conds.push(sql); values.push(v); };
  const present = (k) => query[k] !== undefined && query[k] !== '';

  if (present('status')) {
    if (!STATUSES.includes(query.status)) throw bad('status', 'status must be todo, in_progress or done');
    add('t.status = ?', query.status);
  }
  if (present('priority')) {
    if (typeof query.priority !== 'string' || !PRIORITIES.includes(query.priority.toLowerCase())) throw bad('priority', 'priority must be low, medium or high');
    add('t.priority = ?', query.priority.toLowerCase());
  }
  if (present('assignee')) {
    if (typeof query.assignee !== 'string' || !/^\d+$/.test(query.assignee)) throw bad('assignee', 'assignee must be a user id');
    add('t.id IN (SELECT a.task_id FROM task_assignees a WHERE a.user_id = ?)', Number(query.assignee));
  }
  if (present('dueFrom')) {
    if (!isDate(query.dueFrom)) throw bad('dueFrom', 'dueFrom must be YYYY-MM-DD');
    add('t.due_date >= ?', query.dueFrom);
  }
  if (present('dueTo')) {
    if (!isDate(query.dueTo)) throw bad('dueTo', 'dueTo must be YYYY-MM-DD');
    add('t.due_date <= ?', query.dueTo);
  }
  if (present('dueFrom') && present('dueTo') && query.dueFrom > query.dueTo) throw bad('dueTo', 'dueTo must not be before dueFrom');
  return conds.length ? { sql: conds.join(' AND '), values } : null;
}

registerFilter(filter);

module.exports = { router: express.Router(), filter };

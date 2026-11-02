// FR-08: POST /projects, GET /projects
const express = require('express');
const { requireAuth } = require('../../../src/middleware/auth');
const { badRequest } = require('../../../src/errors');
const model = require('../model');

const router = express.Router();

router.post('/projects', requireAuth, async (req, res, next) => {
  try {
    const { name } = req.body || {};
    if (typeof name !== 'string' || !name.trim() || name.length > 100) {
      throw badRequest('Validation failed', { name: 'name is required (max 100 chars)' });
    }
    res.status(201).json(await model.createProject(req.user.id, name.trim()));
  } catch (e) { next(e); }
});

router.get('/projects', requireAuth, async (req, res, next) => {
  try {
    res.json(await model.listProjectsForUser(req.user.id));
  } catch (e) { next(e); }
});

module.exports = { router };

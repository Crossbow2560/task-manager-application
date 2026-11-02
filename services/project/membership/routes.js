// FR-15 (#19): POST /projects/:id/members, DELETE /projects/:id/members/:userId
// Only a team_manager of the project may add or remove members.
const express = require('express');
const db = require('../../../src/db');
const { requireAuth } = require('../../../src/middleware/auth');
const { badRequest, forbidden, notFound, conflict } = require('../../../src/errors');
const { ROLES, getMemberRole } = require('../model');

const router = express.Router();

const toId = (v) => (/^\d+$/.test(String(v)) ? Number(v) : null);

// Loads the project and checks that the caller manages it. 404 if it doesn't exist, 403 otherwise.
async function requireManager(req) {
  const projectId = toId(req.params.id);
  const project = projectId && (await db.query('SELECT id, owner_id FROM projects WHERE id = $1', [projectId])).rows[0];
  if (!project) throw notFound('Project not found');
  if ((await getMemberRole(projectId, req.user.id)) !== ROLES.MANAGER) {
    throw forbidden('Only a team manager of this project can manage its members');
  }
  return project;
}

router.post('/projects/:id/members', requireAuth, async (req, res, next) => {
  try {
    const project = await requireManager(req);
    const { userId, email } = req.body || {};
    let user;
    if (userId !== undefined && toId(userId)) {
      user = (await db.query('SELECT id, email, display_name, is_active FROM users WHERE id = $1', [toId(userId)])).rows[0];
    } else if (typeof email === 'string' && email) {
      user = (await db.query('SELECT id, email, display_name, is_active FROM users WHERE email = $1', [email.trim().toLowerCase()])).rows[0];
    } else {
      throw badRequest('Validation failed', { userId: 'userId or email is required' });
    }
    if (!user || !user.is_active) throw notFound('User not found');
    if (await getMemberRole(project.id, user.id)) throw conflict('User is already a member of this project');

    await db.query('INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3)', [project.id, user.id, ROLES.MEMBER]);
    res.status(201).json({ projectId: project.id, userId: user.id, email: user.email, displayName: user.display_name, role: ROLES.MEMBER });
  } catch (e) { next(e); }
});

router.delete('/projects/:id/members/:userId', requireAuth, async (req, res, next) => {
  try {
    const project = await requireManager(req);
    const userId = toId(req.params.userId);
    if (!userId || !(await getMemberRole(project.id, userId))) throw notFound('Member not found');
    if (userId === project.owner_id) throw badRequest('The project owner cannot be removed');

    await db.query('DELETE FROM project_members WHERE project_id = $1 AND user_id = $2', [project.id, userId]);
    res.status(204).end();
  } catch (e) { next(e); }
});

module.exports = { router };

// Project model, shared with other modules (task RBAC, membership, dashboard).
// Tables: projects(id, name, owner_id), project_members(project_id, user_id, role)
// Member roles: 'team_manager' (the creator) or 'member'.
const db = require('../../src/db');

const ROLES = { MANAGER: 'team_manager', MEMBER: 'member' };

async function createProject(ownerId, name) {
  const p = (await db.query(
    'INSERT INTO projects (name, owner_id) VALUES ($1, $2) RETURNING id, name, owner_id, created_at',
    [name, ownerId],
  )).rows[0];
  await db.query('INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3)', [p.id, ownerId, ROLES.MANAGER]);
  return toProject(p, ROLES.MANAGER);
}

async function listProjectsForUser(userId) {
  const { rows } = await db.query(
    `SELECT p.id, p.name, p.owner_id, p.created_at, m.role
     FROM projects p JOIN project_members m ON m.project_id = p.id
     WHERE m.user_id = $1 ORDER BY p.id`,
    [userId],
  );
  return rows.map((r) => toProject(r, r.role));
}

// Returns the member's role in the project, or null if not a member.
async function getMemberRole(projectId, userId) {
  const { rows } = await db.query('SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2', [projectId, userId]);
  return rows[0] ? rows[0].role : null;
}

const toProject = (r, role) => ({ id: r.id, name: r.name, ownerId: r.owner_id, createdAt: r.created_at, role });

module.exports = { ROLES, createProject, listProjectsForUser, getMemberRole };

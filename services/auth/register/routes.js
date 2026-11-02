// FR-01: POST /auth/register
const express = require('express');
const db = require('../../../src/db');
const { badRequest, conflict } = require('../../../src/errors');
const { hashPassword, passwordPolicyError } = require('../password');

const router = express.Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/auth/register', async (req, res, next) => {
  try {
    const { email, password, displayName } = req.body || {};
    const details = {};
    if (typeof email !== 'string' || !EMAIL_RE.test(email) || email.length > 254) details.email = 'valid email is required';
    const pwErr = passwordPolicyError(password);
    if (pwErr) details.password = pwErr;
    if (typeof displayName !== 'string' || !displayName.trim() || displayName.length > 100) details.displayName = 'displayName is required (max 100 chars)';
    if (Object.keys(details).length) throw badRequest('Validation failed', details);

    const normalized = email.trim().toLowerCase();
    const hash = await hashPassword(password);
    let row;
    try {
      row = (await db.query(
        'INSERT INTO users (email, password_hash, display_name) VALUES ($1, $2, $3) RETURNING id, email, display_name, role',
        [normalized, hash, displayName.trim()],
      )).rows[0];
    } catch (e) {
      if (e.code === '23505' || /unique|duplicate/i.test(e.message)) throw conflict('Email already registered');
      throw e;
    }
    res.status(201).json({ id: row.id, email: row.email, displayName: row.display_name, role: row.role });
  } catch (e) { next(e); }
});

module.exports = { router };

// FR-02: POST /auth/login
const express = require('express');
const db = require('../../../src/db');
const { badRequest, unauthorized } = require('../../../src/errors');
const { signTokens } = require('../../../src/middleware/auth');
const { hashPassword, verifyPassword } = require('../password');
const { runHooks } = require('./hooks');

const router = express.Router();

// Compared against when the email is unknown, so response time doesn't reveal which emails exist.
let dummyHash;
const getDummyHash = () => (dummyHash = dummyHash || hashPassword('dummy-password-1'));

router.post('/auth/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
      throw badRequest('email and password are required');
    }
    const normalized = email.trim().toLowerCase();
    const user = (await db.query('SELECT * FROM users WHERE email = $1', [normalized])).rows[0];

    await runHooks('beforeAttempt', { email: normalized, user });

    const passwordOk = await verifyPassword(password, user ? user.password_hash : await getDummyHash());
    if (!user || !passwordOk || !user.is_active) {
      await runHooks('onFailure', { email: normalized, user });
      throw unauthorized('Invalid credentials');
    }

    await runHooks('onSuccess', { email: normalized, user });
    res.json({
      ...signTokens(user),
      user: { id: user.id, email: user.email, displayName: user.display_name, role: user.role },
    });
  } catch (e) { next(e); }
});

module.exports = { router };

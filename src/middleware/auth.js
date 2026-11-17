const jwt = require('jsonwebtoken');
const config = require('../config');
const { unauthorized } = require('../errors');
const db = require('../db');

function signTokens(user) {
  const payload = { sub: user.id, role: user.role };
  return {
    accessToken: jwt.sign({ ...payload, typ: 'access' }, config.jwtSecret, { expiresIn: config.accessTtl }),
    refreshToken: jwt.sign({ ...payload, typ: 'refresh' }, config.jwtSecret, { expiresIn: config.refreshTtl }),
  };
}

// Sets req.user = { id, role }, or passes a 401 to the error handler.
async function requireAuth(req, res, next) {
  const m = /^Bearer (.+)$/.exec(req.get('authorization') || '');
  if (!m) return next(unauthorized('Missing bearer token'));
  try {
    const p = jwt.verify(m[1], config.jwtSecret);
    if (p.typ !== 'access') return next(unauthorized('Invalid token'));
    const user = (await db.query('SELECT id, role, is_active FROM users WHERE id = $1', [p.sub])).rows[0];
    if (!user || !user.is_active) return next(unauthorized('Account is inactive or unavailable'));
    req.user = { id: user.id, role: user.role };
    next();
  } catch (e) {
    if (e.name === 'JsonWebTokenError' || e.name === 'TokenExpiredError' || e.name === 'NotBeforeError') return next(unauthorized('Invalid or expired token'));
    next(e);
  }
}

module.exports = { signTokens, requireAuth };

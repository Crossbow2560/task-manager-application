const jwt = require('jsonwebtoken');
const config = require('../config');
const { unauthorized } = require('../errors');

function signTokens(user) {
  const payload = { sub: user.id, role: user.role };
  return {
    accessToken: jwt.sign({ ...payload, typ: 'access' }, config.jwtSecret, { expiresIn: config.accessTtl }),
    refreshToken: jwt.sign({ ...payload, typ: 'refresh' }, config.jwtSecret, { expiresIn: config.refreshTtl }),
  };
}

// Sets req.user = { id, role }, or passes a 401 to the error handler.
function requireAuth(req, res, next) {
  const m = /^Bearer (.+)$/.exec(req.get('authorization') || '');
  if (!m) return next(unauthorized('Missing bearer token'));
  try {
    const p = jwt.verify(m[1], config.jwtSecret);
    if (p.typ !== 'access') return next(unauthorized('Invalid token'));
    req.user = { id: p.sub, role: p.role };
    next();
  } catch (e) {
    next(unauthorized('Invalid or expired token'));
  }
}

module.exports = { signTokens, requireAuth };

// Extension point for account lockout (SEC-REQ-04, #14) and any other login policy.
//
// Register from your own module (e.g. services/auth/lockout/routes.js, which the route
// registry loads automatically):
//
//   const { registerLoginHook } = require('../login/hooks');
//   registerLoginHook({
//     beforeAttempt: async ({ email, user }) => { /* throw locked() to refuse with 423 */ },
//     onFailure:     async ({ email, user }) => { /* wrong password / unknown / inactive */ },
//     onSuccess:     async ({ email, user }) => { /* e.g. reset the failure counter */ },
//   });
//
// `user` is the DB row ({ id, email, role, ... }) or undefined when the email is unknown.
// All callbacks are optional. beforeAttempt runs before the password is checked.
const hooks = [];

function registerLoginHook(hook) { hooks.push(hook); }

async function runHooks(name, ctx) {
  for (const h of hooks) if (typeof h[name] === 'function') await h[name](ctx);
}

function clearLoginHooks() { hooks.length = 0; }

module.exports = { registerLoginHook, runHooks, clearLoginHooks };

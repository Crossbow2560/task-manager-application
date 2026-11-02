// SEC-REQ-04 (#14): lock an account for 15 minutes after 5 consecutive failed logins within a
// 15-minute window. Registers itself on the login hooks; exposes no routes of its own.
const express = require('express');
const db = require('../../../src/db');
const { locked } = require('../../../src/errors');
const { registerLoginHook } = require('../login/hooks');

const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;

let clock = () => new Date();
function setClock(fn) { clock = fn; }

async function getRow(email) {
  return (await db.query('SELECT * FROM login_throttle WHERE email = $1', [email])).rows[0];
}

async function beforeAttempt({ email }) {
  const row = await getRow(email);
  if (row && row.locked_until && new Date(row.locked_until) > clock()) {
    const minutes = Math.ceil((new Date(row.locked_until) - clock()) / 60000);
    throw locked(`Too many failed attempts. Try again in ${minutes} minute(s).`);
  }
}

// Failures are tracked by email (including unknown emails) so lockout doesn't reveal which exist.
async function onFailure({ email }) {
  const now = clock();
  const row = await getRow(email);
  const inWindow = row && row.window_start && now - new Date(row.window_start) <= WINDOW_MS;
  const count = (inWindow ? row.fail_count : 0) + 1;
  const windowStart = inWindow ? row.window_start : now;
  const lockedUntil = count >= MAX_FAILURES ? new Date(now.getTime() + LOCK_MS) : null;
  const next = lockedUntil ? { count: 0, windowStart: null } : { count, windowStart };
  await db.query(
    `INSERT INTO login_throttle (email, fail_count, window_start, locked_until) VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE SET fail_count = $2, window_start = $3, locked_until = $4`,
    [email, next.count, next.windowStart, lockedUntil],
  );
}

async function onSuccess({ email }) {
  await db.query('DELETE FROM login_throttle WHERE email = $1', [email]);
}

registerLoginHook({ beforeAttempt, onFailure, onSuccess });

module.exports = { router: express.Router(), setClock, MAX_FAILURES, WINDOW_MS, LOCK_MS };

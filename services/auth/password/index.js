// SEC-REQ-01: bcrypt hashing (cost >= 10). Plaintext passwords are never stored or logged.
const bcrypt = require('bcryptjs');
const config = require('../../../src/config');

const MIN_COST = 10;
const MIN_LENGTH = 8;
const MAX_LENGTH = 72; // bcrypt ignores bytes beyond 72

const cost = () => Math.max(config.bcryptCost, MIN_COST);

const hashPassword = (plain) => bcrypt.hash(plain, cost());
const verifyPassword = (plain, hash) => bcrypt.compare(plain, hash);

// Returns an error message, or null if acceptable.
function passwordPolicyError(plain) {
  if (typeof plain !== 'string') return 'password is required';
  if (plain.length < MIN_LENGTH) return `password must be at least ${MIN_LENGTH} characters`;
  if (Buffer.byteLength(plain) > MAX_LENGTH) return `password must be at most ${MAX_LENGTH} bytes`;
  if (!/[A-Za-z]/.test(plain) || !/\d/.test(plain)) return 'password must contain a letter and a digit';
  return null;
}

module.exports = { hashPassword, verifyPassword, passwordPolicyError, MIN_COST };

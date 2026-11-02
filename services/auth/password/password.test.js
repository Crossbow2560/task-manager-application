const { hashPassword, verifyPassword, passwordPolicyError, MIN_COST } = require('./index');

test('hash is bcrypt with cost >= 10 and verifies', async () => {
  const h = await hashPassword('Secret123');
  expect(h).not.toContain('Secret123');
  expect(Number(h.split('$')[2])).toBeGreaterThanOrEqual(MIN_COST);
  expect(await verifyPassword('Secret123', h)).toBe(true);
  expect(await verifyPassword('wrong', h)).toBe(false);
});

test('same password hashes differently (salted)', async () => {
  expect(await hashPassword('Secret123')).not.toBe(await hashPassword('Secret123'));
});

test('policy', () => {
  expect(passwordPolicyError('Secret123')).toBeNull();
  expect(passwordPolicyError(undefined)).toMatch(/required/);
  expect(passwordPolicyError('a1')).toMatch(/at least/);
  expect(passwordPolicyError('abcdefgh')).toMatch(/letter and a digit/);
  expect(passwordPolicyError('a1' + 'x'.repeat(80))).toMatch(/at most/);
});

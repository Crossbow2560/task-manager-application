// Explicit opt-in seed for local demo/validation databases only.
const db = require('../src/db');
const migrate = require('../src/db/migrate');
const { hashPassword, passwordPolicyError } = require('../services/auth/password');
(async () => {
  const password=process.env.DEMO_PASSWORD;
  if (passwordPolicyError(password)) throw new Error('Set DEMO_PASSWORD to a valid demo-only password (8+ characters, letter and digit).');
  await migrate();
  const hash=await hashPassword(password);
  for (const [email,name,role] of [['admin@taskmanager.test','Demo Admin','admin'],['manager@taskmanager.test','Demo Manager','member'],['member@taskmanager.test','Demo Member','member']]) {
    await db.query('INSERT INTO users (email,password_hash,display_name,role) VALUES ($1,$2,$3,$4) ON CONFLICT (email) DO NOTHING',[email,hash,name,role]);
  }
  console.log('Demo accounts available: admin@taskmanager.test, manager@taskmanager.test, member@taskmanager.test. Existing accounts were not overwritten.');
})().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>db.getPool().end());

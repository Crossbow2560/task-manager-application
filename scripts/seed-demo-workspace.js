// Synthetic local demo fixture. Does not alter initial documents or validation data.
const db = require('../src/db');
const migrate = require('../src/db/migrate');
const { hashPassword, passwordPolicyError } = require('../services/auth/password');

(async () => {
  const url = new URL(process.env.DATABASE_URL || 'postgres://localhost/taskmanager');
  if (url.pathname !== '/taskmanager_demo' || !['127.0.0.1','localhost','[::1]'].includes(url.hostname)) {
    throw new Error('Use the dedicated local taskmanager_demo database. This seeder refuses other databases.');
  }
  const password = process.env.DEMO_PASSWORD;
  if (passwordPolicyError(password)) throw new Error('Set DEMO_PASSWORD (8+ characters, letter and digit).');
  await migrate();
  const reset = process.env.DEMO_RESET === '1';
  const accounts = [
    ['admin@demo.test','Demo Admin','admin'],
    ['manager@demo.test','Demo Manager','member'],
    ['member@demo.test','Demo Teammate','member'],
    ['temporary@demo.test','Temporary Demo User','member'],
    ['outsider@demo.test','Outside Project User','member'],
  ];
  const ids = {};
  for (const [email,name,role] of accounts) {
    const hash = await hashPassword(password);
    await db.query('INSERT INTO users (email,password_hash,display_name,role) VALUES ($1,$2,$3,$4) ON CONFLICT (email) DO NOTHING',[email,hash,name,role]);
    if (reset) {
      await db.query('UPDATE users SET password_hash=$1,display_name=$2,role=$3,is_active=true WHERE email=$4',[hash,name,role,email]);
      await db.query('DELETE FROM login_throttle WHERE email=$1',[email]);
    }
    ids[email] = (await db.query('SELECT id FROM users WHERE email=$1',[email])).rows[0].id;
  }
  const projectName = 'Website Release - Demo';
  let project = (await db.query('SELECT id FROM projects WHERE name=$1 AND owner_id=$2',[projectName,ids['admin@demo.test']])).rows[0];
  const fresh = !project;
  if (!project) project = (await db.query('INSERT INTO projects (name,owner_id) VALUES ($1,$2) RETURNING id',[projectName,ids['admin@demo.test']])).rows[0];
  if (reset) {
    await db.query('DELETE FROM tasks WHERE project_id=$1',[project.id]);
    await db.query('DELETE FROM project_members WHERE project_id=$1',[project.id]);
  }
  for (const [email,role] of [['admin@demo.test','team_manager'],['manager@demo.test','team_manager'],['member@demo.test','member']]) {
    await db.query('INSERT INTO project_members (project_id,user_id,role) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',[project.id,ids[email],role]);
  }
  if (fresh || reset) {
    const day = (n) => new Date(Date.now()+n*86400000).toISOString().slice(0,10);
    const samples = [
      ['Review homepage','Check layout, navigation and final content.','high','todo',day(2)],
      ['Fix mobile navigation','Confirm the menu works at a narrow viewport.','medium','in_progress',day(3)],
      ['Prepare release notes','Summarize the completed work for the team.','low','done',day(1)],
      ['Disposable task - delete me','Use this spare task to demonstrate deletion.','low','todo',null],
    ];
    for (const [title,description,priority,status,due] of samples) {
      const t=(await db.query('INSERT INTO tasks (project_id,creator_id,title,description,priority,status,due_date) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
        [project.id,ids['admin@demo.test'],title,description,priority,status,due])).rows[0];
      await db.query('INSERT INTO task_assignees (task_id,user_id) VALUES ($1,$2)',[t.id,ids['member@demo.test']]);
      if (title==='Review homepage') {
        await db.query('INSERT INTO task_assignees (task_id,user_id) VALUES ($1,$2)',[t.id,ids['admin@demo.test']]);
        await db.query('INSERT INTO comments (task_id,author_id,body) VALUES ($1,$2,$3)',[t.id,ids['member@demo.test'],'I will review the homepage and update the task status.']);
      }
    }
  }
  console.log(JSON.stringify({database:'taskmanager_demo',projectId:project.id,project:projectName,accounts:accounts.map(([email,name,role])=>({email,name,role})),reset,createdSampleTasks:fresh||reset},null,2));
})().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>db.getPool().end());

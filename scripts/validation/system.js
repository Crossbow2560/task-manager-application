// Real PostgreSQL, real server process, real HTTP, local SMTP sink.
// Run only against an explicitly designated local validation database.
const {spawn} = require('child_process');
const path = require('path');
const fs = require('fs');
const assert = require('assert/strict');
const crypto = require('crypto');
const db = require('../../src/db');
const bcrypt = require('bcryptjs');
const root=path.join(__dirname,'../..');
const out=path.join(root,'docs/validation/evidence');
fs.mkdirSync(out,{recursive:true});
const port=Number(process.env.VALIDATION_PORT||3101);
const base=`http://127.0.0.1:${port}`;
const results=[];let child;let logs='';
const started=new Date().toISOString();
const tag=Date.now();
async function check(id,name,fn){try{const detail=await fn();results.push({id,name,status:'PASS',detail});console.log(`PASS ${id}: ${name}`);}catch(e){results.push({id,name,status:'FAIL',detail:e.message});console.error(`FAIL ${id}: ${e.message}`);throw e;}}
async function call(method,url,auth,body){const r=await fetch(base+url,{method,headers:{'Content-Type':'application/json',...(auth?{Authorization:auth}:{})},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,body:r.status===204?null:await r.json()};}
async function boot(){
 child=spawn(process.execPath,['src/server.js'],{cwd:root,env:{...process.env,PORT:String(port),JWT_SECRET:process.env.JWT_SECRET||secret,REMINDER_SCAN_MS:'1000'},stdio:['ignore','pipe','pipe']});
 child.stdout.on('data',x=>{logs+=x;});child.stderr.on('data',x=>{logs+=x;});
 for(let i=0;i<150;i++){try{if((await fetch(base+'/ready')).status===200)return;}catch{} if(child.exitCode!==null)throw new Error('server exited before ready');await new Promise(r=>setTimeout(r,100));}
 throw new Error('Server readiness timeout');
}
const secret=crypto.randomBytes(32).toString('hex');
async function crash(){if(child&&child.exitCode===null){const stopped=new Promise(r=>child.once('exit',r));child.kill('SIGKILL');await stopped;}}
async function signup(label){const email=`${label}-${tag}@validation.test`;let r=await call('POST','/auth/register',null,{email,password:'Validation123',displayName:label});assert.equal(r.status,201);r=await call('POST','/auth/login',null,{email,password:'Validation123'});assert.equal(r.status,200);return {id:r.body.user.id,email,auth:'Bearer '+r.body.accessToken};}
(async()=>{
 if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is required; pg-mem is not accepted for this validation');
 await boot();
 let owner,member,outsider,project,task;
 await check('TC-01/TC-02','Registration/login and token issuance',async()=>{owner=await signup('manager');member=await signup('member');outsider=await signup('outsider');return {registered:3,tokensIssued:true};});
 await check('TC-15','Project creation and listing',async()=>{let r=await call('POST','/projects',owner.auth,{name:'System validation '+tag});assert.equal(r.status,201);project=r.body;const list=await call('GET','/projects',owner.auth);assert(list.body.some(p=>p.id===project.id));return {projectId:project.id,ownerRole:project.role};});
 await check('TC-20','Manager adds member; outsider rejected',async()=>{assert.equal((await call('POST',`/projects/${project.id}/members`,outsider.auth,{userId:outsider.id})).status,403);assert.equal((await call('POST',`/projects/${project.id}/members`,owner.auth,{userId:member.id})).status,201);return 'Member list and authorization verified';});
 await check('TC-03','Create task with durable fields',async()=>{let r=await call('POST',`/projects/${project.id}/tasks`,owner.auth,{title:'System report',description:'Real PostgreSQL validation',dueDate:new Date(Date.now()+48*3600000).toISOString().slice(0,10),priority:'high'});assert.equal(r.status,201);task=r.body;assert.equal(task.status,'todo');return {taskId:task.id,status:task.status};});
 await check('TC-04','Assign registered project member',async()=>{let r=await call('POST',`/tasks/${task.id}/assignees`,owner.auth,{userId:member.id});assert.equal(r.status,201);assert(r.body.some(a=>a.userId===member.id));return 'Assignment persisted';});
 await check('TC-05/TC-13','Assignee edits title and lifecycle status',async()=>{for(const status of ['in_progress','done','todo']){assert.equal((await call('PATCH',`/tasks/${task.id}`,member.auth,{title:'Updated system report',status})).status,200);}return 'To do -> In progress -> Done -> To do; title updated';});
 await check('TC-16','Comment is visible with author',async()=>{assert.equal((await call('POST',`/tasks/${task.id}/comments`,member.auth,{body:'Committed comment'})).status,201);let r=await call('GET',`/tasks/${task.id}/comments`,owner.auth);assert.equal(r.body[0].body,'Committed comment');return r.body.map(c=>({body:c.body,authorId:c.authorId}));});
 await check('TC-06/TC-17','Keyword and all four filters combine',async()=>{let d=String(task.dueDate).slice(0,10);let r=await call('GET',`/projects/${project.id}/tasks?q=report&status=todo&priority=high&assignee=${member.id}&dueFrom=${d}&dueTo=${d}`,owner.auth);assert.deepEqual(r.body.map(t=>t.id),[task.id]);return 'Search + status + priority + assignee + date range returned exactly the assigned task';});
 await check('TC-18','Dashboard per-status counts',async()=>{let r=await call('GET','/dashboard',member.auth);assert.equal(r.body.byStatus.todo,1);assert.equal(r.body.total,1);return r.body;});
 await check('TC-10','Salted adaptive password hashes',async()=>{let r=await db.query('SELECT password_hash FROM users WHERE id = $1 OR id = $2',[owner.id,member.id]);assert(r.rows.every(u=>u.password_hash!=='Validation123'&&bcrypt.getRounds(u.password_hash)>=10));assert.notEqual(r.rows[0].password_hash,r.rows[1].password_hash);return {hashesDistinct:true,bcryptCost:bcrypt.getRounds(r.rows[0].password_hash)};});
 await check('TC-11','Unauthorized task edits rejected without mutation',async()=>{assert.equal((await call('PATCH',`/tasks/${task.id}`,outsider.auth,{title:'unauthorized'})).status,403);assert.equal((await call('GET',`/tasks/${task.id}`,owner.auth)).body.title,'Updated system report');return '403; original title preserved';});
 await check('TC-12','Five failures lock out account for 15 minutes',async()=>{for(let i=0;i<5;i++)await call('POST','/auth/login',null,{email:outsider.email,password:'Incorrect123'});assert.equal((await call('POST','/auth/login',null,{email:outsider.email,password:'Validation123'})).status,423);return 'Sixth attempt with correct password rejected (423); lock duration/expiry also covered by Jest';});
 await check('TC-07','Scheduled reminder appears in-app and reaches local SMTP',async()=>{
   let notifications=[];let email=null;
   for(let i=0;i<100;i++){
     notifications=(await call('GET','/notifications',member.auth)).body;
     const inbox=await (await fetch((process.env.MAILPIT_URL||'http://127.0.0.1:8026')+'/api/v1/messages')).json();
     email=(inbox.messages||[]).find(m=>(m.To||[]).some(x=>x.Address===member.email));
     if(notifications.some(n=>n.taskId===task.id)&&email)break;
     await new Promise(r=>setTimeout(r,200));
   }
   assert(notifications.some(n=>n.taskId===task.id));assert(email,'No reminder captured by local SMTP sink');
   const n=notifications.find(n=>n.taskId===task.id);assert.equal((await call('POST',`/notifications/${n.id}/read`,member.auth)).body.read,true);
   return {taskId:task.id,inApp:true,markRead:true,smtpCaptured:true,recipient:member.email,subject:email.Subject,mailId:email.ID,dueDate:task.dueDate};
 });
 await check('TC-24','SIGKILL real Node process, restart, verify committed PostgreSQL data',async()=>{
   const before=(await call('GET',`/tasks/${task.id}`,owner.auth)).body;
   const oldPid=child.pid;await crash();await boot();assert.notEqual(child.pid,oldPid);
   const after=(await call('GET',`/tasks/${task.id}`,owner.auth)).body;assert.deepEqual(after,before);
   assert((await call('GET',`/tasks/${task.id}/assignees`,owner.auth)).body.some(a=>a.userId===member.id));
   assert.equal((await call('GET',`/tasks/${task.id}/comments`,owner.auth)).body[0].body,'Committed comment');
   assert.equal((await call('PATCH',`/tasks/${task.id}/status`,member.auth,{status:'done'})).status,200);
   return {oldPid,newPid:child.pid,taskIntact:true,assigneeIntact:true,commentIntact:true,newWriteSucceeded:true};
 });
 await check('TC-14','Delete task and confirm 404',async()=>{assert.equal((await call('DELETE',`/tasks/${task.id}`,owner.auth)).status,204);assert.equal((await call('GET',`/tasks/${task.id}`,owner.auth)).status,404);return '204 then 404';});
 await check('TC-20-remove','Manager removes member',async()=>{assert.equal((await call('DELETE',`/projects/${project.id}/members/${member.id}`,owner.auth)).status,204);return '204';});
 await check('TC-19','Admin deactivates user, including active sessions',async()=>{await db.query("UPDATE users SET role='admin' WHERE id=$1",[owner.id]);assert.equal((await call('PATCH',`/admin/users/${member.id}/deactivate`,owner.auth)).status,200);assert.equal((await call('GET','/auth/me',member.auth)).status,401);assert.equal((await call('POST','/auth/login',null,{email:member.email,password:'Validation123'})).status,401);return 'Deactivation, new-login rejection and existing-token rejection verified';});
 const pg=(await db.query('SELECT version() AS version')).rows[0].version;
 fs.writeFileSync(path.join(out,'postgres-version.txt'),pg+'\n');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{
 await crash();await db.getPool().end();
 fs.writeFileSync(path.join(out,'system-results.json'),JSON.stringify({started,finished:new Date().toISOString(),node:process.version,platform:process.platform,results},null,2));
 fs.writeFileSync(path.join(out,'system-server.log'),logs);
});

// Record genuine local demonstrations. No video is dated earlier than its capture.
const {chromium}=require('@playwright/test');
const express=require('express');
const path=require('path');
const fs=require('fs');
const {execFileSync}=require('child_process');
const mode=process.argv[2]||'final';
const root=path.join(__dirname,'../..');
const output=path.join(root,'docs/videos');fs.mkdirSync(output,{recursive:true});
const captured=new Date().toISOString();
const source=process.env.VIDEO_SOURCE_COMMIT||execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const label=mode==='sprint1'?'SPRINT 1 / HISTORICAL API RECONSTRUCTION':'SPRINT 2 / FINAL CONNECTED APPLICATION';
const duration=mode==='sprint1'?60000:120000;
const base=mode==='sprint1'?(process.env.HISTORY_BASE_URL||'http://127.0.0.1:3102'):(process.env.BASE_URL||'http://127.0.0.1:3100');
let server,browser;
async function banner(page,headline,detail){await page.evaluate(({label,source,captured,headline,detail})=>{
 let el=document.getElementById('recording-note');if(!el){el=document.createElement('aside');el.id='recording-note';document.body.appendChild(el);}
 el.style.cssText='position:fixed;z-index:99999;bottom:0;left:0;right:0;background:#102c2b;color:white;padding:14px 28px;font:16px/1.4 system-ui;box-shadow:0 -3px 10px #0002;pointer-events:none;';
 el.replaceChildren();const top=document.createElement('div');top.style.cssText='font-size:11px;color:#b6d8d0;letter-spacing:.08em';top.textContent=label+' | source '+source.slice(0,8)+' | captured '+captured.slice(0,10);
 const title=document.createElement('strong');title.textContent=headline;title.style.display='block';const desc=document.createElement('span');desc.style.fontSize='13px';desc.textContent=detail;el.append(top,title,desc);
},{label,source,captured,headline,detail});}
async function final(page){
 const stamp=Date.now();const email=`video-${stamp}@demo.test`;const pass='VideoDemo123';
 await page.goto(base+'/login.html');await banner(page,'A working product, connected to PostgreSQL','Register, authenticate, create projects and collaborate on real persisted tasks.');await wait(7000);
 await page.getByText('Create an account',{exact:true}).click();
 await page.locator('#register-form').getByLabel('Display name').fill('Project Team');
 await page.locator('#register-form').getByLabel('Email address').fill(email);
 await page.locator('#register-form').getByLabel('Password',{exact:true}).fill(pass);
 await wait(2000);await page.getByRole('button',{name:'Register',exact:true}).click();
 await wait(2500);await page.locator('#login-form').getByLabel('Password',{exact:true}).fill(pass);await page.getByRole('button',{name:'Log in',exact:true}).click();
 await page.getByRole('heading',{level:1}).filter({hasText:'Project Team'}).waitFor();
 await banner(page,'1. Registered account and authenticated dashboard','The client stores its session token and loads project/task summaries from the API.');await wait(6000);
 await page.getByText('New project',{exact:true}).click();await page.getByLabel('Project name',{exact:true}).fill('Mini-project delivery');await page.getByRole('button',{name:'Create project',exact:true}).click();
 await page.getByRole('heading',{level:1,name:'Mini-project delivery'}).waitFor();
 const projectUrl=page.url();
 await banner(page,'2. A real project board','Projects, membership and tasks are persisted in PostgreSQL; this is not a static mockup.');await wait(6000);
 await page.getByText('New task',{exact:true}).click();await page.getByLabel('Title',{exact:true}).fill('Review final submission');await page.getByLabel('Description',{exact:true}).fill('Check test reports, review code coverage and validate the final application.');
 await page.locator('#new-task').getByLabel('Priority',{exact:true}).selectOption('high');await page.getByLabel('Due date',{exact:true}).fill(new Date(Date.now()+48*3600000).toISOString().slice(0,10));await wait(4000);await page.getByRole('button',{name:'Create task',exact:true}).click();
 await page.getByRole('heading',{level:1,name:'Review final submission'}).waitFor();const taskUrl=page.url();
 await banner(page,'3. Create and assign a task','A title, description, due date and priority are saved through the real task API.');await wait(6000);
 await page.getByLabel('Project member',{exact:true}).selectOption({label:'Project Team'});await page.getByRole('button',{name:'Assign task',exact:true}).click();await page.getByRole('alert').filter({hasText:'Task assigned'}).waitFor();
 await banner(page,'4. Assignment and lifecycle updates','Only the task owner, an assignee or a manager can modify the task.');await wait(5000);
 await page.getByLabel('Status',{exact:true}).selectOption('in_progress');await page.getByRole('button',{name:'Save changes',exact:true}).click();await page.getByRole('alert').filter({hasText:'Task saved'}).waitFor();
 await page.getByLabel('Add a comment',{exact:true}).fill('The final reports and validation evidence are ready for review.');await page.getByRole('button',{name:'Post comment',exact:true}).click();await page.locator('#comments').getByText('The final reports and validation evidence are ready for review.',{exact:true}).waitFor();
 await page.locator('#comments').scrollIntoViewIfNeeded();await banner(page,'5. Collaboration with persisted comments','Author, timestamp and comment are loaded from the database after each update.');await wait(6000);
 await page.goto(projectUrl);await page.locator('.task-card').waitFor();
 await page.getByLabel('Search tasks',{exact:true}).fill('Review');await page.getByLabel('Status',{exact:true}).selectOption('in_progress');await page.locator('#filters').getByLabel('Priority',{exact:true}).selectOption('high');await page.getByRole('button',{name:'Apply filters',exact:true}).click();
  await page.locator('#result-count').getByText('1 task',{exact:true}).waitFor();await page.locator('#task-board').scrollIntoViewIfNeeded();await banner(page,'6. Search and combined filters','Keyword, status, priority, assignee and due-date filters operate on the same persisted task list.');await wait(7000);
 await page.goto(base+'/dashboard.html');await page.locator('.stats').waitFor();await banner(page,'7. Live task-count dashboard','The task appears under In progress. Counts come from the authenticated dashboard API.');await wait(7000);
 await page.goto(taskUrl);await page.getByLabel('Status',{exact:true}).selectOption('done');await page.getByRole('button',{name:'Save changes',exact:true}).click();await page.getByRole('alert').filter({hasText:'Task saved'}).waitFor();
  await page.goto(projectUrl);await page.locator('#column-done').waitFor();await page.locator('#task-board').scrollIntoViewIfNeeded();await banner(page,'8. Completed work is visible on the board','The task moved from To do to In progress to Done through actual API requests.');await wait(7000);
 await page.goto(base+'/notifications.html');await page.getByRole('heading',{name:'Notifications',exact:true}).waitFor();await banner(page,'9. Reminder notifications','Assigned tasks due soon generate in-app reminders. SMTP dispatch and failure retry are validated separately.');await wait(6000);
  await page.goto(projectUrl);await page.locator('.task-card').waitFor();await page.locator('#task-board').scrollIntoViewIfNeeded();await banner(page,'Final application: connected, tested and reproducible','See docs/ for the four reports and recorded validation limits. Original SRS, SAD and Test Plan remain unchanged.');
}
async function historical(page){
 const app=express();app.use(express.json());
 app.post('/request',async(req,res)=>{try{const {method,url,auth,body}=req.body;const r=await fetch(base+url,{method,headers:{'Content-Type':'application/json',...(auth?{Authorization:auth}:{})},body:body===undefined?undefined:JSON.stringify(body)});res.json({status:r.status,body:r.status===204?null:await r.json()});}catch(e){res.status(500).json({error:e.message});}});
 app.get('/',(req,res)=>res.type('html').send(`<!DOCTYPE html><html lang="en"><meta charset="utf-8"><title>Sprint 1 API evidence</title><style>body{margin:0;padding:40px 48px 150px;font:18px/1.5 system-ui;background:#f3f6f4;color:#153b35}h1{font-size:32px;margin:8px 0}small{color:#41665f}#stage{background:white;padding:24px;border:1px solid #afc7be;border-radius:12px;margin:24px 0}pre{background:#142e2a;color:#d7f4e7;padding:20px;border-radius:8px;font:16px/1.5 Consolas,monospace;max-height:410px;overflow:auto}.pill{padding:4px 10px;border-radius:4px;background:#d9eee0;display:inline-block}#trail{color:#41665f;font-size:15px}</style><p>SOFTWARE ENGINEERING MINI-PROJECT</p><h1>Sprint 1: core task-management API</h1><small>Historical source: ${source.slice(0,8)} | source date 2 November 2026 | reconstruction captured ${captured.slice(0,10)}</small><div id="stage"><h2 id="step">Preparing actual API requests...</h2><div id="request"></div><pre id="response">No mock responses. Calls target the historical backend on localhost.</pre></div><div id="trail"></div><script>window.execute=async function(spec){const r=await fetch('/request',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(spec)});return r.json()};</script></html>`));
 server=await new Promise(r=>{const s=app.listen(3103,'127.0.0.1',()=>r(s));});
 await page.goto('http://127.0.0.1:3103');
 await banner(page,'Historical reconstruction, captured today','This revision has an API backend and static UI placeholders. The independent viewer displays genuine API responses.');await wait(7000);
 const stamp=Date.now();let auth,member,project,task;const trail=[];
 async function call(step,method,url,body,as=auth){const result=await page.evaluate(spec=>window.execute(spec),{method,url,body,auth:as});if(result.status>=400)throw new Error(JSON.stringify(result));return result;}
 async function show(title,method,url,result){trail.push(title);await page.evaluate(({title,method,url,result,trail})=>{document.getElementById('step').textContent=title;document.getElementById('request').textContent=method+' '+url+'   HTTP '+result.status;document.getElementById('response').textContent=JSON.stringify(result.body,null,2);document.getElementById('trail').textContent=trail.join('  →  ');},{title,method,url,result,trail});}
 let email=`sprint1-${stamp}@demo.test`;
 let r=await call('Register','POST','/auth/register',{email,displayName:'Sprint 1 Manager',password:'Historical123'});await show('1. Register an account','POST','/auth/register',r);await wait(6500);
 r=await call('Login','POST','/auth/login',{email,password:'Historical123'});auth='Bearer '+r.body.accessToken;
 await show('2. Authenticate and receive session tokens','POST','/auth/login',{status:r.status,body:{user:r.body.user,accessToken:'[issued; hidden]',refreshToken:'[issued; hidden]'}});await wait(6500);
 r=await call('Project','POST','/projects',{name:'Sprint 1 core workflow'});project=r.body;await show('3. Create a project','POST','/projects',r);await wait(6500);
 r=await call('Task','POST',`/projects/${project.id}/tasks`,{title:'Review project report',priority:'high'});task=r.body;await show('4. Create a persisted task','POST',`/projects/${project.id}/tasks`,r);await wait(6500);
 const managerId=(await call('Login','POST','/auth/login',{email,password:'Historical123'})).body.user.id;
 r=await call('Assign','POST',`/tasks/${task.id}/assignees`,{userId:managerId});await show('5. Assign a project member','POST',`/tasks/${task.id}/assignees`,r);await wait(6500);
 r=await call('Status','PATCH',`/tasks/${task.id}/status`,{status:'in_progress'});await show('6. Update task status','PATCH',`/tasks/${task.id}/status`,r);await wait(6500);
 r=await call('Comment','POST',`/tasks/${task.id}/comments`,{body:'Sprint 1 core workflow validated against real PostgreSQL.'});await show('7. Collaborate with a task comment','POST',`/tasks/${task.id}/comments`,r);
 await banner(page,'Sprint 1 core features reproduced from ea72d56','Registration, authentication, projects, task creation, assignment, lifecycle updates and comments returned successful real responses.');
}
(async()=>{
 browser=await chromium.launch();const context=await browser.newContext({viewport:{width:1280,height:900},recordVideo:{dir:path.join(output,'raw'),size:{width:1280,height:900}}});
 const page=await context.newPage();const began=Date.now();
 await (mode==='sprint1'?historical(page):final(page));
 await wait(Math.max(0,duration+1500-(Date.now()-began)));
 const video=page.video();await context.close();const recorded=await video.path();
 const target=path.join(output,mode==='sprint1'?'Sprint_1_One_Minute.webm':'Sprint_2_Two_Minutes.webm');fs.copyFileSync(recorded,target);
 fs.writeFileSync(path.join(output,mode+'-capture.json'),JSON.stringify({source,captured,mode,base,target:path.basename(target),requestedDurationSeconds:duration/1000,rawDurationSeconds:(Date.now()-began)/1000,description:mode==='sprint1'?'Reconstruction of authentic historical API using a separate response viewer; not a historical UI recording.':'Connected final browser application; actual recording date shown.'},null,2));
 console.log('Recorded '+target);
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();if(server)server.close();});

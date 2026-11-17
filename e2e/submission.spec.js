const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const db = require('../src/db');
const fs = require('fs');
const path = require('path');
const PASSWORD = 'Validation123';
const evidence = path.join(__dirname,'../docs/validation/evidence');
fs.mkdirSync(evidence,{recursive:true});

async function register(page, email, name) {
  await page.goto('/login.html');
  await page.getByText('Create an account',{exact:true}).click();
  const form=page.locator('#register-form');
  await form.getByLabel('Display name').fill(name);
  await form.getByLabel('Email address').fill(email);
  await form.getByLabel('Password',{exact:true}).fill(PASSWORD);
  await form.getByRole('button',{name:'Register',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('Account created');
  await page.locator('#login-form').getByLabel('Password',{exact:true}).fill(PASSWORD);
  await page.locator('#login-form').getByRole('button',{name:'Log in',exact:true}).click();
  await expect(page).toHaveURL(/dashboard\.html/);
  await expect(page.getByRole('heading',{level:1})).toContainText(name);
}
async function login(page,email,password=PASSWORD) {
  await page.goto('/login.html');
  await page.locator('#login-form').getByLabel('Email address').fill(email);
  await page.locator('#login-form').getByLabel('Password',{exact:true}).fill(password);
  await page.getByRole('button',{name:'Log in',exact:true}).click();
  await expect(page).toHaveURL(/dashboard\.html/);
}
async function axe(page,name,project) {
  const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
  fs.writeFileSync(path.join(evidence,`axe-${project}-${name}.json`),JSON.stringify({url:page.url(),timestamp:result.timestamp,testEngine:result.testEngine,violations:result.violations,incomplete:result.incomplete.map(x=>({id:x.id,impact:x.impact,help:x.help})),passes:result.passes.length},null,2));
  expect(result.violations.filter(v=>v.impact==='critical'||v.impact==='serious')).toEqual([]);
}

test('TC-01..07,13..20: complete browser workflow with persisted API data',async({page,browser},info)=>{
  const key=info.project.name+'-'+Date.now();
  const memberContext=await browser.newContext();
  const member=await memberContext.newPage();
  await register(member,`member-${key}@validation.test`,'Validation Member');
  await register(page,`manager-${key}@validation.test`,'Validation Manager');
  await axe(page,'dashboard',info.project.name);
  await page.getByText('New project',{exact:true}).click();
  await page.getByLabel('Project name',{exact:true}).fill('Validation '+key);
  await page.getByRole('button',{name:'Create project',exact:true}).click();
  await expect(page).toHaveURL(/board\.html\?project=/);
  const projectId=new URL(page.url()).searchParams.get('project');
  await page.locator('#members-panel summary').click();
  await page.getByLabel('Member email',{exact:true}).fill(`member-${key}@validation.test`);
  await page.getByRole('button',{name:'Add member',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('Member added');
  await page.getByText('New task',{exact:true}).click();
  await page.getByLabel('Title',{exact:true}).fill('Review report '+key);
  await page.getByLabel('Description',{exact:true}).fill('Validate final submission');
  const due=new Date(Date.now()+48*3600000).toISOString().slice(0,10);
  await page.getByLabel('Due date',{exact:true}).fill(due);
  await page.locator('#new-task').getByLabel('Priority',{exact:true}).selectOption('high');
  await page.getByRole('button',{name:'Create task',exact:true}).click();
  await expect(page).toHaveURL(/task\.html\?id=/);
  const taskId=new URL(page.url()).searchParams.get('id');
  await page.getByLabel('Project member',{exact:true}).selectOption({label:'Validation Member'});
  await page.getByRole('button',{name:'Assign task',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('Task assigned');
  await member.goto('/task.html?id='+taskId);
  await member.getByLabel('Status',{exact:true}).selectOption('in_progress');
  await member.getByRole('button',{name:'Save changes',exact:true}).click();
  await expect(member.getByRole('alert')).toContainText('Task saved');
  await member.getByLabel('Add a comment',{exact:true}).fill('Browser-verified comment');
  await member.getByRole('button',{name:'Post comment',exact:true}).click();
  await expect(member.locator('#comments')).toContainText('Browser-verified comment');
  await page.reload();
  await expect(page.getByLabel('Status',{exact:true})).toHaveValue('in_progress');
  await expect(page.locator('#comments')).toContainText('Browser-verified comment');
  await axe(page,'task',info.project.name);
  await page.screenshot({path:path.join(evidence,`task-${info.project.name}.png`),fullPage:true});
  await page.goto('/board.html?project='+projectId);
  await page.getByLabel('Search tasks',{exact:true}).fill('Review report');
  await page.getByLabel('Status',{exact:true}).selectOption('in_progress');
  await page.locator('#filters').getByLabel('Priority',{exact:true}).selectOption('high');
  await page.getByLabel('Assignee',{exact:true}).selectOption({label:'Validation Member'});
  await page.getByRole('button',{name:'Apply filters',exact:true}).click();
  await expect(page.locator('#result-count')).toHaveText('1 task');
  await expect(page.locator('.task-card')).toHaveCount(1);
  await axe(page,'board',info.project.name);
  await page.screenshot({path:path.join(evidence,`board-${info.project.name}.png`),fullPage:true});
  await page.setViewportSize({width:360,height:800});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.screenshot({path:path.join(evidence,`mobile-${info.project.name}.png`),fullPage:true});
  await page.setViewportSize({width:1280,height:900});
  await member.getByRole('link',{name:'Dashboard',exact:true}).click();
  await expect(member.locator('.stats')).toContainText('In progress1');
  await page.goto('/task.html?id='+taskId);
  await page.getByRole('button',{name:'Unassign Validation Member',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('Assignee removed');
  await page.getByLabel('Confirm deletion',{exact:true}).check();
  await page.getByRole('button',{name:'Delete task',exact:true}).click();
  await expect(page).toHaveURL(/board\.html/);
  await expect(page.locator('.task-card')).toHaveCount(0);
  await page.locator('#members-panel summary').click();
  await page.getByRole('button',{name:'Remove Validation Member',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('Member removed');
  await page.getByRole('button',{name:'Log out',exact:true}).click();
  await expect(page).toHaveURL(/login\.html/);
  await memberContext.close();
});

test('SEC and FR-14: invalid login, admin deactivation, existing-session rejection',async({page,browser},info)=>{
  const key=info.project.name+'-'+Date.now();
  const email=`deactivate-${key}@validation.test`;
  await register(page,email,'Deactivation Candidate');
  const adminEmail=`admin-${key}@validation.test`;
  const context=await browser.newContext();const admin=await context.newPage();
  await register(admin,adminEmail,'Validation Admin');
  await db.query("UPDATE users SET role = 'admin' WHERE email = $1",[adminEmail]);
  await admin.reload();
  await admin.getByRole('link',{name:'Administration',exact:true}).click();
  const row=admin.locator('.list-item').filter({hasText:email});
  await row.getByRole('checkbox').check();
  await row.getByRole('button',{name:'Deactivate Deactivation Candidate',exact:true}).click();
  await expect(admin.getByRole('alert')).toContainText('Account deactivated');
  await page.reload();
  await expect(page).toHaveURL(/login\.html\?expired=1/);
  await page.locator('#login-form').getByLabel('Email address').fill(email);
  await page.locator('#login-form').getByLabel('Password',{exact:true}).fill(PASSWORD);
  await page.getByRole('button',{name:'Log in',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('Invalid credentials');
  await context.close();
});

test('TC-26: login accessibility, validation errors and keyboard entry',async({page},info)=>{
  await page.goto('/login.html');
  await expect(page.getByRole('heading',{level:1})).toHaveText('Welcome back');
  await axe(page,'login',info.project.name);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link',{name:'Skip to main content'})).toBeFocused();
  await page.locator('#login-form').getByLabel('Email address').fill('unknown-'+info.project.name+'-'+Date.now()+'@validation.test');
  await page.locator('#login-form').getByLabel('Password',{exact:true}).fill('WrongPass123');
  await page.getByRole('button',{name:'Log in',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('Invalid credentials');
});

test.afterAll(async()=>{await db.getPool().end();});

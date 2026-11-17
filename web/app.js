/* Same-origin web client. API authorization and validation remain on the server. */
(function () {
  'use strict';
  var main = document.getElementById('main');
  var page = location.pathname.split('/').pop().replace('.html', '') || 'dashboard';
  var params = new URLSearchParams(location.search);
  var user, projects = [], token = null;
  try { token = sessionStorage.getItem('accessToken'); } catch (e) { /* no persistent session */ }
  var labels = { todo: 'To do', in_progress: 'In progress', done: 'Done' };
  function esc(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) { return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]; }); }
  function date(value) { return value ? String(value).slice(0, 10) : ''; }
  function option(value, label, selected) { return '<option value="' + esc(value) + '"' + (selected ? ' selected' : '') + '>' + esc(label) + '</option>'; }
  function statusOptions(selected, all) { return (all ? option('', 'All statuses') : '') + Object.keys(labels).map(function (k) { return option(k, labels[k], k === selected); }).join(''); }
  function priorityOptions(selected, all) { return (all ? option('', 'All priorities') : '') + ['low','medium','high'].map(function (k) { return option(k, k.charAt(0).toUpperCase()+k.slice(1), k === selected); }).join(''); }
  function message(text, success) { var el = document.getElementById('message'); el.hidden = !text; el.className = success ? 'success' : ''; el.textContent = text || ''; }
  function shell(content) { main.innerHTML = '<div id="message" role="alert" hidden></div>' + content; }
  function saveToken(value) { token = value; try { if (value) sessionStorage.setItem('accessToken', value); else sessionStorage.removeItem('accessToken'); } catch (e) { /* current page only */ } }
  async function api(path, method, body) {
    var response = await fetch(path, { method:method || 'GET', headers:Object.assign({ Accept:'application/json' }, token ? {Authorization:'Bearer '+token} : {}, body === undefined ? {} : {'Content-Type':'application/json'}), body:body === undefined ? undefined : JSON.stringify(body) });
    var data = response.status === 204 ? null : await response.json();
    if (!response.ok) {
      if (response.status === 401 && path !== '/auth/login' && path !== '/demo/login') { saveToken(null); location.href = 'login.html?expired=1'; }
      var err = data && data.error || {};
      throw new Error((err.message || 'Request failed') + (err.details ? ': ' + Object.values(err.details).join('; ') : ''));
    }
    return data;
  }
  function bind(id, handler) {
    document.getElementById(id).addEventListener('submit', async function (event) {
      event.preventDefault(); var form = event.currentTarget; var buttons = form.querySelectorAll('button');
      buttons.forEach(function (b) { b.disabled = true; }); message('');
      try { await handler(new FormData(form), form); } catch (e) { message(e.message || 'Could not reach the server.'); }
      finally { buttons.forEach(function (b) { b.disabled = false; }); }
    });
  }
  function authPage() {
    shell('<section class="auth panel"><p class="eyebrow">Your work, in focus</p><h1>Welcome back</h1><p class="hint">Log in to manage your projects and tasks.</p><form id="login-form"><label for="email">Email address</label><input id="email" name="email" type="email" autocomplete="email" required><label for="password">Password</label><input id="password" name="password" type="password" autocomplete="current-password" required><div class="actions"><button type="submit">Log in</button></div></form><hr><details><summary>Create an account</summary><form id="register-form"><label for="displayName">Display name</label><input id="displayName" name="displayName" autocomplete="name" maxlength="100" required><label for="register-email">Email address</label><input id="register-email" name="email" type="email" autocomplete="email" required><label for="register-password">Password</label><input id="register-password" name="password" type="password" autocomplete="new-password" minlength="8" required aria-describedby="password-help"><p id="password-help" class="meta">Use at least 8 characters, including a letter and a number.</p><div class="actions"><button type="submit">Register</button></div></form></details></section>');
    document.querySelector('nav').hidden = true;
    bind('login-form', async function (f) { var r = await api('/auth/login','POST',Object.fromEntries(f)); saveToken(r.accessToken); location.href = 'dashboard.html'; });
    bind('register-form', async function (f, form) { await api('/auth/register','POST',Object.fromEntries(f)); document.getElementById('email').value=f.get('email'); form.reset(); form.closest('details').open=false; message('Account created. Log in to continue.',true); document.getElementById('password').focus(); });
    if (params.get('expired')) message('Your session ended. Please log in again.');
    fetch('/demo/accounts').then(function (response) {
      if (!response.ok) return null;
      return response.json();
    }).then(function (demo) {
      if (!demo || !demo.accounts) return;
      var section = document.createElement('section');
      section.className = 'demo-logins';
      section.setAttribute('aria-labelledby', 'demo-login-heading');
      section.innerHTML = '<h2 id="demo-login-heading">Try a demo account</h2><p class="meta">Choose a role to log in instantly to the prepared demo workspace.</p><div class="stack">' + demo.accounts.map(function (a) {
        return '<button class="secondary demo-login" type="button" data-email="' + esc(a.email) + '"><strong>' + esc(a.name) + '</strong><span class="meta">' + esc(a.description) + '</span></button>';
      }).join('') + '</div>';
      document.querySelector('.auth').insertBefore(section, document.getElementById('login-form'));
      section.querySelectorAll('button').forEach(function (button) {
        button.addEventListener('click', async function () {
          var buttons = section.querySelectorAll('button');
          buttons.forEach(function (b) { b.disabled = true; });
          message('');
          try {
            var r = await api('/demo/login', 'POST', { email:button.dataset.email });
            saveToken(r.accessToken);
            location.href = 'dashboard.html';
          } catch (e) {
            message(e.message || 'Could not log in to the demo.');
            buttons.forEach(function (b) { b.disabled = false; });
          }
        });
      });
    }).catch(function () { /* Normal login remains available if the local demo is disabled. */ });
  }
  function newProject() { return '<details><summary>New project</summary><form id="new-project"><label for="project-name">Project name</label><input id="project-name" name="name" maxlength="100" required><div class="actions"><button type="submit">Create project</button></div></form></details>'; }
  function bindProject() { bind('new-project', async function (f) { var p = await api('/projects','POST',Object.fromEntries(f)); location.href='board.html?project='+p.id; }); }
  async function dashboard() {
    var counts = await api('/dashboard');
    shell('<div class="page-head"><div><p class="eyebrow">Workspace overview</p><h1>Good to see you, '+esc(user.displayName)+'.</h1><p class="hint">A clear view of the work across your projects.</p></div></div><section class="stats" aria-label="Task counts">'+Object.keys(labels).map(function(k){return '<div class="stat">'+labels[k]+'<strong>'+counts.byStatus[k]+'</strong></div>';}).join('')+'<div class="stat">Total tasks<strong>'+counts.total+'</strong></div></section><h2>Your projects <span class="count">('+projects.length+')</span></h2><div class="project-list">'+projects.map(function(p){return '<a class="project-link" href="board.html?project='+p.id+'"><strong>'+esc(p.name)+'</strong><span class="meta">'+(p.role==='team_manager'?'Team manager':'Member')+' <span aria-hidden="true">/</span> Open board &rarr;</span></a>';}).join('')+'</div>'+(projects.length?'':'<p class="hint">Create your first project to start organizing tasks.</p>')+'<div class="actions"></div>'+newProject());
    bindProject();
  }
  function taskFields(t) { return '<label for="title">Title</label><input id="title" name="title" maxlength="200" required value="'+esc(t.title || '')+'"><label for="description">Description</label><textarea id="description" name="description" rows="4">'+esc(t.description || '')+'</textarea><div class="row"><div><label for="dueDate">Due date</label><input id="dueDate" name="dueDate" type="date" value="'+date(t.dueDate)+'"></div><div><label for="priority">Priority</label><select id="priority" name="priority">'+priorityOptions(t.priority || 'medium')+'</select></div></div>'; }
  async function board() {
    var id = Number(params.get('project')) || (projects[0] && projects[0].id);
    var project = projects.find(function(p){return p.id===id;});
    if (!project) { shell('<p class="eyebrow">Projects</p><h1>Your task board</h1><p class="hint">Choose a project from your dashboard, or create a new one.</p>'+newProject()); bindProject(); return; }
    var members = await api('/projects/'+id+'/members');
    shell('<div class="page-head"><div><p class="eyebrow">Project workspace</p><h1>'+esc(project.name)+'</h1><p class="hint">Keep every task moving, from the first idea to done.</p></div><div><label for="project-select">Project</label><select id="project-select">'+projects.map(function(p){return option(p.id,p.name,p.id===id);}).join('')+'</select></div></div><div class="split"><details><summary>New task</summary><form id="new-task">'+taskFields({})+'<div class="actions"><button type="submit">Create task</button></div></form></details>'+newProject()+'</div><details id="members-panel"><summary>Project members ('+members.length+')</summary><ul class="clean">'+members.map(function(m){return '<li class="list-item"><strong>'+esc(m.displayName)+'</strong> <span class="meta">'+esc(m.email)+' / '+esc(m.role.replace('_',' '))+(m.isActive?'':' / Inactive')+'</span>'+(project.role==='team_manager' && m.userId!==project.ownerId?'<form class="remove-member" data-user="'+m.userId+'"><div class="actions"><button class="secondary" type="submit">Remove '+esc(m.displayName)+'</button></div></form>':'')+'</li>';}).join('')+'</ul>'+(project.role==='team_manager'?'<form id="add-member"><label for="member-email">Member email</label><input id="member-email" name="email" type="email" required><p class="meta">The person must have registered an account first.</p><div class="actions"><button type="submit">Add member</button></div></form>':'')+'</details><form id="filters" class="panel" role="search" aria-label="Filter tasks"><div class="row"><div><label for="q">Search tasks</label><input id="q" name="q" type="search"></div><div><label for="filter-status">Status</label><select id="filter-status" name="status">'+statusOptions('',true)+'</select></div><div><label for="filter-priority">Priority</label><select id="filter-priority" name="priority">'+priorityOptions('',true)+'</select></div><div><label for="filter-assignee">Assignee</label><select id="filter-assignee" name="assignee">'+option('','All assignees')+members.map(function(m){return option(m.userId,m.displayName);}).join('')+'</select></div></div><div class="row"><div><label for="dueFrom">Due from</label><input type="date" id="dueFrom" name="dueFrom"></div><div><label for="dueTo">Due to</label><input type="date" id="dueTo" name="dueTo"></div></div><div class="actions"><button type="submit">Apply filters</button><button type="reset" class="secondary">Clear filters</button><span id="result-count" role="status" class="meta"></span></div></form><div id="task-board" class="board" aria-label="Tasks by status"></div>');
    document.getElementById('project-select').addEventListener('change',function(e){location.href='board.html?project='+e.target.value;});
    bindProject();
    bind('new-task', async function(f){var body=Object.fromEntries(f);body.dueDate=body.dueDate||null;var t=await api('/projects/'+id+'/tasks','POST',body);location.href='task.html?id='+t.id;});
    if (project.role==='team_manager') {
      bind('add-member',async function(f){await api('/projects/'+id+'/members','POST',Object.fromEntries(f));await board();document.getElementById('members-panel').open=true;message('Member added.',true);});
      document.querySelectorAll('.remove-member').forEach(function(form){form.addEventListener('submit',async function(e){e.preventDefault();try{await api('/projects/'+id+'/members/'+form.dataset.user,'DELETE');await board();document.getElementById('members-panel').open=true;message('Member removed.',true);}catch(err){message(err.message);}});});
    }
    async function load(f) {
      var query=new URLSearchParams();f.forEach(function(v,k){if(v)query.set(k,v);});
      var tasks=await api('/projects/'+id+'/tasks?'+query.toString());
      document.getElementById('result-count').textContent=tasks.length+' task'+(tasks.length===1?'':'s');
      document.getElementById('task-board').innerHTML=Object.keys(labels).map(function(k){var group=tasks.filter(function(t){return t.status===k;});return '<section class="column" aria-labelledby="column-'+k+'"><h2 id="column-'+k+'">'+labels[k]+' <span class="count">'+group.length+'</span></h2>'+group.map(function(t){return '<a class="task-card" href="task.html?id='+t.id+'"><strong>'+esc(t.title)+'</strong><span class="badge '+t.priority+'">'+esc(t.priority)+' priority</span><p class="meta">'+(t.dueDate?'Due '+date(t.dueDate):'No due date')+'</p></a>';}).join('')+(group.length?'':'<p class="meta">No tasks here.</p>')+'</section>';}).join('');
    }
    bind('filters',load);
    document.getElementById('filters').addEventListener('reset',function(){setTimeout(function(){load(new FormData(document.getElementById('filters'))).catch(function(e){message(e.message);});},0);});
    await load(new FormData(document.getElementById('filters')));
  }
  async function task() {
    var id=Number(params.get('id'));
    if(!id) {shell('<h1>Choose a task</h1><p>Open a task from your <a href="board.html">task board</a>.</p>');return;}
    var result=await Promise.all([api('/tasks/'+id),api('/tasks/'+id+'/assignees'),api('/tasks/'+id+'/comments')]);
    var t=result[0],assigned=result[1],comments=result[2];
    var members=await api('/projects/'+t.projectId+'/members');
    var p=projects.find(function(item){return item.id===t.projectId;});
    var canEdit=t.creatorId===user.id || user.role==='admin' || (p && p.role==='team_manager') || assigned.some(function(a){return a.userId===user.id;});
    var canDelete=t.creatorId===user.id || user.role==='admin' || (p && p.role==='team_manager');
    shell('<p><a href="board.html?project='+t.projectId+'">&larr; Back to '+esc(p?p.name:'project')+'</a></p><div class="page-head"><div><p class="eyebrow">Task #'+id+'</p><h1>'+esc(t.title)+'</h1><span class="badge">'+labels[t.status]+'</span></div></div><div class="split"><div><section class="panel"><h2>Task details</h2><form id="edit-task"><fieldset '+(canEdit?'':'disabled')+' style="border:0;padding:0;margin:0">'+taskFields(t)+'<label for="task-status">Status</label><select id="task-status" name="status">'+statusOptions(t.status)+'</select><div class="actions"><button type="submit">Save changes</button></div></fieldset></form>'+(canEdit?'':'<p class="hint">Only the owner, assignees or a manager can edit this task.</p>')+'</section><section class="panel"><h2>Comments</h2><ul class="clean" id="comments">'+comments.map(function(c){return '<li class="list-item"><strong>'+esc(c.authorName)+'</strong><span class="meta"> / '+date(c.createdAt)+'</span><p>'+esc(c.body)+'</p></li>';}).join('')+'</ul>'+(comments.length?'':'<p class="hint">No comments yet. Start the conversation.</p>')+'<form id="add-comment"><label for="comment-body">Add a comment</label><textarea id="comment-body" name="body" rows="3" maxlength="2000" required></textarea><div class="actions"><button type="submit">Post comment</button></div></form></section></div><aside><section class="panel"><h2>Assignees</h2><ul class="clean">'+assigned.map(function(a){return '<li class="list-item">'+esc(a.displayName)+(canEdit?'<form class="unassign" data-user="'+a.userId+'"><button class="secondary" type="submit">Unassign '+esc(a.displayName)+'</button></form>':'')+'</li>';}).join('')+'</ul>'+(assigned.length?'':'<p class="hint">No assignees yet.</p>')+(canEdit?'<form id="assign-task"><label for="assignee">Project member</label><select id="assignee" name="userId" required>'+option('','Choose a member')+members.filter(function(m){return m.isActive && !assigned.some(function(a){return a.userId===m.userId;});}).map(function(m){return option(m.userId,m.displayName);}).join('')+'</select><div class="actions"><button type="submit">Assign task</button></div></form>':'')+'</section>'+(canDelete?'<section class="panel"><h2>Delete task</h2><p class="meta">This removes the task and its comments permanently.</p><form id="delete-task"><label class="inline-label"><input type="checkbox" name="confirmed" required>Confirm deletion</label><div class="actions"><button type="submit" class="danger">Delete task</button></div></form></section>':'')+'</aside></div>');
    if(canEdit) {
      bind('edit-task',async function(f){var b=Object.fromEntries(f);b.dueDate=b.dueDate||null;await api('/tasks/'+id,'PATCH',b);await task();message('Task saved.',true);});
      bind('assign-task',async function(f){await api('/tasks/'+id+'/assignees','POST',{userId:Number(f.get('userId'))});await task();message('Task assigned.',true);});
      document.querySelectorAll('.unassign').forEach(function(form){form.addEventListener('submit',async function(e){e.preventDefault();try{await api('/tasks/'+id+'/assignees/'+form.dataset.user,'DELETE');await task();message('Assignee removed.',true);}catch(err){message(err.message);}});});
    }
    bind('add-comment',async function(f){await api('/tasks/'+id+'/comments','POST',Object.fromEntries(f));await task();message('Comment posted.',true);});
    if(canDelete) bind('delete-task',async function(){await api('/tasks/'+id,'DELETE');location.href='board.html?project='+t.projectId;});
  }
  async function notifications() {
    var list=await api('/notifications');
    shell('<p class="eyebrow">Stay in the loop</p><h1>Notifications</h1><p class="hint">Due-date reminders for tasks assigned to you.</p><section class="panel"><h2>Your reminders</h2><ul class="clean">'+list.map(function(n){return '<li class="list-item"><p><a href="task.html?id='+n.taskId+'">'+esc(n.message)+'</a></p><span class="meta">'+date(n.createdAt)+' / '+(n.read?'Read':'Unread')+'</span>'+(!n.read?'<form class="mark-read" data-id="'+n.id+'"><div class="actions"><button type="submit" class="secondary">Mark as read</button></div></form>':'')+'</li>';}).join('')+'</ul>'+(list.length?'':'<p class="hint">You are all caught up.</p>')+'</section>');
    document.querySelectorAll('.mark-read').forEach(function(f){f.addEventListener('submit',async function(e){e.preventDefault();try{await api('/notifications/'+f.dataset.id+'/read','POST');await notifications();}catch(err){message(err.message);}});});
  }
  async function admin() {
    if(user.role!=='admin'){shell('<h1>Administration</h1><p>Administrator access is required.</p>');return;}
    var users=await api('/admin/users');
    shell('<p class="eyebrow">Account management</p><h1>Administration</h1><section class="panel"><h2>User accounts</h2><ul class="clean">'+users.map(function(u){return '<li class="list-item"><strong>'+esc(u.displayName)+'</strong><p class="meta">'+esc(u.email)+' / '+esc(u.role)+' / '+(u.isActive?'Active':'Inactive')+'</p>'+(u.isActive && u.id!==user.id?'<form class="deactivate" data-user="'+u.id+'"><label class="inline-label"><input name="confirmed" type="checkbox" required>Confirm deactivation of '+esc(u.displayName)+'</label><div class="actions"><button class="danger" type="submit">Deactivate '+esc(u.displayName)+'</button></div></form>':'')+'</li>';}).join('')+'</ul></section>');
    document.querySelectorAll('.deactivate').forEach(function(f){f.addEventListener('submit',async function(e){e.preventDefault();try{await api('/admin/users/'+f.dataset.user+'/deactivate','PATCH');await admin();message('Account deactivated. Existing sessions are now blocked.',true);}catch(err){message(err.message);}});});
  }
  async function start() {
    if(page==='login'){authPage();return;}
    if(!token){location.href='login.html';return;}
    user=await api('/auth/me'); projects=await api('/projects');
    document.getElementById('account').innerHTML='<span>'+esc(user.displayName)+'</span><button id="logout" class="secondary" type="button">Log out</button>';
    document.getElementById('logout').addEventListener('click',function(){saveToken(null);location.href='login.html';});
    if(user.role==='admin'){var a=document.createElement('a');a.href='admin.html';a.textContent='Administration';document.querySelector('nav').appendChild(a);}
    await ({dashboard:dashboard,board:board,task:task,notifications:notifications,admin:admin}[page] || dashboard)();
  }
  start().catch(function(e){shell('<h1>Could not load this page</h1><p>Check your connection and <a href="'+esc(location.pathname+location.search)+'">try again</a>.</p>');message(e.message);});
})();

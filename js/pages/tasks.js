/**
 * EPIC Foundation CRM — Tasks Page (Full Rebuild)
 * Master operational follow-up engine. Multi-record linking, overdue detection,
 * smart views, inline quick-complete, and completedDate automation.
 */

function renderTasks(params = {}) {
  const main = document.getElementById('main');
  const TODAY = new Date().toISOString().split('T')[0];

  // ─── Priority helpers ────────────────────────────────────────────────────────
  const PRIORITY_BADGE = { Urgent: 'badge-red', High: 'badge-amber', Medium: 'badge-blue', Low: 'badge-gray' };
  const PRIORITY_COLOR = { Urgent: 'var(--status-red)', High: '#f59e0b', Medium: 'var(--text-accent)', Low: 'var(--text-muted)' };

  function isOverdue(row) {
    return row.dueDate && row.dueDate < TODAY && row.status !== 'Complete' && row.status !== 'Cancelled';
  }

  main.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <span class="page-title">Tasks</span>
        <span class="page-subtitle">Operational follow-up engine — linked across Users, Auctions, Opportunities, and Donations</span>
      </div>
      <div class="page-header-right">
        <button class="btn btn-ghost btn-sm" id="export-tasks-btn">${Icons.download} Export</button>
        <button class="btn btn-primary" id="new-task-btn">${Icons.plus} New Task</button>
      </div>
    </div>
    <div class="page-content">
      <div id="task-smart-views" style="display:flex;gap:0;margin-bottom:var(--space-4)"></div>
      <div id="tasks-table-wrap"></div>
    </div>
  `;

  let activeView = params.view || 'open';
  let taskSearch = '', taskFilterStatus = '', taskFilterPriority = '', taskFilterType = '';
  let taskSortCol = 'dueDate', taskSortDir = 'asc';
  renderSmartViews();
  buildTable();


  document.getElementById('new-task-btn').addEventListener('click', () => openTaskForm(null, null, null, null, refreshAll));
  document.getElementById('export-tasks-btn').addEventListener('click', () => { Store.downloadCSV('tasks','tasks-export.csv'); Toast.success('Tasks exported'); });

  // ─── Stat Chips ─────────────────────────────────────────────────────────────
  function renderTaskStatChips() {
    const all = Store.getAll('tasks');
    const stat = s => all.filter(t => t.status === s).length;
    const overdue = all.filter(isOverdue).length;
    const bar = document.getElementById('task-stats-bar'); if (!bar) return;
    const chip = (label, val, color, urgent) =>
      `<div style="display:flex;align-items:center;gap:6px;background:var(--bg-elevated);border:1px solid ${urgent?'var(--status-red)':'var(--border-color)'};border-radius:var(--radius-md);padding:6px 14px;font-size:var(--text-xs)">
        <span style="width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0"></span>
        <span style="color:var(--text-muted)">${label}</span>
        <span style="font-weight:var(--fw-semibold);color:${urgent?'var(--status-red)':'var(--text-primary)'}">${val}</span>
      </div>`;
    bar.innerHTML =
      chip('Total', all.length, 'var(--text-accent)') +
      chip('Open', stat('Open'), 'var(--status-blue)') +
      chip('In Progress', stat('In Progress'), 'var(--status-teal)') +
      chip('Waiting', stat('Waiting'), '#f97316') +
      chip('Overdue', overdue, 'var(--status-red)', overdue > 0) +
      chip('Complete', stat('Complete'), 'var(--status-green)');
  }

  // ─── Smart Views ─────────────────────────────────────────────────────────────
  function renderSmartViews() {
    const container = document.getElementById('task-smart-views'); if (!container) return;
    const views = [
      { id: 'all',      label: 'All Tasks' },
      { id: 'overdue',  label: '🔴 Overdue' },
      { id: 'today',    label: '📅 Due Today' },
      { id: 'open',     label: 'Open' },
      { id: 'waiting',  label: 'Waiting' },
      { id: 'complete', label: 'Completed' },
    ];
    container.innerHTML = views.map(v =>
      `<button class="btn btn-ghost btn-sm task-view-btn${activeView===v.id?' task-view-active':''}"
        data-view="${v.id}"
        style="border-radius:0;border-right:none;font-size:var(--text-xs);${v.id==='all'?'border-radius:var(--radius-md) 0 0 var(--radius-md)':''}${v.id==='complete'?'border-right:var(--border-subtle);border-radius:0 var(--radius-md) var(--radius-md) 0':''}"
      >${v.label}</button>`
    ).join('');
    // inject active style
    const style = document.getElementById('task-view-style') || document.createElement('style');
    style.id = 'task-view-style';
    style.textContent = `.task-view-active{background:var(--bg-surface)!important;color:var(--text-accent)!important;border-color:var(--border-color)!important;}`;
    document.head.appendChild(style);
    container.querySelectorAll('.task-view-btn').forEach(btn => {
      btn.addEventListener('click', () => { activeView = btn.dataset.view; buildTable(); renderSmartViews(); });
    });
  }

  // ─── Table ───────────────────────────────────────────────────────────────────

  function buildTable() {
    const wrap = document.getElementById('tasks-table-wrap'); if (!wrap) return;
    try {
    let tasks = Store.getAll('tasks');
      if (activeView === 'overdue')  tasks = tasks.filter(isOverdue);
      else if (activeView === 'today')    tasks = tasks.filter(t => t.dueDate === TODAY && t.status !== 'Complete' && t.status !== 'Cancelled');
      else if (activeView === 'open')     tasks = tasks.filter(t => t.status === 'Open' || t.status === 'In Progress');
      else if (activeView === 'waiting')  tasks = tasks.filter(t => t.status === 'Waiting');
      else if (activeView === 'complete') tasks = tasks.filter(t => t.status === 'Complete');
      if (taskSearch)         tasks = tasks.filter(t => `${t.id} ${t.title} ${t.description||''}`.toLowerCase().includes(taskSearch.toLowerCase()));
      if (taskFilterStatus)   tasks = tasks.filter(t => t.status === taskFilterStatus);
      if (taskFilterPriority) tasks = tasks.filter(t => t.priority === taskFilterPriority);
      if (taskFilterType)     tasks = tasks.filter(t => t.taskType === taskFilterType);
      // Sort
      const PRIORITY_ORDER = { Urgent: 0, High: 1, Medium: 2, Low: 3 };
      tasks = [...tasks].sort((a, b) => {
        let av, bv;
        if (taskSortCol === 'priority') { av = PRIORITY_ORDER[a.priority] ?? 99; bv = PRIORITY_ORDER[b.priority] ?? 99; }
        else { av = (a[taskSortCol] || '9999').toString(); bv = (b[taskSortCol] || '9999').toString(); }
        const cmp = typeof av === 'number' ? av - bv : av.localeCompare(bv);
        return taskSortDir === 'asc' ? cmp : -cmp;
      });
      renderTasksTable(wrap, tasks);
      if (params.open) { params.open = null; setTimeout(() => openTaskDrawer(params.open), 100); }
    } catch(e) { console.error('[Tasks] error:', e); }
  }

  function renderTasksTable(wrap, tasks) {
    try {
    const sortIcon = col => {
      if (taskSortCol !== col) return '<span class="sort-icon">↕</span>';
      return taskSortDir === 'asc' ? '<span class="sort-icon" style="color:var(--accent)">↑</span>' : '<span class="sort-icon" style="color:var(--accent)">↓</span>';
    };
    const thSort = (col, label) => `<th class="sortable ${taskSortCol===col?'sorted-'+taskSortDir:''}" data-col="${col}">${label}${sortIcon(col)}</th>`;

    wrap.innerHTML = `
      <div class="table-toolbar">
        <div class="search-wrap" style="position:relative">
          <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);opacity:0.5;pointer-events:none">${Icons.search}</span>
          <input type="text" class="search-input" id="task-search" placeholder="Search tasks..." value="${taskSearch}" style="padding-left:34px">
        </div>
        <select class="select" id="task-filter-status" style="width:auto;min-width:130px">
          <option value="">All Statuses</option>
          ${Store.STATUS.tasks.map(s => `<option value="${s}" ${taskFilterStatus===s?'selected':''}>${s}</option>`).join('')}
        </select>
        <select class="select" id="task-filter-priority" style="width:auto;min-width:130px">
          <option value="">All Priorities</option>
          ${Store.TASK_PRIORITIES.map(p => `<option value="${p}" ${taskFilterPriority===p?'selected':''}>${p}</option>`).join('')}
        </select>
        <select class="select" id="task-filter-type" style="width:auto;min-width:130px">
          <option value="">All Types</option>
          ${Store.TASK_TYPES.map(t => `<option value="${t}" ${taskFilterType===t?'selected':''}>${t}</option>`).join('')}
        </select>
        <div class="table-toolbar-right">
          <span style="font-size:var(--text-xs);color:var(--text-muted)">${tasks.length} task${tasks.length!==1?'s':''}</span>
        </div>
      </div>
      <div class="table-container"><div class="table-wrap">
        ${tasks.length === 0
          ? `<div class="table-empty"><div class="empty-icon">✅</div><div class="empty-title">No tasks found</div><div class="empty-sub">Try adjusting your filters</div></div>`
          : `<table class="crm-table">
          <thead><tr>
            ${thSort('title','Task')}
            ${thSort('taskType','Type')}
            ${thSort('priority','Priority')}
            ${thSort('dueDate','Due')}
            <th>Linked To</th>
            ${thSort('status','Status')}
            <th style="width:44px">✓</th>
          </tr></thead>
          <tbody>
            ${tasks.map(row => {
              const od = isOverdue(row);
              const user    = row.userId        ? Store.getById('users',        row.userId)        : null;
              const auction = row.auctionId     ? Store.getById('auctions',     row.auctionId)     : null;
              const opp     = row.opportunityId ? Store.getById('opportunities',row.opportunityId) : null;
              const links   = [user?`<span class="tag" style="font-size:10px;background:var(--badge-blue-bg);color:var(--badge-blue-text)">${user.firstName} ${user.lastName}</span>`:'',auction?`<span class="tag" style="font-size:10px">${auction.shortName||auction.id}</span>`:'',opp?`<span class="tag" style="font-size:10px">${opp.title||opp.id}</span>`:''].filter(Boolean).join('');
              return `<tr class="table-row" data-id="${row.id}">
                <td><span style="font-weight:var(--fw-medium);${od?'color:var(--status-red)':''}">${row.title}</span></td>
                <td>${row.taskType?`<span class="tag" style="font-size:10px">${row.taskType}</span>`:'<span style="color:var(--text-muted)">—</span>'}</td>
                <td>${row.priority?`<span class="badge ${PRIORITY_BADGE[row.priority]||'badge-gray'}">${row.priority}</span>`:'—'}</td>
                <td><span style="color:${od?'var(--status-red)':'var(--text-secondary)'};font-weight:${od?'600':'normal'}">${row.dueDate||'—'}${od?' ⚠':''}</span></td>
                <td>${links||'<span style="color:var(--text-muted)">—</span>'}</td>
                <td>${StatusBadge.render(row.status)}</td>
                <td>${row.status==='Complete'||row.status==='Cancelled'?'<span style="color:var(--status-green)">✓</span>':`<button class="quick-complete-btn" data-taskid="${row.id}" style="cursor:pointer;width:28px;height:28px;border:1px solid var(--border-color);border-radius:4px;background:transparent;color:var(--text-muted);font-size:14px">✓</button>`}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>`}
      </div></div>
    `;
    const si=wrap.querySelector('#task-search'); if(si) si.addEventListener('input',e=>{taskSearch=e.target.value;buildTable();si.focus();});
    const fs=wrap.querySelector('#task-filter-status'); if(fs) fs.addEventListener('change',e=>{taskFilterStatus=e.target.value;buildTable();});
    const fp=wrap.querySelector('#task-filter-priority'); if(fp) fp.addEventListener('change',e=>{taskFilterPriority=e.target.value;buildTable();});
    const ft=wrap.querySelector('#task-filter-type'); if(ft) ft.addEventListener('change',e=>{taskFilterType=e.target.value;buildTable();});
    wrap.querySelectorAll('th.sortable').forEach(th => th.addEventListener('click', () => {
      const col = th.dataset.col;
      if (taskSortCol === col) taskSortDir = taskSortDir === 'asc' ? 'desc' : 'asc';
      else { taskSortCol = col; taskSortDir = 'asc'; }
      buildTable();
    }));
    wrap.querySelectorAll('.table-row').forEach(tr=>tr.addEventListener('click',e=>{if(e.target.closest('.quick-complete-btn'))return; openTaskDrawer(tr.dataset.id);}));
    wrap.querySelectorAll('.quick-complete-btn').forEach(btn=>btn.addEventListener('click',e=>{e.stopPropagation();Store.update('tasks',btn.dataset.taskid,{status:'Complete',completedDate:TODAY});Toast.success('Task marked complete');refreshAll();}));
    } catch(err) { console.error('[Tasks] renderTasksTable ERROR:', err); }
  }

  function refreshAll() {
    buildTable();
    renderSmartViews();
  }

  // ─── Drawer ──────────────────────────────────────────────────────────────────
  function openTaskDrawer(id) {
    let record = Store.getById('tasks', id);
    if (!record) return;
    let formData = { ...record };
    const linkedFields = {};
    const TABS = ['Details', 'Links', 'Notes', 'Activity'];
    const view = new RecordFullView({ tabs: TABS });

    view.open({
      recordId: record.id,
      title: record.title,
      tabs: TABS,
      tabRenderer: (body, tab, editMode) => {
        record = Store.getById('tasks', id) || record;
        if      (tab === 'Details')  renderTaskDetails(body, record, formData, editMode);
        else if (tab === 'Links')    renderTaskLinks(body, record, formData, editMode, linkedFields);
        else if (tab === 'Notes')    renderNotesTab(body, record, 'tasks');
        else if (tab === 'Activity') body.innerHTML = renderActivityLog(record.activityLog);
      },
      onSave: () => {
        const updates = { ...formData, ...linkedFields };
        if (updates.status === 'Complete' && !updates.completedDate) {
          updates.completedDate = new Date().toISOString().split('T')[0];
        }
        Store.update('tasks', id, updates);
        Toast.success('Task saved'); refreshAll();
        view.updateTitle(updates.title || id, id);
      },
      onDelete: () => { Store.remove('tasks', id); Toast.success('Task deleted'); refreshAll(); Router.navigate('tasks'); },
      onClose: () => { refreshAll(); Router.navigate('tasks'); },
    });
  }

  function renderTaskDetails(body, record, formData, editMode) {
    const inp = (fid, val, type='text', ph='') =>
      editMode ? `<input class="input" id="${fid}" type="${type}" value="${String(val||'').replace(/"/g,'&quot;')}" placeholder="${ph}">`
               : `<div style="font-size:var(--text-sm)">${val || '<span style="color:var(--text-muted)">—</span>'}</div>`;

    const odMarker = isOverdue(record)
      ? `<span style="margin-left:8px;font-size:var(--text-xs);color:var(--status-red);font-weight:var(--fw-semibold)">⚠ OVERDUE</span>` : '';

    body.innerHTML = `
      <div class="drawer-section">
        <div class="drawer-section-title">Task Details</div>
        <div class="form-grid">
          <div class="form-group form-full"><label class="form-label">Title</label>
            ${editMode ? `<input class="input" id="td-title" value="${String(record.title||'').replace(/"/g,'&quot;')}" placeholder="What needs to be done?">` : `<div style="font-size:var(--text-md);font-weight:var(--fw-medium)">${record.title||'—'}</div>`}
          </div>
          <div class="form-group form-full"><label class="form-label">Description</label>
            ${editMode ? `<textarea class="input" id="td-description" rows="2" style="width:100%">${record.description||''}</textarea>`
              : `<div style="font-size:var(--text-sm);color:var(--text-secondary);white-space:pre-wrap">${record.description||'<span style="color:var(--text-muted)">—</span>'}</div>`}
          </div>
          <div class="form-group"><label class="form-label">Task Type</label>
            ${editMode ? `<select class="select" id="td-taskType"><option value="">—</option>${Store.TASK_TYPES.map(t=>`<option ${record.taskType===t?'selected':''}>${t}</option>`).join('')}</select>`
              : (record.taskType ? `<span class="tag">${record.taskType}</span>` : '—')}
          </div>
          <div class="form-group"><label class="form-label">Status</label>
            ${editMode ? `<select class="select" id="td-status">${Store.STATUS.tasks.map(s=>`<option ${record.status===s?'selected':''}>${s}</option>`).join('')}</select>`
              : StatusBadge.render(record.status)}
          </div>
          <div class="form-group"><label class="form-label">Priority</label>
            ${editMode ? `<select class="select" id="td-priority">${Store.TASK_PRIORITIES.map(p=>`<option ${record.priority===p?'selected':''}>${p}</option>`).join('')}</select>`
              : (record.priority ? `<span class="badge ${PRIORITY_BADGE[record.priority]||'badge-gray'}">${record.priority}</span>` : '—')}
          </div>
          <div class="form-group"><label class="form-label">Due Date ${odMarker}</label>
            ${inp('td-dueDate', record.dueDate, 'date')}
          </div>
          <div class="form-group"><label class="form-label">Due Time</label>
            ${inp('td-dueTime', record.dueTime, 'time')}
          </div>
          <div class="form-group"><label class="form-label">Reminder Date</label>
            ${inp('td-reminderDate', record.reminderDate, 'date')}
          </div>
        </div>
      </div>
      <div class="drawer-section">
        <div class="drawer-section-title">Assignment & Completion</div>
        <div class="form-grid">
          <div class="form-group"><label class="form-label">Assigned To</label>
            ${editMode ? `<div id="td-admin-wrap"></div>` : (() => { const u = record.assignedToId ? Store.getById('admins', record.assignedToId) : null; return u ? `<span class="tag">${u.name}</span>` : '<span style="color:var(--text-muted)">Unassigned</span>'; })()}
          </div>
          <div class="form-group"><label class="form-label">Completed Date</label>
            ${editMode ? inp('td-completedDate', record.completedDate, 'date') : `<div style="font-size:var(--text-sm);color:var(--status-green)">${record.completedDate||'<span style="color:var(--text-muted)">—</span>'}</div>`}
          </div>
        </div>
      </div>
      <div class="drawer-section">
        <div class="drawer-section-title">Record Info</div>
        <div class="form-grid">
          <div class="form-group"><label class="form-label">Created</label><div style="font-size:var(--text-xs);color:var(--text-muted)">${Store.formatDateTime(record.createdAt)}</div></div>
          <div class="form-group"><label class="form-label">Last Updated</label><div style="font-size:var(--text-xs);color:var(--text-muted)">${Store.formatDateTime(record.updatedAt)}</div></div>
        </div>
      </div>
    `;
    if (editMode) {
      ['title','description','taskType','status','dueDate','dueTime','reminderDate','completedDate'].forEach(f => {
        const el = body.querySelector(`#td-${f}`); if (!el) return;
        el.addEventListener(el.tagName==='SELECT'?'change':'input', () => formData[f] = el.value);
        // Auto-fill completedDate when status changes to Complete
        if (f === 'status') el.addEventListener('change', () => {
          const cd = body.querySelector('#td-completedDate');
          if (el.value === 'Complete' && cd && !cd.value) { cd.value = new Date().toISOString().split('T')[0]; formData.completedDate = cd.value; }
        });
      });
      ['priority'].forEach(f => {
        const el = body.querySelector(`#td-${f}`); if (el) el.addEventListener('change', () => formData[f] = el.value);
      });
      const aw = body.querySelector('#td-admin-wrap');
      if (aw) { aw.id='lf-td-a'; createLinkedField({container:aw,tableName:'admins',searchFields:['name','email'],displayFn:r=>r.name,onSelect:id=>formData.assignedToId=id,value:record.assignedToId,placeholder:'Search admins...'}); }
    }
  }

  function renderTaskLinks(body, record, formData, editMode, linkedFields) {
    if (!editMode) {
      // View mode — show clickable chips for each linked record
      const user    = record.userId        ? Store.getById('users',        record.userId)        : null;
      const auction = record.auctionId     ? Store.getById('auctions',     record.auctionId)     : null;
      const opp     = record.opportunityId ? Store.getById('opportunities',record.opportunityId) : null;
      const don     = record.donationId    ? Store.getById('donations',    record.donationId)    : null;
      const event   = record.eventId       ? Store.getById('events',       record.eventId)       : null;

      const linkRow = (label, rec, section, displayText) => rec ? `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-3) var(--space-4);border:var(--border-subtle);border-radius:var(--radius-md);background:var(--bg-elevated);margin-bottom:var(--space-2);cursor:pointer" class="linked-record-nav" data-section="${section}" data-id="${rec.id}">
          <div>
            <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:2px">${label}</div>
            <div style="font-size:var(--text-sm);font-weight:var(--fw-medium)">${displayText}</div>
            <div style="font-size:var(--text-xs);color:var(--text-muted)">${rec.id}</div>
          </div>
          <span style="color:var(--text-muted)">${Icons.chevronRight}</span>
        </div>` : '';

      body.innerHTML = `
        <div class="drawer-section">
          <div class="drawer-section-title">Linked Records</div>
          ${!user && !auction && !opp && !don && !event
            ? '<div style="color:var(--text-muted);font-size:var(--text-sm)">No linked records. Edit this task to add links.</div>'
            : `
              ${linkRow('Linked User',        user,    'users',         user    ? `${user.firstName} ${user.lastName}` : '')}
              ${linkRow('Linked Auction',     auction, 'auctions',      auction ? (auction.shortName || auction.title || auction.id) : '')}
              ${linkRow('Linked Opportunity', opp,     'opportunities', opp     ? (opp.shortName || opp.title || opp.id) : '')}
              ${linkRow('Linked Donation',    don,     'donations',     don     ? (don.description || don.title || don.id) : '')}
              ${linkRow('Linked Event',       event,   'events',        event   ? (event.title || event.id) : '')}
            `}
          <button class="btn btn-ghost btn-sm" style="margin-top:var(--space-3)" id="tl-edit-links-btn">${Icons.edit} Edit Links</button>
        </div>
      `;
      body.querySelectorAll('.linked-record-nav').forEach(el => {
        el.addEventListener('click', () => {
          document.getElementById('record-drawer')?.querySelector('.drawer-close')?.click();
          setTimeout(() => Router.navigate(`${el.dataset.section}?open=${el.dataset.id}`), 100);
        });
      });
      body.querySelector('#tl-edit-links-btn')?.addEventListener('click', () => {
        // Switch drawer to edit mode for the Links tab
        document.getElementById('record-drawer')?.querySelector('#drawer-edit-btn')?.click();
      });
    } else {
      // Edit mode — pickers for each link
      body.innerHTML = `
        <div class="drawer-section">
          <div class="drawer-section-title">Edit Links</div>
          <div class="form-grid">
            <div class="form-group form-full"><label class="form-label">Linked User</label><div id="tl-user-wrap"></div></div>
            <div class="form-group form-full"><label class="form-label">Linked Auction</label><div id="tl-auction-wrap"></div></div>
            <div class="form-group form-full"><label class="form-label">Linked Opportunity</label><div id="tl-opp-wrap"></div></div>
            <div class="form-group form-full"><label class="form-label">Linked Donation</label><div id="tl-don-wrap"></div></div>
          </div>
          <div style="margin-top:var(--space-3);font-size:var(--text-xs);color:var(--text-muted)">
            A task can link to multiple records simultaneously. All linked records will show this task in their Tasks tab.
          </div>
        </div>
      `;
      const uw = body.querySelector('#tl-user-wrap');    if(uw){uw.id='lf-tl-u';createLinkedField({container:uw,tableName:'users',searchFields:['firstName','lastName','email'],displayFn:r=>`${r.firstName} ${r.lastName}`,onSelect:id=>linkedFields.userId=id,value:record.userId,placeholder:'Search users...'});}
      const aw = body.querySelector('#tl-auction-wrap'); if(aw){aw.id='lf-tl-a';createLinkedField({container:aw,tableName:'auctions',searchFields:['shortName','title','id'],displayFn:r=>r.shortName||r.title||r.id,onSelect:id=>linkedFields.auctionId=id,value:record.auctionId,placeholder:'Search auctions...'});}
      const ow = body.querySelector('#tl-opp-wrap');    if(ow){ow.id='lf-tl-o';createLinkedField({container:ow,tableName:'opportunities',searchFields:['shortName','title','id'],displayFn:r=>r.shortName||r.title||r.id,onSelect:id=>linkedFields.opportunityId=id,value:record.opportunityId,placeholder:'Search opportunities...'});}
      const dw = body.querySelector('#tl-don-wrap');    if(dw){dw.id='lf-tl-d';createLinkedField({container:dw,tableName:'donations',searchFields:['description','title','id'],displayFn:r=>r.description||r.title||r.id,onSelect:id=>linkedFields.donationId=id,value:record.donationId,placeholder:'Search donations...'});}
    }
  }
}

// ─── Quick Actions bar ────────────────────────────────────────────────────────
function injectTaskQuickActions(taskId, record, drawer, onRefresh) {
  const drawerEl = document.getElementById('record-drawer');
  if (!drawerEl) return;
  const existing = drawerEl.querySelector('#task-qa-bar'); if (existing) existing.remove();
  const bar = document.createElement('div');
  bar.id = 'task-qa-bar';
  bar.style.cssText = `display:flex;gap:8px;flex-wrap:wrap;padding:10px 24px;border-bottom:var(--border-subtle);background:var(--bg-elevated);flex-shrink:0`;

  const isComplete = record.status === 'Complete' || record.status === 'Cancelled';

  bar.innerHTML = `
    ${!isComplete ? `<button class="btn btn-primary btn-sm" id="tqa-complete">✓ Mark Complete</button>` : '<span style="color:var(--status-green);font-size:var(--text-xs);align-self:center">✓ Completed ${record.completedDate||""}</span>'}
    <select class="select" id="tqa-status" style="font-size:var(--text-xs);padding:4px 8px;height:30px">
      ${Store.STATUS.tasks.map(s=>`<option ${record.status===s?'selected':''}>${s}</option>`).join('')}
    </select>
    <select class="select" id="tqa-priority" style="font-size:var(--text-xs);padding:4px 8px;height:30px">
      ${Store.TASK_PRIORITIES.map(p=>`<option ${record.priority===p?'selected':''}>${p}</option>`).join('')}
    </select>
  `;
  const tabs = drawerEl.querySelector('#drawer-tabs'); if (tabs) tabs.after(bar);

  bar.querySelector('#tqa-complete')?.addEventListener('click', async () => {
    const ok = await Confirm.show('Mark this task as Complete?', 'Mark Complete'); if (!ok) return;
    const today = new Date().toISOString().split('T')[0];
    Store.update('tasks', taskId, { status: 'Complete', completedDate: today });
    Toast.success('Task marked complete'); if (onRefresh) onRefresh(); drawer.close();
  });

  bar.querySelector('#tqa-status')?.addEventListener('change', e => {
    const updates = { status: e.target.value };
    if (e.target.value === 'Complete') updates.completedDate = new Date().toISOString().split('T')[0];
    Store.update('tasks', taskId, updates);
    Toast.success(`Status → ${e.target.value}`); if (onRefresh) onRefresh();
  });

  bar.querySelector('#tqa-priority')?.addEventListener('change', e => {
    Store.update('tasks', taskId, { priority: e.target.value });
    Toast.success(`Priority → ${e.target.value}`); if (onRefresh) onRefresh();
  });
}

// ─── Task Creation Form (global — used from Auctions, Users, Opps etc.) ──────
function openTaskForm(existingId, prefillAuctionId, prefillUserId, prefillOppId, onCreated) {
  const existing = existingId ? Store.getById('tasks', existingId) : null;
  const linkedFields = {};
  const today = new Date().toISOString().split('T')[0];

  // Pre-fill labels
  const prefillAuction = prefillAuctionId ? Store.getById('auctions',     prefillAuctionId) : null;
  const prefillUser    = prefillUserId    ? Store.getById('users',        prefillUserId)    : null;
  const prefillOpp     = prefillOppId     ? Store.getById('opportunities',prefillOppId)     : null;

  if (prefillAuctionId) linkedFields.auctionId     = prefillAuctionId;
  if (prefillUserId)    linkedFields.userId         = prefillUserId;
  if (prefillOppId)     linkedFields.opportunityId  = prefillOppId;

  const overlay = document.createElement('div'); overlay.className = 'modal-overlay open';
  overlay.innerHTML = `
    <div class="modal" style="max-width:680px">
      <div class="modal-header">
        <span class="modal-title">${existing ? 'Edit Task' : 'New Task'}</span>
        <button class="drawer-close" id="tf-c">${Icons.close}</button>
      </div>
      <div class="modal-body" style="max-height:72vh;overflow-y:auto">
        ${(prefillAuction||prefillUser||prefillOpp) ? `
          <div style="background:var(--bg-elevated);border:var(--border-subtle);border-radius:var(--radius-md);padding:var(--space-3) var(--space-4);margin-bottom:var(--space-4);font-size:var(--text-xs);color:var(--text-muted)">
            Auto-linked to:
            ${prefillAuction ? `<span class="tag" style="margin-left:4px">Auction: ${prefillAuction.shortName||prefillAuction.id}</span>` : ''}
            ${prefillUser    ? `<span class="tag" style="margin-left:4px">User: ${prefillUser.firstName} ${prefillUser.lastName}</span>` : ''}
            ${prefillOpp     ? `<span class="tag" style="margin-left:4px">Opp: ${prefillOpp.shortName||prefillOpp.id}</span>` : ''}
          </div>` : ''}
        <div class="form-grid">
          <div class="form-group form-full"><label class="form-label">Task Title *</label>
            <input class="input" id="tf-title" value="${existing?.title||''}" placeholder="What needs to be done?"></div>
          <div class="form-group form-full"><label class="form-label">Description</label>
            <textarea class="input" id="tf-description" rows="2" placeholder="More details...">${existing?.description||''}</textarea></div>
          <div class="form-group"><label class="form-label">Task Type</label>
            <select class="select" id="tf-taskType"><option value="">—</option>${Store.TASK_TYPES.map(t=>`<option ${existing?.taskType===t?'selected':''}>${t}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">Status</label>
            <select class="select" id="tf-status">${Store.STATUS.tasks.map(s=>`<option ${(existing?.status||'Open')===s?'selected':''}>${s}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">Priority</label>
            <select class="select" id="tf-priority"><option value="">—</option>${Store.TASK_PRIORITIES.map(p=>`<option ${(existing?.priority||'Medium')===p?'selected':''}>${p}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">Due Date</label>
            <input class="input" id="tf-dueDate" type="date" value="${existing?.dueDate||''}"></div>
          <div class="form-group"><label class="form-label">Due Time</label>
            <input class="input" id="tf-dueTime" type="time" value="${existing?.dueTime||''}"></div>
          <div class="form-group"><label class="form-label">Reminder Date</label>
            <input class="input" id="tf-reminderDate" type="date" value="${existing?.reminderDate||''}"></div>
          <div class="form-group form-full"><label class="form-label">Linked User</label><div id="tf-user-wrap"></div></div>
          <div class="form-group form-full"><label class="form-label">Linked Auction</label><div id="tf-auction-wrap"></div></div>
          <div class="form-group form-full"><label class="form-label">Linked Opportunity</label><div id="tf-opp-wrap"></div></div>
          <div class="form-group form-full"><label class="form-label">Linked Donation</label><div id="tf-don-wrap"></div></div>
          <div class="form-group form-full"><label class="form-label">Assigned To</label><div id="tf-admin-wrap"></div></div>
          <div class="form-group form-full"><label class="form-label">Notes</label>
            <textarea class="input" id="tf-notes" rows="2" placeholder="Internal notes...">${existing?.notes||''}</textarea></div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="tf-cancel">Cancel</button>
        <button class="btn btn-primary" id="tf-submit">${Icons.plus} ${existing ? 'Save Changes' : 'Create Task'}</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelector('#tf-c').onclick = close;
  overlay.querySelector('#tf-cancel').onclick = close;

  createLinkedField({container:overlay.querySelector('#tf-user-wrap'),tableName:'users',searchFields:['firstName','lastName','email'],displayFn:r=>`${r.firstName} ${r.lastName}`,onSelect:id=>linkedFields.userId=id,value:existing?.userId||prefillUserId||null,placeholder:'Search users...'});
  createLinkedField({container:overlay.querySelector('#tf-auction-wrap'),tableName:'auctions',searchFields:['shortName','title','id'],displayFn:r=>r.shortName||r.title||r.id,onSelect:id=>linkedFields.auctionId=id,value:existing?.auctionId||prefillAuctionId||null,placeholder:'Search auctions...'});
  createLinkedField({container:overlay.querySelector('#tf-opp-wrap'),tableName:'opportunities',searchFields:['shortName','title','id'],displayFn:r=>r.shortName||r.title||r.id,onSelect:id=>linkedFields.opportunityId=id,value:existing?.opportunityId||prefillOppId||null,placeholder:'Search opportunities...'});
  createLinkedField({container:overlay.querySelector('#tf-don-wrap'),tableName:'donations',searchFields:['description','title','id'],displayFn:r=>r.description||r.title||r.id,onSelect:id=>linkedFields.donationId=id,value:existing?.donationId||null,placeholder:'Search donations...'});
  createLinkedField({container:overlay.querySelector('#tf-admin-wrap'),tableName:'admins',searchFields:['name','email'],displayFn:r=>r.name,onSelect:id=>linkedFields.assignedToId=id,value:existing?.assignedToId||null,placeholder:'Search admins...'});

  overlay.querySelector('#tf-submit').onclick = () => {
    const title = overlay.querySelector('#tf-title').value.trim();
    if (!title) { Toast.error('Task title is required'); return; }
    const status = overlay.querySelector('#tf-status').value;
    const completedDate = status === 'Complete' ? (existing?.completedDate || today) : (overlay.querySelector('#tf-completedDate')?.value || null);
    const data = {
      title, description: overlay.querySelector('#tf-description').value.trim(),
      taskType: overlay.querySelector('#tf-taskType').value,
      status, priority: overlay.querySelector('#tf-priority').value,
      dueDate: overlay.querySelector('#tf-dueDate').value,
      dueTime: overlay.querySelector('#tf-dueTime').value,
      reminderDate: overlay.querySelector('#tf-reminderDate').value,
      notes: overlay.querySelector('#tf-notes').value.trim(),
      completedDate: completedDate || existing?.completedDate || null,
      userId:        linkedFields.userId        ?? existing?.userId        ?? null,
      auctionId:     linkedFields.auctionId     ?? existing?.auctionId     ?? null,
      opportunityId: linkedFields.opportunityId ?? existing?.opportunityId ?? null,
      donationId:    linkedFields.donationId    ?? existing?.donationId    ?? null,
      eventId:       linkedFields.eventId       ?? existing?.eventId       ?? null,
      assignedToId:  linkedFields.assignedToId  ?? existing?.assignedToId  ?? null,
    };
    if (existing) { Store.update('tasks', existing.id, data); Toast.success('Task updated'); }
    else          { const r = Store.create('tasks', data); Toast.success(`Task created: ${r.id}`); }
    close();
    if (onCreated) onCreated();
  };
}

/**
 * EPIC Foundation CRM — Special Opportunities Module (5 Tabs)
 * Tabs: Dashboard | Current Opportunities | Qualified Buyers | Course Waitlists | Lost Auction Demand
 */
function renderOpportunities(params = {}) {
  const main = document.getElementById('main');
  let activeTab = params.tab || 'dashboard';

  main.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <span class="page-title">Special Opportunities</span>
        <span class="page-subtitle">Premium rounds, qualified buyers, demand management</span>
      </div>
      <div class="page-header-right">
        <button class="btn btn-ghost btn-sm" id="so-export-btn">${Icons.download} Export</button>
        <button class="btn btn-primary" id="so-new-opp-btn">${Icons.plus} New Opportunity</button>
      </div>
    </div>
    <div class="so-tab-bar" id="so-tabs">
      <button class="so-tab ${activeTab==='dashboard'?'active':''}" data-tab="dashboard">Dashboard</button>
      <button class="so-tab ${activeTab==='opps'?'active':''}" data-tab="opps">Current Opportunities</button>
      <button class="so-tab ${activeTab==='buyers'?'active':''}" data-tab="buyers">Qualified Buyers</button>
      <button class="so-tab ${activeTab==='waitlists'?'active':''}" data-tab="waitlists">Course Waitlists</button>
      <button class="so-tab ${activeTab==='demand'?'active':''}" data-tab="demand">Lost Auction Demand</button>
    </div>
    <div id="so-content"></div>`;

  document.getElementById('so-tabs').querySelectorAll('.so-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab;
      document.querySelectorAll('.so-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === activeTab));
      renderTab(activeTab);
    });
  });
  document.getElementById('so-new-opp-btn').addEventListener('click', () => openOppForm(null, { refresh: () => renderTab(activeTab) }));
  document.getElementById('so-export-btn').addEventListener('click', () => { Store.downloadCSV('opportunities','opps-export.csv'); Toast.success('Exported'); });

  renderTab(activeTab);
  if (params.open) setTimeout(() => openOppDrawer(params.open), 100);

  function renderTab(tab) {
    const c = document.getElementById('so-content');
    if (!c) return;
    c.innerHTML = '';
    if      (tab === 'dashboard')  renderDashboard(c);
    else if (tab === 'opps')       renderOppsTab(c);
    else if (tab === 'buyers')     renderBuyersTab(c);
    else if (tab === 'waitlists')  renderWaitlistsTab(c);
    else if (tab === 'demand')     renderDemandTab(c);
  }

  // ─── TAB 1: DASHBOARD ──────────────────────────────────────────────────────
  function renderDashboard(c) {
    const opps  = Store._getTable('opportunities');
    const tasks = Store._getTable('tasks');
    const qbs   = Store._getTable('qualifiedBuyers');
    const wls   = Store._getTable('waitlists');
    const today = new Date().toISOString().split('T')[0];

    const byStat = {};
    Store.STATUS.opportunities.forEach(s => byStat[s] = 0);
    opps.forEach(o => { if (byStat[o.status] !== undefined) byStat[o.status]++; });

    const estVal  = opps.reduce((s,o)=>s+(parseFloat(o.estimatedValue||o.value)||0),0);
    const soldVal = opps.filter(o=>['Sold','Complete'].includes(o.status)).reduce((s,o)=>s+(parseFloat(o.sellPrice)||0),0);
    const openVal = opps.filter(o=>!['Sold','Complete'].includes(o.status)).reduce((s,o)=>s+(parseFloat(o.estimatedValue||o.value)||0),0);

    const oppIds    = new Set(opps.map(o=>o.id));
    const oppTasks  = tasks.filter(t=>t.opportunityId && oppIds.has(t.opportunityId));
    const openTasks = oppTasks.filter(t=>['Open','In Progress'].includes(t.status));
    const overdue   = openTasks.filter(t=>t.dueDate && t.dueDate < today);

    const noBuyer  = opps.filter(o=>!o.buyerId&&!o.interestedUserId&&!['Complete','Sold'].includes(o.status));
    const noCourse = opps.filter(o=>!o.courseId&&!['Complete','Sold'].includes(o.status));
    const upcoming = opps.filter(o=>o.confirmedPlayDate&&o.confirmedPlayDate>=today)
                         .sort((a,b)=>a.confirmedPlayDate.localeCompare(b.confirmedPlayDate)).slice(0,6);

    const cwCounts = {};
    wls.forEach(w=>{ cwCounts[w.courseId]=(cwCounts[w.courseId]||0)+1; });
    const topCourses = Object.entries(cwCounts).sort((a,b)=>b[1]-a[1]).slice(0,5);

    c.innerHTML = `
      <div class="so-dash-wrap">
        <div class="so-stat-grid">
          <div class="so-stat-card so-stat-blue"><div class="so-stat-label">Total Opportunities</div><div class="so-stat-val">${opps.length}</div></div>
          <div class="so-stat-card so-stat-green"><div class="so-stat-label">Est. Total Value</div><div class="so-stat-val">${formatCurrency(estVal)}</div></div>
          <div class="so-stat-card so-stat-emerald"><div class="so-stat-label">Sold Value</div><div class="so-stat-val">${formatCurrency(soldVal)}</div></div>
          <div class="so-stat-card so-stat-orange"><div class="so-stat-label">Open Pipeline</div><div class="so-stat-val">${formatCurrency(openVal)}</div></div>
          <div class="so-stat-card so-stat-purple"><div class="so-stat-label">Qualified Buyers</div><div class="so-stat-val">${qbs.length}</div></div>
          <div class="so-stat-card so-stat-gray"><div class="so-stat-label">Waitlist Entries</div><div class="so-stat-val">${wls.length}</div></div>
        </div>

        <div class="so-status-strip">
          ${Store.STATUS.opportunities.map(s=>`
            <div class="so-mini-stat">
              <div class="so-mini-num">${byStat[s]||0}</div>
              <div class="so-mini-label">${s}</div>
            </div>`).join('')}
        </div>

        <div class="so-dash-panels">
          <div class="so-panel">
            <div class="so-panel-title">⚠ Needs Attention</div>
            <div class="so-panel-row ${noBuyer.length>0?'row-warn':''}"><span>No Buyer Assigned</span><strong>${noBuyer.length}</strong></div>
            <div class="so-panel-row ${noCourse.length>0?'row-warn':''}"><span>No Course Assigned</span><strong>${noCourse.length}</strong></div>
            <div class="so-panel-row"><span>Open Tasks</span><strong>${openTasks.length}</strong></div>
            <div class="so-panel-row ${overdue.length>0?'row-danger':''}"><span>Overdue Tasks</span><strong>${overdue.length}</strong></div>
          </div>
          <div class="so-panel">
            <div class="so-panel-title">📅 Upcoming Scheduled Rounds</div>
            ${upcoming.length ? upcoming.map(o=>{
              const crs=o.courseId?Store.getById('courses',o.courseId):null;
              return `<div class="so-panel-row so-panel-clickable" data-open-opp="${o.id}">
                <span>${o.shortName||o.title||o.id}</span>
                <small>${crs?crs.name:'—'} · ${o.confirmedPlayDate}</small>
              </div>`;
            }).join('') : '<div class="so-empty-msg">No upcoming rounds</div>'}
          </div>
          <div class="so-panel">
            <div class="so-panel-title">🔥 Top Demand Courses</div>
            ${topCourses.length ? topCourses.map(([cId,cnt])=>{
              const crs=Store.getById('courses',cId);
              return `<div class="so-panel-row"><span>${crs?crs.name:cId}</span><strong>${cnt} waitlisted</strong></div>`;
            }).join('') : '<div class="so-empty-msg">No waitlist data yet</div>'}
          </div>
        </div>

        <div class="so-quick-actions">
          <button class="btn btn-primary" id="dash-new-opp">+ New Opportunity</button>
          <button class="btn btn-ghost" id="dash-new-buyer">+ Qualified Buyer</button>
          <button class="btn btn-ghost" id="dash-new-wl">+ Add to Waitlist</button>
          <button class="btn btn-ghost" id="dash-tasks">View Open Tasks (${openTasks.length})</button>
        </div>
      </div>`;

    c.querySelectorAll('[data-open-opp]').forEach(el=>el.addEventListener('click',()=>openOppDrawer(el.dataset.openOpp)));
    c.querySelector('#dash-new-opp')?.addEventListener('click',()=>openOppForm(null,{refresh:()=>renderTab('opps')}));
    c.querySelector('#dash-new-buyer')?.addEventListener('click',()=>openQBForm(null,()=>renderTab('buyers')));
    c.querySelector('#dash-new-wl')?.addEventListener('click',()=>openWaitlistForm(null,null,()=>renderTab('waitlists')));
    c.querySelector('#dash-tasks')?.addEventListener('click',()=>Router.navigate('tasks'));
  }

  // ─── TAB 2: CURRENT OPPORTUNITIES ─────────────────────────────────────────
  function renderOppsTab(c) {
    c.innerHTML = '<div class="page-content"><div id="opps-table-wrap"></div></div>';
    const tbl = new CRMTable({
      containerId: 'opps-table-wrap', tableName: 'opportunities',
      searchFields: ['id','shortName','title'],
      filterDefs: [
        { field: 'status',    label: 'All Statuses',    options: Store.STATUS.opportunities },
        { field: 'type',      label: 'All Types',       options: Store.OPPORTUNITY_TYPES },
        { field: 'roundType', label: 'All Round Types', options: Store.ROUND_TYPES },
        { field: 'schedulingStatus', label: 'Scheduling', options: Store.SCHEDULING_STATUS },
      ],
      defaultSort: 'createdAt', defaultSortDir: 'desc',
      columns: [
        { field: 'shortName', label: 'Name', sortable: true, render: r=>`<span style="font-weight:var(--fw-medium)">${r.shortName||r.title||'—'}</span>` },
        { field: 'status',    label: 'Status', sortable: true, isStatus: true },
        { field: 'type',      label: 'Type', sortable: true, render: r=>r.type?`<span class="tag">${r.type}</span>`:'<span style="color:var(--text-muted)">—</span>' },
        { field: 'courseId',  label: 'Course', render: r=>{ const c=r.courseId?Store.getById('courses',r.courseId):null; return c?c.name:'<span style="color:var(--text-muted)">—</span>'; }},
        { field: 'donorId',   label: 'Donor',  render: r=>{ const u=r.donorId?Store.getById('users',r.donorId):null; return u?`${u.firstName} ${u.lastName}`:'<span style="color:var(--text-muted)">—</span>'; }},
        { field: 'buyerId',   label: 'Buyer',  render: r=>{ const uid=r.buyerId||r.interestedUserId; const u=uid?Store.getById('users',uid):null; return u?`<span style="color:var(--text-accent)">${u.firstName} ${u.lastName}</span>`:'<span style="color:var(--text-muted)">—</span>'; }},
        { field: 'estimatedValue', label: 'Value', sortable: true, render: r=>`<span style="color:var(--status-green)">${formatCurrency(r.estimatedValue||r.value)}</span>` },
        { field: 'confirmedPlayDate', label: 'Play Date', sortable: true, render: r=>`<span style="font-size:var(--text-xs);color:var(--text-muted)">${r.confirmedPlayDate||'—'}</span>` },
      ],
      onRowClick: id => openOppDrawer(id),
    });
    tbl.render();
  }

  function openOppDrawer(id) {
    let record = Store.getById('opportunities', id);
    if (!record) return;
    let formData = { ...record };
    const linkedFields = {};
    const TABS = ['Details','Scheduling','Tasks','Linked','Notes','Activity'];
    const view = new RecordFullView({ tabs: TABS });
    view.open({
      recordId: record.id, title: record.shortName||record.title, tabs: TABS,
      tabRenderer: (body, tab, editMode) => {
        record = Store.getById('opportunities', id) || record;
        if      (tab === 'Details')    renderOppDetails(body, record, formData, editMode, linkedFields);
        else if (tab === 'Scheduling') renderOppScheduling(body, record, formData, editMode);
        else if (tab === 'Tasks')      renderOppTasksTab(body, record, id, view);
        else if (tab === 'Linked')     renderOppLinked(body, record);
        else if (tab === 'Notes')      renderNotesTab(body, record, 'opportunities');
        else if (tab === 'Activity')   body.innerHTML = renderActivityLog(record.activityLog);
      },
      onSave: () => {
        const updates = { ...formData };
        if (linkedFields.courseId !== undefined) updates.courseId = linkedFields.courseId;
        if (linkedFields.donorId  !== undefined) updates.donorId  = linkedFields.donorId;
        if (linkedFields.buyerId  !== undefined) { updates.buyerId = linkedFields.buyerId; updates.interestedUserId = linkedFields.buyerId; }
        Store.update('opportunities', id, updates);
        Toast.success('Opportunity saved'); renderTab(activeTab);
        view.updateTitle(updates.shortName||updates.title||'Opportunity', id);
      },
      onDelete: () => { Store.remove('opportunities', id); Toast.success('Deleted'); renderTab(activeTab); Router.navigate(`opportunities?tab=${activeTab}`); },
      onClose: () => Router.navigate(`opportunities?tab=${activeTab}`),
    });
  }

  function renderOppDetails(body, record, formData, editMode, linkedFields) {
    const inp = (fid,val,type='text',ph='') => editMode
      ? `<input class="input" id="${fid}" type="${type}" value="${String(val||'').replace(/"/g,'&quot;')}" placeholder="${ph}">`
      : `<div style="font-size:var(--text-sm)">${val||'<span style="color:var(--text-muted)">—</span>'}</div>`;
    body.innerHTML = `
      <div class="drawer-section"><div class="drawer-section-title">Details</div><div class="form-grid">
        <div class="form-group"><label class="form-label">Type</label>
          ${editMode?`<select class="select" id="od-type"><option value="">—</option>${Store.OPPORTUNITY_TYPES.map(o=>`<option ${record.type===o?'selected':''}>${o}</option>`).join('')}</select>`:`<span class="tag">${record.type||'—'}</span>`}</div>
        <div class="form-group"><label class="form-label">Status</label>
          ${editMode?`<select class="select" id="od-status">${Store.STATUS.opportunities.map(s=>`<option ${record.status===s?'selected':''}>${s}</option>`).join('')}</select>`:StatusBadge.render(record.status)}</div>
        <div class="form-group form-full"><label class="form-label">Short Name</label>${inp('od-shortName',record.shortName,'text','Short display name')}</div>
        <div class="form-group form-full"><label class="form-label">Full Title</label>${inp('od-title',record.title,'text','Full title')}</div>
        <div class="form-group form-full"><label class="form-label">Description</label>
          ${editMode?`<textarea class="input" id="od-description" rows="3" style="width:100%">${record.description||''}</textarea>`:`<div style="font-size:var(--text-sm);white-space:pre-wrap">${record.description||'<span style="color:var(--text-muted)">—</span>'}</div>`}</div>
        <div class="form-group"><label class="form-label">Est. Value ($)</label>${inp('od-estimatedValue',record.estimatedValue||record.value,'number','0')}</div>
        <div class="form-group"><label class="form-label">Sell Price ($)</label>${inp('od-sellPrice',record.sellPrice,'number','0')}</div>
        <div class="form-group"><label class="form-label">Quantity</label>${inp('od-quantity',record.quantity,'number','1')}</div>
        <div class="form-group"><label class="form-label">City</label>${inp('od-city',record.city)}</div>
        <div class="form-group"><label class="form-label">State</label>${inp('od-state',record.state)}</div>
      </div></div>
      <div class="drawer-section"><div class="drawer-section-title">Linked People & Course</div><div class="form-grid">
        <div class="form-group"><label class="form-label">Course</label>${editMode?`<div id="od-course-wrap"></div>`:renderLinkedCourseChip(record.courseId)}</div>
        <div class="form-group"><label class="form-label">Donor</label>${editMode?`<div id="od-donor-wrap"></div>`:renderLinkedUserChip(record.donorId,'Donor')}</div>
        <div class="form-group"><label class="form-label">Buyer</label>${editMode?`<div id="od-buyer-wrap"></div>`:renderLinkedUserChip(record.buyerId||record.interestedUserId,'Buyer')}</div>
      </div></div>`;
    if (editMode) {
      ['type','status','shortName','title','description','city','state'].forEach(f=>{const el=body.querySelector(`#od-${f}`);if(!el)return;el.addEventListener(el.tagName==='SELECT'?'change':'input',()=>formData[f]=el.value);});
      ['estimatedValue','sellPrice','quantity'].forEach(f=>{const el=body.querySelector(`#od-${f}`);if(el)el.addEventListener('input',()=>formData[f]=parseFloat(el.value)||null);});
      const cw=body.querySelector('#od-course-wrap');if(cw)createLinkedField({container:cw,tableName:'courses',searchFields:['name'],displayFn:r=>r.name,onSelect:id=>linkedFields.courseId=id,value:record.courseId,placeholder:'Search courses...'});
      const dw=body.querySelector('#od-donor-wrap');if(dw)createLinkedField({container:dw,tableName:'users',searchFields:['firstName','lastName','email'],displayFn:r=>`${r.firstName} ${r.lastName}`,onSelect:id=>linkedFields.donorId=id,value:record.donorId,placeholder:'Search users...'});
      const bw=body.querySelector('#od-buyer-wrap');if(bw)createLinkedField({container:bw,tableName:'users',searchFields:['firstName','lastName','email'],displayFn:r=>`${r.firstName} ${r.lastName}`,onSelect:id=>{linkedFields.buyerId=id;linkedFields.interestedUserId=id;},value:record.buyerId||record.interestedUserId,placeholder:'Search users...'});
    }
  }

  function renderOppScheduling(body, record, formData, editMode) {
    const inp=(fid,val,type='text')=>editMode?`<input class="input" id="${fid}" type="${type}" value="${val||''}">`:`<div style="font-size:var(--text-sm)">${val||'<span style="color:var(--text-muted)">—</span>'}</div>`;
    body.innerHTML=`<div class="drawer-section"><div class="drawer-section-title">Round Scheduling</div><div class="form-grid">
      <div class="form-group"><label class="form-label">Round Type</label>
        ${editMode?`<select class="select" id="os-roundType"><option value="">—</option>${Store.ROUND_TYPES.map(r=>`<option ${record.roundType===r?'selected':''}>${r}</option>`).join('')}</select>`:`<div style="font-size:var(--text-sm)">${record.roundType||'—'}</div>`}</div>
      <div class="form-group"><label class="form-label">Players</label>${inp('os-players',record.players,'number')}</div>
      <div class="form-group"><label class="form-label">Requested Date</label>${inp('os-requestedDate',record.requestedDate,'date')}</div>
      <div class="form-group"><label class="form-label">Confirmed Play Date</label>${inp('os-confirmedPlayDate',record.confirmedPlayDate,'date')}</div>
      <div class="form-group form-full"><label class="form-label">Scheduling Status</label>
        ${editMode?`<select class="select" id="os-schedulingStatus"><option value="">—</option>${Store.SCHEDULING_STATUS.map(s=>`<option ${record.schedulingStatus===s?'selected':''}>${s}</option>`).join('')}</select>`:`<span class="tag">${record.schedulingStatus||'Not Started'}</span>`}</div>
    </div></div>`;
    if(editMode){
      ['roundType','schedulingStatus'].forEach(f=>{const el=body.querySelector(`#os-${f}`);if(el)el.addEventListener('change',()=>formData[f]=el.value);});
      ['requestedDate','confirmedPlayDate'].forEach(f=>{const el=body.querySelector(`#os-${f}`);if(el)el.addEventListener('change',()=>formData[f]=el.value);});
      const pe=body.querySelector('#os-players');if(pe)pe.addEventListener('input',()=>formData.players=parseInt(pe.value)||null);
    }
  }

  function renderOppTasksTab(body, record, oppId, drawer) {
    const tasks=Store.getLinked('tasks','opportunityId',oppId);
    const open=tasks.filter(t=>['Open','In Progress'].includes(t.status));
    const closed=tasks.filter(t=>!['Open','In Progress'].includes(t.status));
    body.innerHTML=`<div class="drawer-section">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-3)">
        <div class="drawer-section-title" style="margin:0">Tasks (${tasks.length})</div>
        <button class="btn btn-ghost btn-sm" id="opp-add-task">+ Add Task</button>
      </div>
      ${open.length?open.map(t=>`<div class="task-row"><span class="task-title">${t.title}</span>${StatusBadge.render(t.status)}</div>`).join(''):'<div class="empty-state-sm">No open tasks</div>'}
      ${closed.length?`<div style="margin-top:var(--space-3);color:var(--text-muted);font-size:var(--text-xs)">${closed.length} completed</div>`:''}
    </div>`;
    body.querySelector('#opp-add-task')?.addEventListener('click',()=>openTaskForm(null,null,oppId,null,()=>{ drawer.refresh&&drawer.refresh(); renderTab(activeTab); }));
  }

  function renderOppLinked(body, record) {
    const course=record.courseId?[Store.getById('courses',record.courseId)].filter(Boolean):[];
    const donor=record.donorId?[Store.getById('users',record.donorId)].filter(Boolean):[];
    const buyer=(record.buyerId||record.interestedUserId)?[Store.getById('users',record.buyerId||record.interestedUserId)].filter(Boolean):[];
    body.innerHTML=`
      ${renderRelatedSection('Course',course.map(c=>({...c,title:c.name})),'courses','name')}
      ${renderRelatedSection('Donor',donor,'users','lastName')}
      ${renderRelatedSection('Buyer',buyer,'users','lastName')}`;
  }

  // ─── TAB 3: QUALIFIED BUYERS ──────────────────────────────────────────────
  function renderBuyersTab(c) {
    c.innerHTML = `<div style="display:flex;justify-content:flex-end;padding:var(--space-3) var(--space-4) 0"><button class="btn btn-primary btn-sm" id="new-qb-btn">+ Qualified Buyer</button></div><div class="page-content"><div id="qb-table-wrap"></div></div>`;
    c.querySelector('#new-qb-btn').addEventListener('click',()=>openQBForm(null,()=>renderTab('buyers')));
    new CRMTable({
      containerId:'qb-table-wrap', tableName:'qualifiedBuyers', searchFields:['notes','tags'],
      filterDefs:[
        {field:'tier',          label:'All Tiers',    options:Store.BUYER_TIERS},
        {field:'interestLevel', label:'All Interest', options:Store.INTEREST_LEVELS},
        {field:'willingToTravel',label:'Travel',      options:Store.TRAVEL_OPTIONS},
      ],
      defaultSort:'createdAt', defaultSortDir:'desc',
      columns:[
        {field:'userId',      label:'Buyer',    render:r=>{const u=Store.getById('users',r.userId);return u?`<span style="font-weight:var(--fw-medium)">${u.firstName} ${u.lastName}</span>`:'<span style="color:var(--text-muted)">Unknown</span>';}},
        {field:'tier',        label:'Tier',     sortable:true, render:r=>r.tier?`<span class="tag">${r.tier}</span>`:'—'},
        {field:'interestLevel',label:'Interest',sortable:true, render:r=>r.interestLevel||'—'},
        {field:'willingToTravel',label:'Travel',render:r=>r.willingToTravel||'—'},
        {field:'budgetTier',  label:'Budget',   render:r=>r.budgetTier||'—'},
        {field:'lastContacted',label:'Last Contact',sortable:true,render:r=>r.lastContacted?`<span style="font-size:var(--text-xs);color:var(--text-muted)">${r.lastContacted}</span>`:'—'},
        {field:'active',      label:'Status',   render:r=>r.active===false?'<span class="tag tag-gray">Inactive</span>':'<span class="tag tag-green">Active</span>'},
      ],
      onRowClick:id=>openQBDrawer(id,()=>renderTab('buyers')),
    }).render();
  }

  function openQBForm(existing, onDone) {
    const ov=document.createElement('div'); ov.className='modal-overlay open';
    ov.innerHTML=`<div class="modal" style="max-width:520px">
      <div class="modal-header"><span class="modal-title">${existing?'Edit':'New'} Qualified Buyer</span><button class="drawer-close" id="qbf-x">${Icons.close}</button></div>
      <div class="modal-body">
        <div class="form-group"><label class="form-label">Linked User *</label><div id="qbf-user-wrap"></div></div>
        <div class="form-grid">
          <div class="form-group"><label class="form-label">Buyer Tier</label><select class="select" id="qbf-tier"><option value="">—</option>${Store.BUYER_TIERS.map(t=>`<option ${existing?.tier===t?'selected':''}>${t}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">Interest Level</label><select class="select" id="qbf-interest"><option value="">—</option>${Store.INTEREST_LEVELS.map(t=>`<option ${existing?.interestLevel===t?'selected':''}>${t}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">Willing to Travel</label><select class="select" id="qbf-travel"><option value="">—</option>${Store.TRAVEL_OPTIONS.map(t=>`<option ${existing?.willingToTravel===t?'selected':''}>${t}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">Budget Tier</label><select class="select" id="qbf-budget"><option value="">—</option>${Store.BUDGET_TIERS.map(t=>`<option ${existing?.budgetTier===t?'selected':''}>${t}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">Last Contacted</label><input class="input" id="qbf-lc" type="date" value="${existing?.lastContacted||''}"></div>
          <div class="form-group"><label class="form-label">Favorite Courses</label><input class="input" id="qbf-fav" type="text" placeholder="e.g. Pebble Beach..." value="${existing?.favoriteCourses||''}"></div>
        </div>
        <div class="form-group"><label class="form-label">Tags</label><input class="input" id="qbf-tags" type="text" placeholder="comma-separated" value="${existing?.tags||''}"></div>
        <div class="form-group"><label class="form-label">Notes</label><textarea class="input" id="qbf-notes" rows="3" style="width:100%">${existing?.notes||''}</textarea></div>
      </div>
      <div class="modal-footer"><button class="btn btn-secondary" id="qbf-no">Cancel</button><button class="btn btn-primary" id="qbf-ok">Save Buyer</button></div>
    </div>`;
    document.body.appendChild(ov);
    let selUser=existing?.userId||null;
    const close=()=>ov.remove();
    ov.querySelector('#qbf-x').onclick=ov.querySelector('#qbf-no').onclick=close;
    createLinkedField({container:ov.querySelector('#qbf-user-wrap'),tableName:'users',searchFields:['firstName','lastName','email'],displayFn:r=>`${r.firstName} ${r.lastName}`,onSelect:id=>{selUser=id;},value:existing?.userId||null,placeholder:'Search existing users...'});
    ov.querySelector('#qbf-ok').onclick=()=>{
      if(!selUser){Toast.error('Select a user');return;}
      const data={userId:selUser,tier:ov.querySelector('#qbf-tier').value,interestLevel:ov.querySelector('#qbf-interest').value,willingToTravel:ov.querySelector('#qbf-travel').value,budgetTier:ov.querySelector('#qbf-budget').value,lastContacted:ov.querySelector('#qbf-lc').value,favoriteCourses:ov.querySelector('#qbf-fav').value,tags:ov.querySelector('#qbf-tags').value,notes:ov.querySelector('#qbf-notes').value,active:true};
      if(existing)Store.update('qualifiedBuyers',existing.id,data); else Store.create('qualifiedBuyers',data);
      Toast.success(existing?'Updated':'Qualified buyer added'); close(); onDone&&onDone();
    };
  }

  function openQBDrawer(id, onClose) {
    const record=Store.getById('qualifiedBuyers',id); if(!record)return;
    const user=Store.getById('users',record.userId);
    const oppHist=Store._getTable('opportunities').filter(o=>o.buyerId===record.userId||o.interestedUserId===record.userId);
    const userWls=Store._getTable('waitlists').filter(w=>w.userId===record.userId);
    const ov=document.createElement('div'); ov.className='modal-overlay open';
    ov.innerHTML=`<div class="modal" style="max-width:600px">
      <div class="modal-header">
        <span class="modal-title">👤 ${user?user.firstName+' '+user.lastName:'Qualified Buyer'}</span>
        <div style="display:flex;gap:8px">
          <button class="btn btn-ghost btn-sm" id="qbd-edit">Edit</button>
          <button class="btn btn-ghost btn-sm" id="qbd-wl">+ Waitlist</button>
          <button class="btn btn-ghost btn-sm" id="qbd-task">+ Task</button>
          <button class="drawer-close" id="qbd-x">${Icons.close}</button>
        </div>
      </div>
      <div class="modal-body">
        <div class="form-grid">
          <div class="form-group"><label class="form-label">Tier</label><span class="tag">${record.tier||'—'}</span></div>
          <div class="form-group"><label class="form-label">Interest</label><span>${record.interestLevel||'—'}</span></div>
          <div class="form-group"><label class="form-label">Travel</label><span>${record.willingToTravel||'—'}</span></div>
          <div class="form-group"><label class="form-label">Budget</label><span>${record.budgetTier||'—'}</span></div>
          <div class="form-group"><label class="form-label">Last Contacted</label><span>${record.lastContacted||'—'}</span></div>
          <div class="form-group"><label class="form-label">Status</label><span>${record.active===false?'Inactive':'Active'}</span></div>
          ${record.favoriteCourses?`<div class="form-group form-full"><label class="form-label">Favorite Courses</label><span>${record.favoriteCourses}</span></div>`:''}
          ${record.tags?`<div class="form-group form-full"><label class="form-label">Tags</label><span class="tag">${record.tags}</span></div>`:''}
          ${record.notes?`<div class="form-group form-full"><label class="form-label">Notes</label><div style="font-size:var(--text-sm);white-space:pre-wrap">${record.notes}</div></div>`:''}
        </div>
        <div class="drawer-section-title">Course Waitlists (${userWls.length})</div>
        ${userWls.length?userWls.map(w=>{const crs=Store.getById('courses',w.courseId);return `<div class="so-panel-row"><span>${crs?crs.name:w.courseId}</span><small>Priority ${w.priority||'—'} · ${w.interestLevel||'—'}</small></div>`;}).join(''):'<div class="so-empty-msg">No waitlists</div>'}
        <div class="drawer-section-title" style="margin-top:var(--space-4)">Opportunity History (${oppHist.length})</div>
        ${oppHist.length?oppHist.map(o=>`<div class="so-panel-row so-panel-clickable" data-opp="${o.id}"><span>${o.shortName||o.title||o.id}</span>${StatusBadge.render(o.status)}</div>`).join(''):'<div class="so-empty-msg">None</div>'}
      </div>
    </div>`;
    document.body.appendChild(ov);
    const close=()=>{ov.remove();onClose&&onClose();};
    ov.querySelector('#qbd-x').onclick=close;
    ov.querySelector('#qbd-edit').onclick=()=>{ov.remove();openQBForm(record,()=>renderTab('buyers'));};
    ov.querySelector('#qbd-wl').onclick=()=>openWaitlistForm(record.userId,null,()=>{ov.remove();renderTab('waitlists');});
    ov.querySelector('#qbd-task').onclick=()=>openTaskForm(null,null,null,null,()=>{});
    ov.querySelectorAll('[data-opp]').forEach(el=>el.addEventListener('click',()=>{ov.remove();openOppDrawer(el.dataset.opp);}));
  }

  // ─── TAB 4: COURSE WAITLISTS ──────────────────────────────────────────────
  function renderWaitlistsTab(c) {
    let wlView='course';
    c.innerHTML=`<div class="so-dash-wrap">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-4)">
        <div class="avt-btn-group">
          <button class="avt-btn active" data-wv="course">By Course</button>
          <button class="avt-btn" data-wv="user">By User</button>
        </div>
        <button class="btn btn-primary btn-sm" id="new-wl-btn">+ Add to Waitlist</button>
      </div>
      <div id="wl-content"></div>
    </div>`;
    c.querySelector('#new-wl-btn').addEventListener('click',()=>openWaitlistForm(null,null,()=>renderTab('waitlists')));
    c.querySelectorAll('[data-wv]').forEach(btn=>{
      btn.addEventListener('click',()=>{
        wlView=btn.dataset.wv;
        c.querySelectorAll('[data-wv]').forEach(b=>b.classList.toggle('active',b.dataset.wv===wlView));
        renderWlContent(c.querySelector('#wl-content'),wlView);
      });
    });
    renderWlContent(c.querySelector('#wl-content'),wlView);
  }

  function renderWlContent(el,view) {
    const wls=Store._getTable('waitlists');
    if(view==='course'){
      const byCourse={};
      wls.forEach(w=>{if(!byCourse[w.courseId])byCourse[w.courseId]=[];byCourse[w.courseId].push(w);});
      const courses=Store._getTable('courses').filter(crs=>byCourse[crs.id]);
      el.innerHTML=`<div class="so-wl-grid">${courses.map(crs=>{
        const entries=byCourse[crs.id].sort((a,b)=>(a.priority||99)-(b.priority||99));
        return `<div class="so-wl-card"><div class="so-wl-card-hdr">${crs.name}<span class="rounds-col-count" style="background:var(--accent-muted);color:var(--accent)">${entries.length}</span></div>
          ${entries.map(w=>{const u=Store.getById('users',w.userId);return `<div class="so-wl-row"><span>${u?u.firstName+' '+u.lastName:'Unknown'}</span><span class="so-wl-meta">#${w.priority||'—'} · ${w.interestLevel||'—'}</span><div><button class="card-action-btn" data-wl-edit="${w.id}">Edit</button><button class="card-action-btn" data-wl-del="${w.id}">Remove</button></div></div>`;}).join('')}
        </div>`;
      }).join('')}${Object.keys(byCourse).length===0?'<div class="so-empty-msg">No waitlist entries yet</div>':''}</div>`;
    } else {
      const byUser={};
      wls.forEach(w=>{if(!byUser[w.userId])byUser[w.userId]=[];byUser[w.userId].push(w);});
      el.innerHTML=`<div class="so-wl-grid">${Object.entries(byUser).map(([uid,entries])=>{
        const u=Store.getById('users',uid);
        return `<div class="so-wl-card"><div class="so-wl-card-hdr">${u?u.firstName+' '+u.lastName:uid}<span class="rounds-col-count" style="background:var(--accent-muted);color:var(--accent)">${entries.length}</span></div>
          ${entries.map(w=>{const crs=Store.getById('courses',w.courseId);return `<div class="so-wl-row"><span>${crs?crs.name:'Unknown Course'}</span><span class="so-wl-meta">#${w.priority||'—'} · ${w.interestLevel||'—'}</span><div><button class="card-action-btn" data-wl-edit="${w.id}">Edit</button><button class="card-action-btn" data-wl-del="${w.id}">Remove</button></div></div>`;}).join('')}
        </div>`;
      }).join('')}${Object.keys(byUser).length===0?'<div class="so-empty-msg">No waitlist entries yet</div>':''}</div>`;
    }
    el.querySelectorAll('[data-wl-edit]').forEach(btn=>{const w=Store.getById('waitlists',btn.dataset.wlEdit);btn.addEventListener('click',()=>openWaitlistForm(w?.userId,w?.courseId,()=>renderTab('waitlists'),w));});
    el.querySelectorAll('[data-wl-del]').forEach(btn=>{btn.addEventListener('click',async()=>{const ok=await Confirm.show('Remove this waitlist entry?','Remove');if(!ok)return;Store.remove('waitlists',btn.dataset.wlDel);Toast.success('Removed');renderTab('waitlists');});});
  }

  function openWaitlistForm(preUser,preCourse,onDone,existing) {
    const ov=document.createElement('div');ov.className='modal-overlay open';
    ov.innerHTML=`<div class="modal" style="max-width:500px">
      <div class="modal-header"><span class="modal-title">${existing?'Edit':'Add to'} Course Waitlist</span><button class="drawer-close" id="wlf-x">${Icons.close}</button></div>
      <div class="modal-body">
        <div class="form-group"><label class="form-label">User *</label><div id="wlf-user-wrap"></div></div>
        <div class="form-group"><label class="form-label">Course *</label><div id="wlf-course-wrap"></div></div>
        <div class="form-grid">
          <div class="form-group"><label class="form-label">Priority</label><input class="input" id="wlf-p" type="number" min="1" value="${existing?.priority||''}"></div>
          <div class="form-group"><label class="form-label">Interest Level</label><select class="select" id="wlf-int"><option value="">—</option>${Store.INTEREST_LEVELS.map(l=>`<option ${existing?.interestLevel===l?'selected':''}>${l}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">Date Added</label><input class="input" id="wlf-date" type="date" value="${existing?.dateAdded||new Date().toISOString().split('T')[0]}"></div>
          <div class="form-group"><label class="form-label">Source</label><input class="input" id="wlf-src" type="text" value="${existing?.source||''}" placeholder="How they expressed interest..."></div>
        </div>
        <div class="form-group"><label class="form-label">Notes</label><textarea class="input" id="wlf-notes" rows="2" style="width:100%">${existing?.notes||''}</textarea></div>
      </div>
      <div class="modal-footer"><button class="btn btn-secondary" id="wlf-no">Cancel</button><button class="btn btn-primary" id="wlf-ok">Save Entry</button></div>
    </div>`;
    document.body.appendChild(ov);
    let selUser=preUser||existing?.userId||null, selCourse=preCourse||existing?.courseId||null;
    const close=()=>ov.remove();
    ov.querySelector('#wlf-x').onclick=ov.querySelector('#wlf-no').onclick=close;
    createLinkedField({container:ov.querySelector('#wlf-user-wrap'),tableName:'users',searchFields:['firstName','lastName','email'],displayFn:r=>`${r.firstName} ${r.lastName}`,onSelect:id=>{selUser=id;},value:selUser,placeholder:'Search users...'});
    createLinkedField({container:ov.querySelector('#wlf-course-wrap'),tableName:'courses',searchFields:['name'],displayFn:r=>r.name,onSelect:id=>{selCourse=id;},value:selCourse,placeholder:'Search courses...'});
    ov.querySelector('#wlf-ok').onclick=()=>{
      if(!selUser||!selCourse){Toast.error('User and course required');return;}
      const data={userId:selUser,courseId:selCourse,priority:parseInt(ov.querySelector('#wlf-p').value)||null,interestLevel:ov.querySelector('#wlf-int').value,dateAdded:ov.querySelector('#wlf-date').value,source:ov.querySelector('#wlf-src').value,notes:ov.querySelector('#wlf-notes').value};
      if(existing)Store.update('waitlists',existing.id,data); else Store.create('waitlists',data);
      Toast.success(existing?'Updated':'Added to waitlist'); close(); onDone&&onDone();
    };
  }

  // ─── TAB 5: LOST AUCTION DEMAND ───────────────────────────────────────────
  function renderDemandTab(c) {
    c.innerHTML=`<div style="display:flex;justify-content:flex-end;padding:var(--space-3) var(--space-4) 0"><button class="btn btn-primary btn-sm" id="new-ld-btn">+ Lost Demand Record</button></div><div class="page-content"><div id="ld-table-wrap"></div></div>`;
    c.querySelector('#new-ld-btn').addEventListener('click',()=>openDemandForm(null,()=>renderTab('demand')));
    new CRMTable({
      containerId:'ld-table-wrap',tableName:'lostDemand',searchFields:['notes'],
      filterDefs:[
        {field:'status',         label:'All Statuses', options:Store.STATUS.lostDemand},
        {field:'interestLevel',  label:'Interest',     options:Store.INTEREST_LEVELS},
        {field:'addedToWaitlist',label:'Waitlisted',   options:['true','false']},
        {field:'contacted',      label:'Contacted',    options:['true','false']},
      ],
      defaultSort:'createdAt',defaultSortDir:'desc',
      columns:[
        {field:'userId',   label:'User',    render:r=>{const u=Store.getById('users',r.userId);return u?`${u.firstName} ${u.lastName}`:'—';}},
        {field:'auctionId',label:'Auction', render:r=>{const a=r.auctionId?Store.getById('auctions',r.auctionId):null;return a?`<span style="font-size:var(--text-xs)">${a.shortName||a.id}</span>`:'—';}},
        {field:'courseId', label:'Course',  render:r=>{const crs=r.courseId?Store.getById('courses',r.courseId):null;if(crs)return crs.name;const a=r.auctionId?Store.getById('auctions',r.auctionId):null;const ac=a?.courseId?Store.getById('courses',a.courseId):null;return ac?ac.name:'—';}},
        {field:'interestLevel',   label:'Interest',   sortable:true,render:r=>r.interestLevel||'—'},
        {field:'addedToWaitlist', label:'Waitlisted', render:r=>r.addedToWaitlist?'<span class="tag tag-green">Yes</span>':'<span class="tag tag-gray">No</span>'},
        {field:'contacted',       label:'Contacted',  render:r=>r.contacted?'<span class="tag tag-green">Yes</span>':'<span class="tag tag-gray">No</span>'},
        {field:'auctionCloseDate',label:'Close Date', sortable:true,render:r=>`<span style="font-size:var(--text-xs);color:var(--text-muted)">${r.auctionCloseDate||'—'}</span>`},
      ],
      onRowClick:id=>openDemandDrawer(id,()=>renderTab('demand')),
    }).render();
  }

  function openDemandForm(existing,onDone) {
    const ov=document.createElement('div');ov.className='modal-overlay open';
    ov.innerHTML=`<div class="modal" style="max-width:520px">
      <div class="modal-header"><span class="modal-title">${existing?'Edit':'New'} Lost Demand Record</span><button class="drawer-close" id="ldf-x">${Icons.close}</button></div>
      <div class="modal-body">
        <div class="form-group"><label class="form-label">User *</label><div id="ldf-user-wrap"></div></div>
        <div class="form-group"><label class="form-label">Related Auction</label><div id="ldf-auction-wrap"></div></div>
        <div class="form-group"><label class="form-label">Course (if different from auction)</label><div id="ldf-course-wrap"></div></div>
        <div class="form-grid">
          <div class="form-group"><label class="form-label">Interest Level</label><select class="select" id="ldf-int"><option value="">—</option>${Store.INTEREST_LEVELS.map(l=>`<option ${existing?.interestLevel===l?'selected':''}>${l}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">Auction Close Date</label><input class="input" id="ldf-cd" type="date" value="${existing?.auctionCloseDate||''}"></div>
        </div>
        <div class="form-group"><label class="form-label">Notes</label><textarea class="input" id="ldf-notes" rows="3" style="width:100%">${existing?.notes||''}</textarea></div>
      </div>
      <div class="modal-footer"><button class="btn btn-secondary" id="ldf-no">Cancel</button><button class="btn btn-primary" id="ldf-ok">Save</button></div>
    </div>`;
    document.body.appendChild(ov);
    let selUser=existing?.userId||null,selAuction=existing?.auctionId||null,selCourse=existing?.courseId||null;
    const close=()=>ov.remove();
    ov.querySelector('#ldf-x').onclick=ov.querySelector('#ldf-no').onclick=close;
    createLinkedField({container:ov.querySelector('#ldf-user-wrap'),tableName:'users',searchFields:['firstName','lastName','email'],displayFn:r=>`${r.firstName} ${r.lastName}`,onSelect:id=>{selUser=id;},value:selUser,placeholder:'Search users...'});
    createLinkedField({container:ov.querySelector('#ldf-auction-wrap'),tableName:'auctions',searchFields:['shortName','title','id'],displayFn:r=>r.shortName||r.title||r.id,onSelect:id=>{selAuction=id;},value:selAuction,placeholder:'Search auctions...'});
    createLinkedField({container:ov.querySelector('#ldf-course-wrap'),tableName:'courses',searchFields:['name'],displayFn:r=>r.name,onSelect:id=>{selCourse=id;},value:selCourse,placeholder:'Optional — inherits from auction...'});
    ov.querySelector('#ldf-ok').onclick=()=>{
      if(!selUser){Toast.error('User required');return;}
      const data={userId:selUser,auctionId:selAuction||null,courseId:selCourse||null,interestLevel:ov.querySelector('#ldf-int').value,auctionCloseDate:ov.querySelector('#ldf-cd').value,notes:ov.querySelector('#ldf-notes').value,addedToWaitlist:existing?.addedToWaitlist||false,contacted:existing?.contacted||false,status:'New'};
      if(existing)Store.update('lostDemand',existing.id,data); else Store.create('lostDemand',data);
      Toast.success(existing?'Updated':'Lost demand record created'); close(); onDone&&onDone();
    };
  }

  function openDemandDrawer(id,onDone) {
    const record=Store.getById('lostDemand',id);if(!record)return;
    const user=Store.getById('users',record.userId);
    const auction=record.auctionId?Store.getById('auctions',record.auctionId):null;
    const auctionCourse=auction?.courseId?Store.getById('courses',auction.courseId):null;
    const course=record.courseId?Store.getById('courses',record.courseId):auctionCourse;
    const ov=document.createElement('div');ov.className='modal-overlay open';
    ov.innerHTML=`<div class="modal" style="max-width:580px">
      <div class="modal-header">
        <span class="modal-title">Lost Demand — ${user?user.firstName+' '+user.lastName:'Unknown'}</span>
        <div style="display:flex;gap:8px">
          <button class="btn btn-ghost btn-sm" id="ldd-wl">+ Add to Waitlist</button>
          <button class="btn btn-ghost btn-sm" id="ldd-qb">+ Qualified Buyer</button>
          <button class="btn btn-ghost btn-sm" id="ldd-task">+ Task</button>
          <button class="btn btn-ghost btn-sm" id="ldd-edit">Edit</button>
          <button class="drawer-close" id="ldd-x">${Icons.close}</button>
        </div>
      </div>
      <div class="modal-body">
        <div class="form-grid">
          <div class="form-group"><label class="form-label">User</label><span>${user?user.firstName+' '+user.lastName:'—'}</span></div>
          <div class="form-group"><label class="form-label">Auction</label><span>${auction?auction.shortName||auction.id:'—'}</span></div>
          <div class="form-group"><label class="form-label">Course</label><span>${course?course.name:'—'}</span></div>
          <div class="form-group"><label class="form-label">Interest Level</label><span>${record.interestLevel||'—'}</span></div>
          <div class="form-group"><label class="form-label">Auction Close Date</label><span>${record.auctionCloseDate||'—'}</span></div>
        </div>
        ${record.notes?`<div class="form-group"><label class="form-label">Notes</label><div style="font-size:var(--text-sm);white-space:pre-wrap">${record.notes}</div></div>`:''}
        <div class="form-grid" style="margin-top:var(--space-4)">
          <label class="form-group" style="cursor:pointer;display:flex;align-items:center;gap:8px"><input type="checkbox" id="ldd-wl-chk" ${record.addedToWaitlist?'checked':''}><span class="form-label" style="margin:0">Added to Waitlist</span></label>
          <label class="form-group" style="cursor:pointer;display:flex;align-items:center;gap:8px"><input type="checkbox" id="ldd-ct-chk" ${record.contacted?'checked':''}><span class="form-label" style="margin:0">Contacted</span></label>
        </div>
        <div class="modal-footer" style="padding:0;margin-top:var(--space-4)">
          <button class="btn btn-primary" id="ldd-save">Save Status</button>
        </div>
      </div>
    </div>`;
    document.body.appendChild(ov);
    const close=()=>{ov.remove();onDone&&onDone();};
    ov.querySelector('#ldd-x').onclick=close;
    ov.querySelector('#ldd-save').onclick=()=>{Store.update('lostDemand',id,{addedToWaitlist:ov.querySelector('#ldd-wl-chk').checked,contacted:ov.querySelector('#ldd-ct-chk').checked});Toast.success('Updated');close();};
    ov.querySelector('#ldd-edit').onclick=()=>{ov.remove();openDemandForm(record,()=>renderTab('demand'));};
    ov.querySelector('#ldd-wl').onclick=()=>{const cId=record.courseId||(auction?.courseId)||null;openWaitlistForm(record.userId,cId,()=>{ov.remove();renderTab('waitlists');});};
    ov.querySelector('#ldd-qb').onclick=()=>{openQBForm({userId:record.userId},()=>{ov.remove();renderTab('buyers');});};
    ov.querySelector('#ldd-task').onclick=()=>openTaskForm(null,null,null,null,()=>{});
  }

} // end renderOpportunities

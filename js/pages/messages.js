/**
 * EPIC Foundation CRM — Messages / Inquiries Page
 */

function renderMessages(params = {}) {
  const main = document.getElementById('main');

  main.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <span class="page-title">Messages & Inquiries</span>
        <span class="page-subtitle">Inbound messages, leads, and contact inquiries</span>
      </div>
      <div class="page-header-right">
        <button class="btn btn-primary" id="new-msg-btn">${Icons.plus} Log Message</button>
      </div>
    </div>
    <div class="page-content"><div id="messages-table-wrap"></div></div>
  `;

  const table = new CRMTable({
    containerId: 'messages-table-wrap',
    tableName: 'messages',
    searchFields: ['fromName', 'fromEmail', 'subject', 'body'],
    filterDefs: [{ field: 'status', label: 'All Statuses', options: Store.STATUS.messages }],
    defaultSort: 'createdAt',
    defaultSortDir: 'desc',
    preFilter: items => {
      if (table && table.state.filters.status === 'Closed') return items;
      return items.filter(r => r.status !== 'Closed');
    },
    columns: [
      { field: 'fromName',     label: 'From',        sortable: true },
      { field: 'fromEmail',    label: 'Email',       sortable: true },
      { field: 'subject',      label: 'Subject',     sortable: true },
      { field: 'linkedUserId', label: 'Linked User', sortable: false, render: row => {
        if (!row.linkedUserId) return '<span style="color:var(--text-muted)">—</span>';
        const u = Store.getById('users', row.linkedUserId);
        return u ? `${u.firstName} ${u.lastName}` : row.linkedUserId;
      }},
      { field: 'createdAt',    label: 'Received',    sortable: true, render: row => `<span style="color:var(--text-muted)">${Store.formatDate(row.createdAt)}</span>` },
      { field: 'status',       label: 'Status',      sortable: true, isStatus: true },
    ],
    onRowClick: id => openMsgDrawer(id),
  });

  table.render();
  if (params.open) setTimeout(() => openMsgDrawer(params.open), 100);
  document.getElementById('new-msg-btn').addEventListener('click', () => openMsgForm(null, table));

  function openMsgDrawer(id) {
    let record = Store.getById('messages', id);
    if (!record) return;
    let formData = { ...record };
    let linkedFields = {};
    const TABS = ['Message', 'Details', 'Notes', 'Activity'];
    const view = new RecordFullView({ tabs: TABS });

    view.open({
      recordId: record.id,
      title: record.subject || 'Message',
      tabs: TABS,
      tabRenderer: (body, tab, editMode) => {
        record = Store.getById('messages', id);
        if (tab === 'Message') {
          body.innerHTML = `
            <div class="drawer-section"><div class="drawer-section-title">Message Content</div>
              <div style="display:flex;gap:var(--space-4);margin-bottom:var(--space-4);flex-wrap:wrap">
                <div><div style="font-size:var(--text-xs);color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px">From</div><div style="font-weight:var(--fw-medium)">${record.fromName||'—'} ${record.fromEmail?`<span style="color:var(--text-muted);font-size:var(--text-sm)">&lt;${record.fromEmail}&gt;</span>`:''}</div></div>
                <div style="margin-left:auto">${StatusBadge.render(record.status)}</div>
              </div>
              <div style="font-size:var(--text-md);font-weight:var(--fw-medium);margin-bottom:var(--space-3)">${record.subject||'No Subject'}</div>
              <div style="background:var(--bg-elevated);border:var(--border-subtle);border-radius:var(--radius-md);padding:var(--space-4);font-size:var(--text-sm);color:var(--text-secondary);line-height:var(--leading-loose);white-space:pre-wrap">${record.body||'—'}</div>
              <div style="margin-top:var(--space-4);display:flex;gap:var(--space-3);flex-wrap:wrap;">
                ${record.fromEmail ? `<a href="mailto:${record.fromEmail}?subject=Re: ${encodeURIComponent(record.subject || 'Your Inquiry')}" class="btn btn-primary btn-sm">Reply via Email</a>` : ''}
                ${['Open','Replied','Closed'].map(s=>record.status!==s?`<button class="btn btn-secondary btn-sm" onclick="Store.update('messages','${id}',{status:'${s}'}); Toast.success('Status updated'); table.refresh();">${s}</button>`:``).join('')}
              </div>
            </div>
            <div class="drawer-section"><div class="drawer-section-title">Linked User</div>
              ${record.linkedUserId ? renderLinkedUserChip(record.linkedUserId) : `<span style="color:var(--text-muted);font-size:var(--text-sm)">No user linked. If this is an existing contact, link them below.</span>`}
              ${editMode ? `<div id="m-user-wrap" style="margin-top:var(--space-3)"></div>` : ''}
            </div>
          `;
          if (editMode) {
            const uw = body.querySelector('#m-user-wrap'); if (uw) { uw.id='lf-m-user'; createLinkedField({container:uw,tableName:'users',searchFields:['firstName','lastName','email'],displayFn:r=>`${r.firstName} ${r.lastName}`,onSelect:id=>linkedFields.linkedUserId=id,value:record.linkedUserId,placeholder:'Search users...'}); }
          }
        }
        else if (tab === 'Details') {
          body.innerHTML = `
            <div class="drawer-section"><div class="drawer-section-title">Sender Details</div>
              <div class="form-grid">
                <div class="form-group"><label class="form-label">From Name</label><div style="color:var(--text-primary)">${record.fromName||'—'}</div></div>
                <div class="form-group"><label class="form-label">From Email</label><a href="mailto:${record.fromEmail}" style="color:var(--text-accent);font-size:var(--text-sm)">${record.fromEmail||'—'}</a></div>
                <div class="form-group"><label class="form-label">Status</label>
                  ${editMode ? `<select class="select" id="m-status">${Store.STATUS.messages.map(s=>`<option ${record.status===s?'selected':''}>${s}</option>`).join('')}</select>` : StatusBadge.render(record.status)}
                </div>
                <div class="form-group"><label class="form-label">Received</label><div style="color:var(--text-muted);font-size:var(--text-sm)">${Store.formatDateTime(record.createdAt)}</div></div>
              </div>
            </div>
          `;
          if (editMode) {
            const el = body.querySelector('#m-status'); if (el) el.addEventListener('change', ()=>formData.status=el.value);
          }
        }
        else if (tab === 'Notes') renderNotesTab(body, record, 'messages');
        else if (tab === 'Activity') body.innerHTML = renderActivityLog(record.activityLog);
      },
      onSave: () => { Store.update('messages', id, {...formData,...linkedFields}); Toast.success('Message updated'); table.refresh(); },
      onDelete: () => { Store.remove('messages', id); Toast.success('Message deleted'); table.refresh(); Router.navigate('messages'); },
      onClose: () => Router.navigate('messages'),
    });
  }
}

function openMsgForm(existingId, table) {
  const existing = existingId ? Store.getById('messages', existingId) : null;
  const linkedFields = {};
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay open';
  overlay.innerHTML = `
    <div class="modal" style="width:min(640px,95vw)">
      <div class="modal-header"><span class="modal-title">Log Message / Inquiry</span><button class="drawer-close" id="modal-close">${Icons.close}</button></div>
      <div class="modal-body">
        <div class="form-grid">
          <div class="form-group"><label class="form-label">From Name *</label><input class="input" id="mf-fromName" value="${existing?.fromName||''}" placeholder="Contact name"></div>
          <div class="form-group"><label class="form-label">From Email</label><input class="input" id="mf-fromEmail" type="email" value="${existing?.fromEmail||''}" placeholder="email@example.com"></div>
          <div class="form-group form-full"><label class="form-label">Subject *</label><input class="input" id="mf-subject" value="${existing?.subject||''}" placeholder="What is this message about?"></div>
          <div class="form-group form-full"><label class="form-label">Message Body</label><textarea class="textarea" id="mf-body" style="min-height:120px">${existing?.body||''}</textarea></div>
          <div class="form-group"><label class="form-label">Status</label><select class="select" id="mf-status">${Store.STATUS.messages.map(s=>`<option ${(existing?.status||'Open')===s?'selected':''}>${s}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">Linked User</label><div id="mf-user-wrap"></div></div>
        </div>
      </div>
      <div class="modal-footer"><button class="btn btn-secondary" id="modal-cancel">Cancel</button><button class="btn btn-primary" id="modal-submit">${Icons.plus} ${existing?'Save':'Log Message'}</button></div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('#modal-close').onclick = overlay.querySelector('#modal-cancel').onclick = ()=>overlay.remove();
  createLinkedField({container:overlay.querySelector('#mf-user-wrap'),tableName:'users',searchFields:['firstName','lastName','email'],displayFn:r=>`${r.firstName} ${r.lastName}`,onSelect:id=>linkedFields.linkedUserId=id,value:existing?.linkedUserId,placeholder:'Search users...'});
  overlay.querySelector('#modal-submit').onclick = () => {
    const fromName=overlay.querySelector('#mf-fromName').value.trim(),subject=overlay.querySelector('#mf-subject').value.trim();
    if (!fromName||!subject){Toast.error('From name and subject are required');return;}
    const data={fromName,fromEmail:overlay.querySelector('#mf-fromEmail').value.trim(),subject,body:overlay.querySelector('#mf-body').value,status:overlay.querySelector('#mf-status').value,linkedUserId:linkedFields.linkedUserId||existing?.linkedUserId||null};
    if(existing){Store.update('messages',existing.id,data);Toast.success('Message updated');}
    else{const r=Store.create('messages',data);Toast.success(`Message logged: ${r.id}`);}
    overlay.remove();table.refresh();
  };
}

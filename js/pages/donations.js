/**
 * EPIC Foundation CRM — Donations Page (Full Rebuild)
 * 5-stage pipeline, Assignment tab, Convert-to-Auction/Opportunity quick actions.
 */

function renderDonations(params = {}) {
  const main = document.getElementById('main');

  main.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <span class="page-title">Donations</span>
        <span class="page-subtitle">All donated items, rounds, and contributions — track from receipt to fulfillment</span>
      </div>
      <div class="page-header-right">
        <button class="btn btn-ghost btn-sm" id="export-don-btn">${Icons.download} Export</button>
        <button class="btn btn-primary" id="new-don-btn">${Icons.plus} New Donation</button>
      </div>
    </div>
    <div class="page-content"><div id="donations-table-wrap"></div></div>
  `;


  let donTable;
  donTable = new CRMTable({
    containerId: 'donations-table-wrap',
    tableName: 'donations',
    searchFields: ['id', 'description', 'title', 'donorId', 'type'],
    filterDefs: [
      { field: 'status', label: 'All Statuses', options: Store.STATUS.donations },
      { field: 'type',   label: 'All Types',    options: Store.DONATION_TYPES },
    ],
    defaultSort: 'createdAt', defaultSortDir: 'desc',
    columns: [
      { field: 'description', label: 'Name / Description', sortable: true, render: row =>
        `<span style="font-weight:var(--fw-medium)">${row.description || row.title || '—'}</span>` },
      { field: 'type',        label: 'Type',      sortable: true, render: row =>
        row.type ? `<span class="tag">${row.type}</span>` : '—' },
      { field: 'donorId',     label: 'Donor',     sortable: false, render: row => {
        const u = row.donorId ? Store.getById('users', row.donorId) : null;
        return u ? `${u.firstName} ${u.lastName}` : '<span style="color:var(--text-muted)">—</span>';
      }},
      { field: 'courseId',    label: 'Course',    sortable: false, render: row => {
        const c = row.courseId ? Store.getById('courses', row.courseId) : null;
        return c ? c.name : '<span style="color:var(--text-muted)">—</span>';
      }},
      { field: 'assignedToType', label: 'Assigned To', sortable: true, render: row => {
        if (!row.assignedToRecord || !row.assignedToType || row.assignedToType === 'Unassigned') {
          return '<span style="color:var(--text-muted);font-size:var(--text-xs)">Unassigned</span>';
        }
        return `<span class="tag" style="background:var(--badge-blue-bg);color:var(--badge-blue-text)">${row.assignedToType}: ${row.assignedToRecord}</span>`;
      }},
      { field: 'estimatedValue', label: 'Value',  sortable: true, render: row =>
        `<span style="color:var(--status-green)">${formatCurrency(row.estimatedValue || row.value)}</span>` },
      { field: 'dateDonated', label: 'Date',      sortable: true, render: row =>
        `<span style="color:var(--text-muted);font-size:var(--text-xs)">${row.dateDonated || row.receivedDate || '—'}</span>` },
      { field: 'status', label: 'Status', sortable: true, render: row => {
        if (row.status === 'Complete') {
          return `<span class="badge badge-purple">Complete</span>`;
        }
        return StatusBadge.render(row.status);
      }},
    ],
    preFilter: items => {
      // Only hide Complete when the user hasn't explicitly filtered for it
      if (donTable && donTable.state.filters.status === 'Complete') return items;
      return items.filter(r => r.status !== 'Complete');
    },
    onRowClick: id => openDonationDrawer(id),
  });

  donTable.render();
  if (params.open) setTimeout(() => openDonationDrawer(params.open), 100);
  document.getElementById('new-don-btn').addEventListener('click', () => openDonationForm(null, donTable));
  document.getElementById('export-don-btn').addEventListener('click', () => {
    Store.downloadCSV('donations', 'donations-export.csv');
    Toast.success('Donations exported');
  });

  function openDonationDrawer(id) {
    let record = Store.getById('donations', id);
    if (!record) return;
    let formData = { ...record };
    const linkedFields = {};
    const TABS = ['Details', 'Assignment', 'Linked', 'Notes', 'Activity'];
    const view = new RecordFullView({ tabs: TABS });

    view.open({
      recordId: record.id,
      title: record.description || record.title || record.id,
      tabs: TABS,
      tabRenderer: (body, tab, editMode) => {
        record = Store.getById('donations', id) || record;
        if      (tab === 'Details')    renderDonDetails(body, record, formData, editMode);
        else if (tab === 'Assignment') renderDonAssignment(body, record, formData, editMode, id, donTable, view, () => {});
        else if (tab === 'Linked')     renderDonLinked(body, record);
        else if (tab === 'Notes')      renderNotesTab(body, record, 'donations');
        else if (tab === 'Activity')   body.innerHTML = renderActivityLog(record.activityLog);
      },
      onSave: () => {
        const updates = { ...formData };
        if (linkedFields.donorId  !== undefined) updates.donorId  = linkedFields.donorId;
        if (linkedFields.courseId !== undefined) updates.courseId = linkedFields.courseId;
        Store.update('donations', id, updates);
        Toast.success('Donation saved'); donTable.refresh();
        view.updateTitle(updates.description || updates.title || id, id);
      },
      onDelete: () => { Store.remove('donations', id); Toast.success('Donation deleted'); donTable.refresh(); Router.navigate('donations'); },
      onClose: () => Router.navigate('donations'),
    });
  }

  function renderDonDetails(body, record, formData, editMode) {
    const inp = (fid, val, type='text', ph='') =>
      editMode ? `<input class="input" id="${fid}" type="${type}" value="${String(val||'').replace(/"/g,'&quot;')}" placeholder="${ph}">`
               : `<div style="font-size:var(--text-sm)">${val || '<span style="color:var(--text-muted)">—</span>'}</div>`;

    body.innerHTML = `
      <div class="drawer-section">
        <div class="drawer-section-title">Donation Details</div>
        <div class="form-grid">
          <div class="form-group form-full"><label class="form-label">Description / Name</label>${inp('dd-description', record.description||record.title, 'text', 'What was donated?')}</div>
          <div class="form-group"><label class="form-label">Type</label>
            ${editMode ? `<select class="select" id="dd-type"><option value="">—</option>${Store.DONATION_TYPES.map(t=>`<option ${record.type===t?'selected':''}>${t}</option>`).join('')}</select>`
              : (record.type ? `<span class="tag">${record.type}</span>` : '—')}</div>
          <div class="form-group"><label class="form-label">Status</label>
            ${editMode ? `<select class="select" id="dd-status">${Store.STATUS.donations.map(s=>`<option ${record.status===s?'selected':''}>${s}</option>`).join('')}</select>`
              : StatusBadge.render(record.status)}</div>
          <div class="form-group"><label class="form-label">Est. Value ($)</label>${inp('dd-estimatedValue', record.estimatedValue||record.value, 'number', '0')}</div>
          <div class="form-group"><label class="form-label">Quantity</label>${inp('dd-quantity', record.quantity, 'number', '1')}</div>
          <div class="form-group"><label class="form-label">Date Donated</label>${inp('dd-dateDonated', record.dateDonated||record.receivedDate, 'date')}</div>
          <div class="form-group form-full"><label class="form-label">Internal Notes</label>
            ${editMode ? `<textarea class="input" id="dd-internalNotes" rows="3" style="width:100%">${record.internalNotes||record.notes||''}</textarea>`
              : `<div style="font-size:var(--text-sm);color:var(--text-secondary);white-space:pre-wrap">${record.internalNotes||record.notes||'<span style="color:var(--text-muted)">—</span>'}</div>`}
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
      ['description','type','status','dateDonated','internalNotes'].forEach(f=>{const el=body.querySelector(`#dd-${f}`);if(el)el.addEventListener(el.tagName==='SELECT'?'change':'input',()=>formData[f]=el.value);});
      ['estimatedValue','quantity'].forEach(f=>{const el=body.querySelector(`#dd-${f}`);if(el)el.addEventListener('input',()=>formData[f]=parseFloat(el.value)||null);});
    }
  }

  function renderDonAssignment(body, record, formData, editMode, id, tbl, drawer, refreshChips) {
    const isAssigned = record.assignedToRecord && record.assignedToType && record.assignedToType !== 'Unassigned';
    const assignedLabel = isAssigned ? `${record.assignedToType}: ${record.assignedToRecord}` : 'Not assigned';

    body.innerHTML = `
      <div class="drawer-section">
        <div class="drawer-section-title">Current Assignment</div>
        <div style="margin-bottom:var(--space-4)">
          ${isAssigned
            ? `<div style="display:flex;align-items:center;gap:var(--space-3)">
                <span style="width:10px;height:10px;border-radius:50%;background:var(--status-blue);flex-shrink:0"></span>
                <span style="font-size:var(--text-sm);font-weight:var(--fw-medium)">${assignedLabel}</span>
              </div>`
            : `<div style="color:var(--text-muted);font-size:var(--text-sm)">This donation is not yet assigned to any record.</div>`
          }
        </div>
        ${editMode ? `
          <div class="form-grid">
            <div class="form-group"><label class="form-label">Assign To Type</label>
              <select class="select" id="da-type">
                ${Store.ASSIGNED_TO_TYPES.map(t=>`<option ${record.assignedToType===t?'selected':''}>${t}</option>`).join('')}
              </select>
            </div>
            <div class="form-group"><label class="form-label">Record ID</label>
              <input class="input" id="da-record" value="${record.assignedToRecord||''}" placeholder="e.g. AUCT0001 or OPP0001">
            </div>
          </div>
        ` : ''}
      </div>
      <div class="drawer-section">
        <div class="drawer-section-title">Quick Actions</div>
        <div style="display:flex;gap:var(--space-3);flex-wrap:wrap">
          <button class="btn btn-ghost btn-sm" id="da-to-auction">${Icons.plus} Convert → Auction</button>
          <button class="btn btn-ghost btn-sm" id="da-to-opp">${Icons.plus} Convert → Opportunity</button>
        </div>
        <div style="margin-top:var(--space-3);font-size:var(--text-xs);color:var(--text-muted)">
          Convert pre-fills the creation form with this donation's donor, course, and estimated value.
        </div>
      </div>
    `;

    if (editMode) {
      const typeEl=body.querySelector('#da-type'); const recEl=body.querySelector('#da-record');
      if(typeEl)typeEl.addEventListener('change',()=>formData.assignedToType=typeEl.value);
      if(recEl)recEl.addEventListener('input',()=>formData.assignedToRecord=recEl.value.trim());
    }

    body.querySelector('#da-to-auction')?.addEventListener('click', async () => {
      const ok = await Confirm.show(
        `Create a new Auction from this donation?\n\nTitle: "${record.description || record.title || 'Donation'}"\nDonor and value will be copied automatically.`,
        'Convert to Auction'
      );
      if (!ok) return;

      // Build auction record from donation data
      const donor = record.donorId ? Store.getById('users', record.donorId) : null;
      const course = record.courseId ? Store.getById('courses', record.courseId) : null;

      const newAuction = Store.create('auctions', {
        title: record.description || record.title || `Donation ${record.id}`,
        shortName: record.description || record.title || '',
        status: 'New',
        _manualStatus: true,
        donorId: record.donorId || null,
        courseId: record.courseId || null,
        reservePrice: record.estimatedValue || record.value || null,
        fmv: record.estimatedValue || record.value || null,
        players: record.quantity || 1,
        notes: `Converted from Donation ${record.id}`,
        _donationId: record.id,
        activityLog: [
          { type: 'converted', text: `Converted from Donation ${record.id}: "${record.description || record.title || ''}"`, actor: 'Admin', timestamp: new Date().toISOString() },
        ],
      });

      if (!newAuction) { Toast.error('Failed to create Auction'); return; }

      // Mark donation as Assigned to new auction
      Store.update('donations', record.id, {
        assignedToType: 'Auction',
        assignedToRecord: newAuction.id,
        status: 'Complete',
      });
      Object.assign(record, Store.getById('donations', record.id));

      donTable.refresh();
      view.updateTitle(record.description || `Donation ${record.id}`, record.id);
      renderDonAssignment(body, record, formData, editMode, id, donTable, view, refreshChips);
      Toast.success(`Auction ${newAuction.id} created and linked.`);
    });

    body.querySelector('#da-to-opp')?.addEventListener('click', async () => {
      const ok = await Confirm.show(
        `Create a new Opportunity from this donation?\n\nTitle: "${record.description || record.title || 'Donation'}"\nDonor and value will be copied automatically.`,
        'Convert to Opportunity'
      );
      if (!ok) return;

      const newOpp = Store.create('opportunities', {
        title: record.description || record.title || `Donation ${record.id}`,
        shortName: record.description || record.title || '',
        status: 'Available',
        donorId: record.donorId || null,
        courseId: record.courseId || null,
        estimatedValue: record.estimatedValue || record.value || null,
        notes: `Converted from Donation ${record.id}`,
        _donationId: record.id,
      });

      if (!newOpp) { Toast.error('Failed to create Opportunity'); return; }

      Store.update('donations', record.id, {
        assignedToType: 'Opportunity',
        assignedToRecord: newOpp.id,
        status: 'Complete',
      });
      Object.assign(record, Store.getById('donations', record.id));

      donTable.refresh();
      view.updateTitle(record.description || `Donation ${record.id}`, record.id);
      renderDonAssignment(body, record, formData, editMode, id, donTable, view, refreshChips);
      Toast.success(`Opportunity ${newOpp.id} created and linked.`);
    });
  }

  function renderDonLinked(body, record) {
    const donor  = record.donorId  ? [Store.getById('users',   record.donorId)].filter(Boolean)  : [];
    const course = record.courseId ? [Store.getById('courses',  record.courseId)].filter(Boolean) : [];
    const tasks  = Store.getAll('tasks').filter(t=>t.donationId===record.id);
    body.innerHTML = `
      ${renderRelatedSection('Donor', donor, 'users', 'lastName')}
      ${renderRelatedSection('Course', course.map(c=>({...c,title:c.name})), 'courses', 'name')}
      ${tasks.length > 0 ? renderRelatedSection('Tasks', tasks, 'tasks', 'title') : ''}
    `;
  }
}

function openDonationForm(existingId, table, prefill = {}) {
  const existing = existingId ? Store.getById('donations', existingId) : null;
  const linkedFields = {};
  const formData = existing ? { ...existing } : { status: 'New', ...prefill };

  const overlay = document.createElement('div'); overlay.className = 'modal-overlay open';
  overlay.innerHTML = `
    <div class="modal" style="max-width:640px">
      <div class="modal-header"><span class="modal-title">${existing?'Edit Donation':'New Donation'}</span><button class="drawer-close" id="df-c">${Icons.close}</button></div>
      <div class="modal-body" style="max-height:72vh;overflow-y:auto">
        <div class="form-grid">
          <div class="form-group form-full"><label class="form-label">Description *</label><input class="input" id="df-desc" value="${formData.description||formData.title||''}" placeholder="What was donated?"></div>
          <div class="form-group"><label class="form-label">Type</label><select class="select" id="df-type"><option value="">—</option>${Store.DONATION_TYPES.map(t=>`<option ${formData.type===t?'selected':''}>${t}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">Status</label><select class="select" id="df-status">${Store.STATUS.donations.map(s=>`<option ${(formData.status||'New')===s?'selected':''}>${s}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">Est. Value ($)</label><input class="input" id="df-value" type="number" value="${formData.estimatedValue||formData.value||''}"></div>
          <div class="form-group"><label class="form-label">Quantity</label><input class="input" id="df-quantity" type="number" value="${formData.quantity||1}"></div>
          <div class="form-group"><label class="form-label">Date Donated</label><input class="input" id="df-date" type="date" value="${formData.dateDonated||formData.receivedDate||''}"></div>
          <div class="form-group form-full"><label class="form-label">Donor (User)</label><div id="df-donor"></div></div>
          <div class="form-group form-full"><label class="form-label">Course / Club</label><div id="df-course"></div></div>
          <div class="form-group"><label class="form-label">Assign To Type</label><select class="select" id="df-assignType"><option value="">Unassigned</option>${['Auction','Opportunity','Event'].map(t=>`<option ${formData.assignedToType===t?'selected':''}>${t}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">Assign To Record ID</label><input class="input" id="df-assignRecord" value="${formData.assignedToRecord||''}" placeholder="e.g. AUCT0001"></div>
          <div class="form-group form-full"><label class="form-label">Internal Notes</label><textarea class="input" id="df-notes" rows="2" placeholder="Internal notes...">${formData.internalNotes||formData.notes||''}</textarea></div>
        </div>
      </div>
      <div class="modal-footer"><button class="btn btn-secondary" id="df-cancel">Cancel</button><button class="btn btn-primary" id="df-submit">${Icons.plus} ${existing?'Save Changes':'Create Donation'}</button></div>
    </div>`;
  document.body.appendChild(overlay);
  const close=()=>overlay.remove();
  overlay.querySelector('#df-c').onclick=close; overlay.querySelector('#df-cancel').onclick=close;
  createLinkedField({container:overlay.querySelector('#df-donor'),tableName:'users',searchFields:['firstName','lastName','email'],displayFn:r=>`${r.firstName} ${r.lastName}`,onSelect:id=>linkedFields.donorId=id,value:formData.donorId,placeholder:'Search users...'});
  createLinkedField({container:overlay.querySelector('#df-course'),tableName:'courses',searchFields:['name'],displayFn:r=>r.name,onSelect:id=>linkedFields.courseId=id,value:formData.courseId,placeholder:'Search courses...'});
  overlay.querySelector('#df-submit').onclick=()=>{
    const description=overlay.querySelector('#df-desc').value.trim();
    if(!description){Toast.error('Description required');return;}
    const assignedToType=overlay.querySelector('#df-assignType').value||'Unassigned';
    const assignedToRecord=overlay.querySelector('#df-assignRecord').value.trim()||null;
    const status=assignedToRecord&&assignedToType!=='Unassigned'?'Assigned':overlay.querySelector('#df-status').value;
    const data={description,type:overlay.querySelector('#df-type').value,status,estimatedValue:parseFloat(overlay.querySelector('#df-value').value)||null,quantity:parseInt(overlay.querySelector('#df-quantity').value)||1,dateDonated:overlay.querySelector('#df-date').value,internalNotes:overlay.querySelector('#df-notes').value,donorId:linkedFields.donorId||formData.donorId||null,courseId:linkedFields.courseId||formData.courseId||null,assignedToType,assignedToRecord};
    if(existing){Store.update('donations',existing.id,data);Toast.success('Donation updated');}
    else{const r=Store.create('donations',data);Toast.success(`Donation created: ${r.id}`);}
    close(); if(table)table.refresh();
  };
}

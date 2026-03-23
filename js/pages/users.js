/**
 * EPIC Foundation CRM — Users Page (Full CRM Hub)
 * Centralized contact system: Members, Donors, Brokers.
 * Supports multi-role, tags, full profile view, cross-table linking,
 * duplicate detection, CSV import/export, and autofill across all tabs.
 */

function renderUsers(params = {}) {
  const main = document.getElementById('main');

  // ─── PAGE SCAFFOLD ────────────────────────────────────────────────────────────
  main.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <span class="page-title">Users</span>
        <span class="page-subtitle">Master contact database — Members, Donors, Brokers</span>
      </div>
      <div class="page-header-right">
        <button class="btn btn-ghost btn-sm" id="import-users-btn">${Icons.imports} Import CSV</button>
        <button class="btn btn-ghost btn-sm" id="export-users-btn">${Icons.download} Export</button>
        <button class="btn btn-primary" id="new-user-btn">${Icons.plus} New User</button>
      </div>
    </div>

    <div class="page-content">
      <div id="users-table-wrap"></div>
    </div>

    <!-- Hidden file input for CSV import -->
    <input type="file" id="csv-file-input" accept=".csv,.txt" style="display:none">
  `;


  // ─── AUTO-SPAWN PUBLIC USER FOR DEMO ──────────────────────────────────────────
  if (!Store.getAll('users').find(u => (u.types || []).includes('Public'))) {
    Store.create('users', {
      firstName: 'Jane', lastName: 'Public', email: 'jane@public.org',
      phone: '555-0199', city: 'Demo City', state: 'CA',
      status: 'Active', userTypes: ['Public'], tags: ['New Contact']
    });
  }

  // ─── TABLE ────────────────────────────────────────────────────────────────────
  const table = new CRMTable({
    containerId: 'users-table-wrap',
    tableName: 'users',
    searchFields: ['firstName', 'lastName', 'email', 'phone', 'company', 'city', 'state', 'id'],
    filterDefs: [
      { field: 'status', label: 'All Statuses', options: Store.STATUS.users },
      { field: 'types',  label: 'All Types',    options: Store.USER_TYPES },
      { field: 'tags',   label: 'All Tags',     options: Store.TAG_OPTIONS },
    ],
    defaultSort: 'lastName',
    columns: [
      { field: 'firstName', label: 'First',       sortable: true },
      { field: 'lastName',  label: 'Last',        sortable: true },
      { field: 'types', label: 'Type', sortable: true, sortFn: (a, b, dir) => {
        const topTypes = ['Member', 'Broker', 'Public'];
        const aType = (a.types || []).find(t => topTypes.includes(t)) || '';
        const bType = (b.types || []).find(t => topTypes.includes(t)) || '';
        return dir === 'asc' ? aType.localeCompare(bType) : bType.localeCompare(aType);
      }, render: row => {
        if (!row.types || !row.types.length) return '<span style="color:var(--text-muted)">—</span>';
        const topTypes = ['Member', 'Broker', 'Public'];
        const displayType = row.types.find(t => topTypes.includes(t));
        if (!displayType) return '<span style="color:var(--text-muted)">—</span>';
        const cMap = {
          'Member': 'background:#e0e7ff;color:#3730a3',
          'Broker': 'background:#dcfce7;color:#166534',
          'Public': 'background:#fce7f3;color:#9d174d'
        };
        return `<span class="tag" style="${cMap[displayType]};margin-right:3px;border:none">${displayType}</span>`;
      }},
      { field: 'email',     label: 'Email',       sortable: true, render: row => `<span style="font-size:var(--text-xs)">${row.email||'—'}</span>` },
      { field: 'phone',     label: 'Phone',       sortable: false, render: row => `<span style="font-size:var(--text-xs)">${row.phone||'—'}</span>` },
      { field: 'city',      label: 'City',        sortable: true },
      { field: 'state',     label: 'State',       sortable: true, width: '70px' },
      { field: 'status',    label: 'Status',      sortable: true,  isStatus: true },
      { field: 'linked',    label: 'Linked To',   sortable: false, render: row => {
        const act = Store.getUserActivity(row.id);
        const parts = [];
        const aucts = (act.auctionsDonated?.length||0) + (act.auctionsBought?.length||0);
        if (aucts > 0) parts.push(`${aucts} Auction${aucts>1?'s':''}`);
        const opps = (act.opportunitiesDonated?.length||0) + (act.opportunitiesJoined?.length||0);
        if (opps > 0) parts.push(`${opps} Opp${opps>1?'s':''}`);
        const dons = act.donations?.length||0;
        if (dons > 0) parts.push(`${dons} Donation${dons>1?'s':''}`);
        const events = act.events?.length||0;
        if (events > 0) parts.push(`${events} Event${events>1?'s':''}`);
        
        if (parts.length === 0) return '<span style="color:var(--text-muted);font-size:var(--text-xs)">—</span>';
        return `<span style="font-size:var(--text-xs);color:var(--text-secondary)">${parts.join(', ')}</span>`;
      }},
    ],
    onRowClick: id => openUserProfile(id),
  });

  table.render();

  // ─── OPEN FROM URL PARAM ─────────────────────────────────────────────────────
  if (params.open) setTimeout(() => openUserProfile(params.open), 100);

  // ─── BUTTON WIRING ────────────────────────────────────────────────────────────
  document.getElementById('new-user-btn').addEventListener('click', () => openUserForm(null, table));

  document.getElementById('export-users-btn').addEventListener('click', () => {
    Store.downloadCSV('users', 'users-export.csv');
    Toast.success('Users exported to CSV');
  });

  document.getElementById('import-users-btn').addEventListener('click', () => {
    document.getElementById('csv-file-input').click();
  });

  document.getElementById('csv-file-input').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => openCSVImportModal(ev.target.result, table);
    reader.readAsText(file);
    e.target.value = ''; // reset so same file can be re-picked
  });

  // ─── STAT CHIPS RENDERER ─────────────────────────────────────────────────────
  function renderUserStatChips() {
    const all = Store.getAll('users');
    const members  = all.filter(u => (u.types||[]).includes('Member')).length;
    const donors   = all.filter(u => (u.types||[]).includes('Donor')).length;
    const brokers  = all.filter(u => (u.types||[]).includes('Broker')).length;
    const buyers   = all.filter(u => (u.types||[]).includes('Buyer')).length;
    const active   = all.filter(u => u.status === 'Active').length;
    const bar = document.getElementById('user-stats-bar');
    if (!bar) return;
    const chip = (label, val, color) =>
      `<div style="display:flex;align-items:center;gap:6px;background:var(--bg-elevated);border:var(--border-subtle);border-radius:var(--radius-md);padding:6px 14px;font-size:var(--text-xs);">
        <span style="width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0"></span>
        <span style="color:var(--text-muted)">${label}</span>
        <span style="font-weight:var(--fw-semibold);color:var(--text-primary)">${val}</span>
      </div>`;
    bar.innerHTML =
      chip('Total', all.length, 'var(--text-accent)') +
      chip('Active', active, 'var(--status-green)') +
      chip('Members', members, '#6366f1') +
      chip('Donors', donors, '#f59e0b') +
      chip('Brokers', brokers, '#14b8a6)') +
      chip('Buyers', buyers, '#3b82f6');
  }

  // ─── PROFILE DRAWER (7 TABS) ──────────────────────────────────────────────────
  function openUserProfile(id) {
    const record = Store.getById('users', id);
    if (!record) return;
    const formData = { ...record };
    const TABS = ['Profile', 'Auctions', 'Opportunities', 'Tasks', 'Financials', 'Notes', 'Activity'];
    const view = new RecordFullView({ tabs: TABS });

    view.open({
      recordId: record.id,
      title: `${record.firstName} ${record.lastName}`,
      tabs: TABS,
      tabRenderer: (body, tab, editMode) => {
        if      (tab === 'Profile')       renderProfileTab(body, record, formData, editMode);
        else if (tab === 'Auctions')      renderAuctionsTab(body, record);
        else if (tab === 'Opportunities') renderOpportunitiesTab(body, record);
        else if (tab === 'Tasks')         renderTasksTab(body, record);
        else if (tab === 'Financials')    renderFinancialsTab(body, record);
        else if (tab === 'Notes')         renderNotesTab(body, record, 'users');
        else if (tab === 'Activity')      body.innerHTML = renderActivityLog(record.activityLog);
      },
      onSave: () => {
        const result = Store.update('users', id, { ...formData });
        if (result) {
          Toast.success('User saved');
          table.refresh();
          view.updateTitle(`${formData.firstName} ${formData.lastName}`, id);
          Object.assign(record, result);
        }
      },
      onDelete: async () => {
        Store.remove('users', id);
        Toast.success('User deleted');
        table.refresh();
        Router.navigate('users');
      },
      onClose: () => Router.navigate('users'),
    });
  }

  // ── TAB: PROFILE ──────────────────────────────────────────────────────────────
  function renderProfileTab(body, record, formData, editMode) {
    const inp = (id, val, type='text', placeholder='') =>
      editMode
        ? `<input class="input" id="${id}" type="${type}" value="${(val||'').replace(/"/g,'&quot;')}" placeholder="${placeholder}">`
        : `<div style="font-size:var(--text-sm);color:var(--text-primary)">${val || '<span style="color:var(--text-muted)">—</span>'}</div>`;

    const sel = (id, options, val) =>
      editMode
        ? `<select class="select" id="${id}">${options.map(o => `<option ${val===o?'selected':''}>${o}</option>`).join('')}</select>`
        : StatusBadge.render(val);

    const multiPill = (groupId, options, selected, accent) =>
      editMode
        ? `<div class="checkbox-group" id="${groupId}">
            ${options.map(t => `
              <label class="checkbox-option ${selected.includes(t)?'checked':''}" data-val="${t}">
                <input type="checkbox" value="${t}" ${selected.includes(t)?'checked':''}> ${t}
              </label>`).join('')}
          </div>`
        : `<div style="display:flex;flex-wrap:wrap;gap:5px">
            ${selected.map(t=>`<span class="tag ${accent}">${t}</span>`).join('')||'<span style="color:var(--text-muted)">—</span>'}
          </div>`;

    body.innerHTML = `
      <div class="drawer-section">
        <div class="drawer-section-title">Personal Information</div>
        <div class="form-grid">
          <div class="form-group"><label class="form-label">First Name</label>${inp('u-firstName', record.firstName)}</div>
          <div class="form-group"><label class="form-label">Last Name</label>${inp('u-lastName', record.lastName)}</div>
          <div class="form-group"><label class="form-label">Email</label>
            ${editMode ? `<input class="input" id="u-email" type="email" value="${(record.email||'').replace(/"/g,'&quot;')}" placeholder="email@example.com">`
              : (record.email ? `<a href="mailto:${record.email}" style="color:var(--text-accent);font-size:var(--text-sm)">${record.email}</a>` : '<span style="color:var(--text-muted)">—</span>')}
          </div>
          <div class="form-group"><label class="form-label">Phone</label>${inp('u-phone', record.phone)}</div>
          <div class="form-group"><label class="form-label">City</label>${inp('u-city', record.city)}</div>
          <div class="form-group"><label class="form-label">State</label>${inp('u-state', record.state)}</div>
          <div class="form-group form-full"><label class="form-label">Company / Club / Brokerage</label>${inp('u-company', record.company)}</div>
          <div class="form-group form-full"><label class="form-label">Address</label>${inp('u-address', record.address)}</div>
        </div>
      </div>

      <div class="drawer-section">
        <div class="drawer-section-title">Roles & Types</div>
        <div class="form-group form-full">
          <label class="form-label">User Types (multi-select)</label>
          ${multiPill('u-types-group', Store.USER_TYPES, formData.types || [], 'tag-accent')}
        </div>
      </div>

      <div class="drawer-section">
        <div class="drawer-section-title">Tags & Segmentation</div>
        <div class="form-group form-full">
          <label class="form-label">Tags</label>
          ${multiPill('u-tags-group', Store.TAG_OPTIONS, formData.tags || [], '')}
        </div>
      </div>

      <div class="drawer-section">
        <div class="drawer-section-title">Status & Record Info</div>
        <div class="form-grid">
          <div class="form-group"><label class="form-label">Status</label>${sel('u-status', Store.STATUS.users, record.status)}</div>
          <div class="form-group"><label class="form-label">User ID</label><div style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--text-muted)">${record.id}</div></div>
          <div class="form-group"><label class="form-label">Created</label><div style="font-size:var(--text-xs);color:var(--text-muted)">${Store.formatDateTime(record.createdAt)}</div></div>
          <div class="form-group"><label class="form-label">Last Updated</label><div style="font-size:var(--text-xs);color:var(--text-muted)">${Store.formatDateTime(record.updatedAt)}</div></div>
        </div>
      </div>

      <div class="drawer-section">
        <div class="drawer-section-title">Notes</div>
        ${editMode
          ? `<textarea class="input" id="u-notes" rows="4" style="width:100%;resize:vertical;min-height:80px" placeholder="Internal notes...">${record.notes || ''}</textarea>`
          : `<div style="font-size:var(--text-sm);color:var(--text-secondary);white-space:pre-wrap">${record.notes || '<span style="color:var(--text-muted)">No notes yet</span>'}</div>`}
      </div>
    `;

    if (editMode) {
      // Wire simple text inputs
      ['firstName','lastName','email','phone','city','state','company','address'].forEach(field => {
        const el = body.querySelector(`#u-${field}`);
        if (el) el.addEventListener('input', () => formData[field] = el.value);
      });
      // Status select
      const statusEl = body.querySelector('#u-status');
      if (statusEl) statusEl.addEventListener('change', () => formData.status = statusEl.value);
      // Notes textarea
      const notesEl = body.querySelector('#u-notes');
      if (notesEl) notesEl.addEventListener('input', () => formData.notes = notesEl.value);
      // Types multi-check
      wireCheckboxGroup(body, '#u-types-group', formData, 'types');
      // Tags multi-check
      wireCheckboxGroup(body, '#u-tags-group', formData, 'tags');
    }
  }

  // ── TAB: AUCTIONS ─────────────────────────────────────────────────────────────
  function renderAuctionsTab(body, record) {
    const activity = Store.getUserActivity(record.id);
    body.innerHTML = `
      <div class="drawer-section">
        <div class="drawer-section-title">
          Auctions Donated
          <span style="color:var(--text-muted);font-weight:normal;font-size:var(--text-xs)">(${activity.auctionsDonated.length})</span>
        </div>
        ${renderLinkedList(activity.auctionsDonated, 'auctions', 'title',
          row => `donated · ${row.players || '?'} players · ${formatCurrency(row.reservePrice)} reserve`)}
      </div>
      <div class="drawer-section">
        <div class="drawer-section-title">
          Auctions Bought
          <span style="color:var(--text-muted);font-weight:normal;font-size:var(--text-xs)">(${activity.auctionsBought.length})</span>
        </div>
        ${renderLinkedList(activity.auctionsBought, 'auctions', 'title',
          row => `bought · ${formatCurrency(row.finalPrice)} final price`)}
      </div>
    `;
  }

  // ── TAB: OPPORTUNITIES ────────────────────────────────────────────────────────
  function renderOpportunitiesTab(body, record) {
    const activity = Store.getUserActivity(record.id);
    body.innerHTML = `
      <div class="drawer-section">
        <div class="drawer-section-title">
          Opportunities Donated
          <span style="color:var(--text-muted);font-weight:normal;font-size:var(--text-xs)">(${activity.opportunitiesDonated.length})</span>
        </div>
        ${renderLinkedList(activity.opportunitiesDonated, 'opportunities', 'title',
          row => `donated · value ${formatCurrency(row.value)}`)}
      </div>
      <div class="drawer-section">
        <div class="drawer-section-title">
          Opportunities Participated In
          <span style="color:var(--text-muted);font-weight:normal;font-size:var(--text-xs)">(${activity.opportunitiesJoined.length})</span>
        </div>
        ${renderLinkedList(activity.opportunitiesJoined, 'opportunities', 'title',
          row => `${row.status} · value ${formatCurrency(row.value)}`)}
      </div>
    `;
  }

  // ── TAB: TASKS ────────────────────────────────────────────────────────────────
  function renderTasksTab(body, record) {
    const activity = Store.getUserActivity(record.id);
    const all = activity.tasks;
    const open = all.filter(t => t.status === 'Open' || t.status === 'In Progress');
    const done = all.filter(t => t.status !== 'Open' && t.status !== 'In Progress');
    body.innerHTML = `
      <div class="drawer-section">
        <div class="drawer-section-title">
          Open Tasks
          <span style="color:var(--text-muted);font-weight:normal;font-size:var(--text-xs)">(${open.length})</span>
        </div>
        ${renderLinkedList(open, 'tasks', 'title',
          row => `${row.status} · Due ${Store.formatDate(row.dueDate)}`)}
      </div>
      <div class="drawer-section">
        <div class="drawer-section-title">
          Completed / Cancelled
          <span style="color:var(--text-muted);font-weight:normal;font-size:var(--text-xs)">(${done.length})</span>
        </div>
        ${renderLinkedList(done, 'tasks', 'title',
          row => `${row.status} · Due ${Store.formatDate(row.dueDate)}`)}
      </div>
    `;
  }

  // ── TAB: FINANCIALS ───────────────────────────────────────────────────────────
  function renderFinancialsTab(body, record) {
    const fin = Store.getUserFinancialSummary(record.id);
    body.innerHTML = `
      <!-- Summary Cards -->
      <div class="drawer-section">
        <div class="drawer-section-title">Financial Summary</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4);margin-bottom:var(--space-4)">
          <div style="background:var(--bg-elevated);border:var(--border-subtle);border-radius:var(--radius-lg);padding:var(--space-5);text-align:center">
            <div style="font-size:var(--text-xs);color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:var(--space-2)">Total Spent (Buyer)</div>
            <div style="font-size:1.6rem;font-weight:var(--fw-bold);color:var(--status-green)">${formatCurrency(fin.totalSpent)}</div>
            <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:4px">${fin.bought.length} auction${fin.bought.length !== 1 ? 's' : ''}</div>
          </div>
          <div style="background:var(--bg-elevated);border:var(--border-subtle);border-radius:var(--radius-lg);padding:var(--space-5);text-align:center">
            <div style="font-size:var(--text-xs);color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:var(--space-2)">Total Donated</div>
            <div style="font-size:1.6rem;font-weight:var(--fw-bold);color:#f59e0b">${formatCurrency(fin.totalDonated)}</div>
            <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:4px">${fin.donated.length + fin.oppsDonated.length} item${(fin.donated.length + fin.oppsDonated.length) !== 1 ? 's' : ''}</div>
          </div>
        </div>
      </div>

      <!-- Purchased Auctions -->
      <div class="drawer-section">
        <div class="drawer-section-title">Purchases (Auction Wins)</div>
        ${fin.bought.length === 0
          ? `<div style="color:var(--text-muted);font-size:var(--text-sm)">No purchases on record</div>`
          : `<div class="related-records">
              ${fin.bought.map(a => `
                <div class="related-record-row" data-navigate="auctions:${a.id}">
                  <span class="related-record-id">${a.id}</span>
                  <span class="related-record-name">${a.title || a.id}</span>
                  <span style="margin-left:auto;font-weight:var(--fw-semibold);color:var(--status-green)">${formatCurrency(a.finalPrice)}</span>
                  ${StatusBadge.render(a.status)}
                  ${Icons.chevronRight}
                </div>`).join('')}
            </div>`}
      </div>

      <!-- Donations -->
      <div class="drawer-section">
        <div class="drawer-section-title">Donations Given</div>
        ${fin.donated.length === 0 && fin.oppsDonated.length === 0
          ? `<div style="color:var(--text-muted);font-size:var(--text-sm)">No donations on record</div>`
          : `<div class="related-records">
              ${fin.donated.map(d => `
                <div class="related-record-row" data-navigate="donations:${d.id}">
                  <span class="related-record-id">${d.id}</span>
                  <span class="related-record-name">${d.description || d.type || d.id}</span>
                  <span style="margin-left:auto;font-weight:var(--fw-semibold);color:#f59e0b">${formatCurrency(d.value)}</span>
                  ${StatusBadge.render(d.status)}
                  ${Icons.chevronRight}
                </div>`).join('')}
              ${fin.oppsDonated.map(o => `
                <div class="related-record-row" data-navigate="opportunities:${o.id}">
                  <span class="related-record-id">${o.id}</span>
                  <span class="related-record-name">${o.title || o.id}</span>
                  <span style="margin-left:auto;font-weight:var(--fw-semibold);color:#f59e0b">${formatCurrency(o.value)}</span>
                  ${StatusBadge.render(o.status)}
                  ${Icons.chevronRight}
                </div>`).join('')}
            </div>`}
      </div>
    `;
  }

  // ─── HELPERS ──────────────────────────────────────────────────────────────────
  function renderLinkedList(items, tableName, labelField, subFn) {
    if (!items.length) {
      return `<div style="color:var(--text-muted);font-size:var(--text-sm)">None on record</div>`;
    }
    return `<div class="related-records">
      ${items.map(item => `
        <div class="related-record-row" data-navigate="${tableName}:${item.id}">
          <span class="related-record-id">${item.id}</span>
          <span class="related-record-name">${item[labelField] || item.title || item.name || item.id}</span>
          <span style="font-size:var(--text-xs);color:var(--text-muted);margin-left:auto">${subFn ? subFn(item) : ''}</span>
          ${StatusBadge.render(item.status)}
          ${Icons.chevronRight}
        </div>`).join('')}
    </div>`;
  }

  function wireCheckboxGroup(body, selector, formData, field, onChange) {
    body.querySelectorAll(`${selector} .checkbox-option`).forEach(label => {
      label.addEventListener('click', e => {
        e.preventDefault();
        const val = label.dataset.val;
        const cb = label.querySelector('input[type=checkbox]');
        if (label.classList.contains('checked')) {
          label.classList.remove('checked'); cb.checked = false;
          formData[field] = (formData[field] || []).filter(v => v !== val);
        } else {
          label.classList.add('checked'); cb.checked = true;
          formData[field] = [...(formData[field] || []), val];
        }
        if (onChange) onChange();
      });
    });
  }
}

// ─── NOTES TAB (shared) ───────────────────────────────────────────────────────
function renderNotesTab(body, record, tableName) {
  body.innerHTML = `
    <div class="drawer-section">
      <div class="drawer-section-title">Internal Notes</div>
      <div class="notes-area">
        <textarea id="notes-ta" placeholder="Add private notes about this record...">${record.notes || ''}</textarea>
      </div>
      <div style="margin-top:var(--space-3);display:flex;justify-content:flex-end">
        <button class="btn btn-primary btn-sm" id="save-notes-btn">Save Notes</button>
      </div>
    </div>
  `;
  document.getElementById('save-notes-btn').addEventListener('click', () => {
    const newNotes = document.getElementById('notes-ta').value;
    Store.update(tableName, record.id, { notes: newNotes });
    record.notes = newNotes;
    Toast.success('Notes saved');
  });
}

// ─── RELATED SECTION RENDERER (shared across pages) ──────────────────────────
function renderRelatedSection(title, items, tableName, labelField) {
  return `
    <div class="drawer-section">
      <div class="drawer-section-title">${title} <span style="color:var(--text-muted);font-weight:normal;font-size:var(--text-xs)">(${items.length})</span></div>
      ${items.length === 0
        ? `<div style="color:var(--text-muted);font-size:var(--text-sm)">No ${title.toLowerCase()} linked</div>`
        : `<div class="related-records">${items.map(item => `
          <div class="related-record-row" data-navigate="${tableName}:${item.id}">
            <span class="related-record-id">${item.id}</span>
            <span class="related-record-name">${item[labelField] || item.name || item.title || item.id}</span>
            ${item.status ? StatusBadge.render(item.status) : ''}
            ${Icons.chevronRight}
          </div>
        `).join('')}</div>`}
    </div>
  `;
}

// ─── NEW / EDIT USER MODAL ────────────────────────────────────────────────────
function openUserForm(existingId, table) {
  const existing = existingId ? Store.getById('users', existingId) : null;
  const formData = existing ? { ...existing } : { types: [], tags: [], status: 'Active' };
  formData.types = formData.types || [];
  formData.tags  = formData.tags  || [];

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay open';
  overlay.innerHTML = `
    <div class="modal" style="max-width:680px">
      <div class="modal-header">
        <span class="modal-title">${existing ? 'Edit User' : 'New User'}</span>
        <button class="drawer-close" id="modal-close">${Icons.close}</button>
      </div>
      <div class="modal-body" style="max-height:72vh;overflow-y:auto">

        <!-- Duplicate Warning (hidden by default) -->
        <div id="dup-warning" style="display:none;margin-bottom:var(--space-4);background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.3);border-radius:var(--radius-md);padding:var(--space-4)">
          <div style="font-weight:var(--fw-semibold);color:#f59e0b;margin-bottom:6px">⚠ Possible Duplicate Found</div>
          <div id="dup-message" style="font-size:var(--text-sm);color:var(--text-secondary);margin-bottom:var(--space-3)"></div>
          <div style="display:flex;gap:var(--space-2)">
            <button class="btn btn-ghost btn-sm" id="dup-view-btn">View Existing</button>
            <button class="btn btn-primary btn-sm" id="dup-anyway-btn">Create Anyway</button>
            <button class="btn btn-secondary btn-sm" id="dup-cancel-btn">Cancel</button>
          </div>
        </div>

        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">First Name *</label>
            <input class="input" id="mf-firstName" value="${formData.firstName || ''}" placeholder="First name">
          </div>
          <div class="form-group">
            <label class="form-label">Last Name *</label>
            <input class="input" id="mf-lastName" value="${formData.lastName || ''}" placeholder="Last name">
          </div>
          <div class="form-group">
            <label class="form-label">Email</label>
            <input class="input" id="mf-email" type="email" value="${formData.email || ''}" placeholder="email@example.com">
          </div>
          <div class="form-group">
            <label class="form-label">Phone</label>
            <input class="input" id="mf-phone" value="${formData.phone || ''}" placeholder="(000) 000-0000">
          </div>
          <div class="form-group">
            <label class="form-label">City</label>
            <input class="input" id="mf-city" value="${formData.city || ''}" placeholder="City">
          </div>
          <div class="form-group">
            <label class="form-label">State</label>
            <input class="input" id="mf-state" value="${formData.state || ''}" placeholder="CA">
          </div>
          <div class="form-group form-full">
            <label class="form-label">Company / Club / Brokerage</label>
            <input class="input" id="mf-company" value="${formData.company || ''}" placeholder="Company or organization">
          </div>
          <div class="form-group form-full">
            <label class="form-label">User Types</label>
            <div class="checkbox-group" id="mf-types-group">
              ${Store.USER_TYPES.map(t => `
                <label class="checkbox-option ${formData.types.includes(t)?'checked':''}" data-val="${t}">
                  <input type="checkbox" value="${t}" ${formData.types.includes(t)?'checked':''}> ${t}
                </label>`).join('')}
            </div>
          </div>
          <div class="form-group form-full">
            <label class="form-label">Tags</label>
            <div class="checkbox-group" id="mf-tags-group">
              ${Store.TAG_OPTIONS.map(t => `
                <label class="checkbox-option ${formData.tags.includes(t)?'checked':''}" data-val="${t}">
                  <input type="checkbox" value="${t}" ${formData.tags.includes(t)?'checked':''}> ${t}
                </label>`).join('')}
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Status</label>
            <select class="select" id="mf-status">
              ${Store.STATUS.users.map(s => `<option ${formData.status===s?'selected':''}>${s}</option>`).join('')}
            </select>
          </div>
          <div class="form-group form-full">
            <label class="form-label">Notes</label>
            <textarea class="input" id="mf-notes" rows="3" style="resize:vertical" placeholder="Internal notes...">${formData.notes || ''}</textarea>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="modal-cancel">Cancel</button>
        <button class="btn btn-primary" id="modal-submit">${Icons.plus} ${existing ? 'Save Changes' : 'Create User'}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelector('#modal-close').onclick = close;
  overlay.querySelector('#modal-cancel').onclick = close;

  // Wire checkbox groups
  wireModalCheckboxGroup(overlay, '#mf-types-group', formData, 'types');
  wireModalCheckboxGroup(overlay, '#mf-tags-group', formData, 'tags');

  let duplicateFound = null;
  let bypassDup = false;

  overlay.querySelector('#modal-submit').onclick = () => {
    const firstName = overlay.querySelector('#mf-firstName').value.trim();
    const lastName  = overlay.querySelector('#mf-lastName').value.trim();
    const email     = overlay.querySelector('#mf-email').value.trim();
    const phone     = overlay.querySelector('#mf-phone').value.trim();

    if (!firstName || !lastName) { Toast.error('First and last name are required'); return; }

    // Duplicate detection (skip when editing or bypassed)
    if (!existing && !bypassDup) {
      const dup = Store.findDuplicateUser(email, firstName, lastName, phone);
      if (dup) {
        duplicateFound = dup;
        const warning = overlay.querySelector('#dup-warning');
        const msg = overlay.querySelector('#dup-message');
        warning.style.display = 'block';
        const u = dup.match;
        msg.textContent = `Found existing user "${u.firstName} ${u.lastName}" (${u.id}) matched by ${dup.reason}. Review before proceeding.`;
        overlay.querySelector('#dup-view-btn').onclick = () => {
          close();
          Router.navigate(`users?open=${dup.match.id}`);
        };
        overlay.querySelector('#dup-anyway-btn').onclick = () => {
          bypassDup = true;
          warning.style.display = 'none';
          overlay.querySelector('#modal-submit').click();
        };
        overlay.querySelector('#dup-cancel-btn').onclick = () => {
          warning.style.display = 'none';
          bypassDup = false;
        };
        return;
      }
    }

    const data = {
      firstName, lastName, email, phone,
      city:    overlay.querySelector('#mf-city').value.trim(),
      state:   overlay.querySelector('#mf-state').value.trim(),
      company: overlay.querySelector('#mf-company').value.trim(),
      notes:   overlay.querySelector('#mf-notes').value.trim(),
      status:  overlay.querySelector('#mf-status').value,
      types:   formData.types,
      tags:    formData.tags,
    };

    if (existing) {
      Store.update('users', existing.id, data);
      Toast.success('User updated');
    } else {
      const created = Store.create('users', data);
      Toast.success(`User created: ${created.id}`);
    }
    close();
    if (table) table.refresh();
  };

  function wireModalCheckboxGroup(parent, selector, fd, field) {
    parent.querySelectorAll(`${selector} .checkbox-option`).forEach(label => {
      label.addEventListener('click', e => {
        e.preventDefault();
        const val = label.dataset.val;
        const cb = label.querySelector('input');
        if (label.classList.contains('checked')) {
          label.classList.remove('checked'); cb.checked = false;
          fd[field] = (fd[field] || []).filter(v => v !== val);
        } else {
          label.classList.add('checked'); cb.checked = true;
          fd[field] = [...(fd[field] || []), val];
        }
      });
    });
  }
}

// ─── CSV IMPORT MODAL ─────────────────────────────────────────────────────────
function openCSVImportModal(csvText, table) {
  const rows = Store.parseCSV(csvText);
  if (!rows.length) { Toast.error('No data found in CSV file'); return; }

  const headers = Object.keys(rows[0]);
  const CRM_FIELDS = [
    { key: '__skip__',   label: '— Skip —' },
    { key: 'firstName',  label: 'First Name' },
    { key: 'lastName',   label: 'Last Name' },
    { key: 'email',      label: 'Email' },
    { key: 'phone',      label: 'Phone' },
    { key: 'company',    label: 'Company' },
    { key: 'city',       label: 'City' },
    { key: 'state',      label: 'State' },
    { key: 'types',      label: 'User Types (comma-sep)' },
    { key: 'tags',       label: 'Tags (comma-sep)' },
    { key: 'notes',      label: 'Notes' },
  ];

  // Auto-guess column mappings by header name similarity
  const mapping = {};
  headers.forEach(h => {
    const hn = h.toLowerCase().replace(/[\s_]/g,'');
    const match =
      hn === 'firstname'   ? 'firstName' :
      hn === 'lastname'    ? 'lastName' :
      hn === 'first'       ? 'firstName' :
      hn === 'last'        ? 'lastName' :
      hn === 'email'       ? 'email' :
      hn === 'phone'       ? 'phone' :
      hn === 'company'     ? 'company' :
      hn === 'city'        ? 'city' :
      hn === 'state'       ? 'state' :
      hn === 'types'       ? 'types' :
      hn === 'tags'        ? 'tags' :
      hn === 'notes'       ? 'notes' : '__skip__';
    mapping[h] = match;
  });

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay open';
  overlay.innerHTML = `
    <div class="modal" style="max-width:780px">
      <div class="modal-header">
        <span class="modal-title">${Icons.imports} Import Users — CSV</span>
        <button class="drawer-close" id="imp-close">${Icons.close}</button>
      </div>
      <div class="modal-body" style="max-height:72vh;overflow-y:auto">

        <div style="font-size:var(--text-sm);color:var(--text-secondary);margin-bottom:var(--space-4)">
          Found <strong>${rows.length}</strong> rows. Map each column from your file to the correct CRM field, then review the preview below.
        </div>

        <!-- Column Mapping -->
        <div class="drawer-section">
          <div class="drawer-section-title">Column Mapping</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3)" id="mapping-grid">
            ${headers.map(h => `
              <div style="display:flex;align-items:center;gap:var(--space-3)">
                <span style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--text-muted);min-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${h}">${h}</span>
                <span style="color:var(--text-muted)">→</span>
                <select class="select" style="flex:1" data-header="${h}" id="map-${h.replace(/\W/g,'_')}">
                  ${CRM_FIELDS.map(cf => `<option value="${cf.key}" ${mapping[h]===cf.key?'selected':''}>${cf.label}</option>`).join('')}
                </select>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Preview -->
        <div class="drawer-section">
          <div class="drawer-section-title">Preview (first 8 rows)</div>
          <div id="import-preview"></div>
        </div>

        <div id="import-summary" style="font-size:var(--text-sm);color:var(--text-secondary);margin-top:var(--space-3)"></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="imp-cancel">Cancel</button>
        <button class="btn btn-ghost btn-sm" id="imp-preview-btn">Refresh Preview</button>
        <button class="btn btn-primary" id="imp-submit">${Icons.plus} Import</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelector('#imp-close').onclick = close;
  overlay.querySelector('#imp-cancel').onclick = close;

  function getCurrentMapping() {
    const m = {};
    overlay.querySelectorAll('[data-header]').forEach(sel => {
      m[sel.dataset.header] = sel.value;
    });
    return m;
  }

  function buildPreview() {
    const m = getCurrentMapping();
    const preview = rows.slice(0, 8).map(row => {
      const rec = {};
      headers.forEach(h => { if (m[h] && m[h] !== '__skip__') rec[m[h]] = row[h]; });
      return rec;
    });

    let dupeCount = 0;
    const previewEl = overlay.querySelector('#import-preview');
    previewEl.innerHTML = `
      <div class="table-container" style="max-height:220px;overflow-y:auto">
        <table class="crm-table">
          <thead><tr>
            <th style="width:30px"></th>
            <th>First</th><th>Last</th><th>Email</th><th>Phone</th><th>City</th>
          </tr></thead>
          <tbody>
            ${preview.map(rec => {
              const dup = Store.findDuplicateUser(rec.email, rec.firstName, rec.lastName, rec.phone);
              if (dup) dupeCount++;
              return `<tr>
                <td title="${dup ? 'Possible duplicate: '+dup.match.id : 'New record'}" style="font-size:16px">${dup ? '⚠' : '✓'}</td>
                <td>${rec.firstName||'—'}</td><td>${rec.lastName||'—'}</td>
                <td style="font-size:var(--text-xs)">${rec.email||'—'}</td>
                <td style="font-size:var(--text-xs)">${rec.phone||'—'}</td>
                <td style="font-size:var(--text-xs)">${rec.city||'—'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

    // Summary for all rows
    let totalDupes = 0;
    rows.forEach(row => {
      const m2 = getCurrentMapping();
      const rec = {};
      headers.forEach(h => { if (m2[h] && m2[h] !== '__skip__') rec[m2[h]] = row[h]; });
      if (Store.findDuplicateUser(rec.email, rec.firstName, rec.lastName, rec.phone)) totalDupes++;
    });
    overlay.querySelector('#import-summary').innerHTML =
      `<strong>${rows.length}</strong> rows total · <span style="color:var(--status-green)"><strong>${rows.length - totalDupes}</strong> new</span> · <span style="color:#f59e0b"><strong>${totalDupes}</strong> possible duplicate${totalDupes !== 1?'s':''}</span> (will be skipped)`;
  }

  buildPreview();

  overlay.querySelector('#imp-preview-btn').onclick = buildPreview;
  overlay.querySelectorAll('[data-header]').forEach(s => s.addEventListener('change', buildPreview));

  overlay.querySelector('#imp-submit').onclick = () => {
    const m = getCurrentMapping();
    let created = 0, skipped = 0;

    rows.forEach(row => {
      const rec = {};
      headers.forEach(h => {
        if (!m[h] || m[h] === '__skip__') return;
        const val = row[h] || '';
        if (m[h] === 'types' || m[h] === 'tags') {
          rec[m[h]] = val.split(',').map(s => s.trim()).filter(Boolean);
        } else {
          rec[m[h]] = val;
        }
      });

      if (!rec.firstName && !rec.lastName && !rec.email) { skipped++; return; }
      if (Store.findDuplicateUser(rec.email, rec.firstName, rec.lastName, rec.phone)) { skipped++; return; }

      rec.types  = rec.types  || [];
      rec.tags   = rec.tags   || [];
      rec.status = rec.status || 'Active';
      Store.create('users', rec);
      created++;
    });

    close();
    if (table) table.refresh();
    if (created > 0) Toast.success(`Imported ${created} user${created !== 1 ? 's' : ''}${skipped > 0 ? ` (${skipped} skipped)` : ''}`);
    else Toast.info(`No new users imported. ${skipped} duplicate${skipped !== 1?'s':''} skipped.`);
  };
}

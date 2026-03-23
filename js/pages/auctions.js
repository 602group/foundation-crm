/**
 * EPIC Foundation CRM — Auctions Page (Full Rebuild)
 * 9-stage lifecycle, GiveSmart integration, quick actions, CSV import/export.
 */

function renderAuctions(params = {}) {
  const main = document.getElementById('main');

  // Auto-update statuses based on dates before rendering
  Store.refreshAllAuctionStatuses();

  main.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <span class="page-title">Auctions</span>
        <span class="page-subtitle">Full lifecycle — from donation to round completion</span>
      </div>
      <div class="page-header-right">
        <button class="btn btn-ghost btn-sm" id="import-auctions-btn">${Icons.imports} Import CSV</button>
        <button class="btn btn-ghost btn-sm" id="export-auctions-btn">${Icons.download} Export</button>
        <button class="btn btn-primary" id="new-auction-btn">${Icons.plus} New Auction</button>
      </div>
    </div>
    <div class="auctions-view-toggle" id="auctions-view-toggle">
      <button class="avt-btn active" data-mode="all">All Open</button>
      <button class="avt-btn" data-mode="auction">Auction</button>
      <button class="avt-btn" data-mode="rounds">Rounds</button>
    </div>
    <div id="board-filter-bar" style="display:none"></div>
    <div class="page-content" id="auctions-page-content">
      <div id="auctions-table-wrap"></div>
    </div>
    <div id="rounds-board-wrap" style="display:none;overflow-x:auto;padding:0 var(--space-4) var(--space-4) var(--space-4)"></div>
    <input type="file" id="auct-csv-input" accept=".csv,.txt" style="display:none">
  `;

  // Status category groups
  const AUCTION_STATUSES = new Set(['New','Auction Pending','Auction Booked','Auction Live','Auction Closed']);
  const ROUND_STATUSES   = new Set(['Waiting to reach out', 'Wait on buyer', 'Waiting on donor', 'Wait # days to book','Round Scheduled','Round Complete Follow Up','Round Complete']);

  // Default: hide Round Complete records; viewMode controls which category to show
  let showComplete = false;
  let viewMode = params.mode || 'all'; // 'all' | 'auction' | 'rounds' — restored from URL

  // Wire the view mode toggle
  document.getElementById('auctions-view-toggle')?.querySelectorAll('.avt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      viewMode = btn.dataset.mode;
      document.querySelectorAll('.avt-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === viewMode));
      if (viewMode === 'rounds') {
        document.getElementById('auctions-page-content').style.display = 'none';
        document.getElementById('board-filter-bar').style.display = 'block';
        document.getElementById('rounds-board-wrap').style.display = 'block';
        renderBoardFilters();
        renderRoundsBoard();
      } else {
        document.getElementById('auctions-page-content').style.display = '';
        document.getElementById('board-filter-bar').style.display = 'none';
        document.getElementById('rounds-board-wrap').style.display = 'none';
        table.refresh();
      }
    });
  });

  const table = new CRMTable({
    containerId: 'auctions-table-wrap',
    tableName: 'auctions',
    searchFields: ['id', 'title', 'shortName', 'itemNumber'],
    filterDefs: [
      { field: 'status',           label: 'All Statuses',    options: Store.STATUS.auctions },
      { field: 'type',             label: 'All Types',       options: Store.AUCTION_TYPES },
      { field: 'roundType',        label: 'All Round Types', options: Store.ROUND_TYPES },
      { field: 'schedulingStatus', label: 'Scheduling',      options: Store.SCHEDULING_STATUS },
    ],
    preFilter: items => {
      let filtered = showComplete ? items : items.filter(a => a.status !== 'Round Complete');
      if (viewMode === 'auction') filtered = filtered.filter(a => AUCTION_STATUSES.has(a.status));
      if (viewMode === 'rounds')  filtered = filtered.filter(a => ROUND_STATUSES.has(a.status));
      return filtered;
    },
    defaultSort: 'createdAt',
    defaultSortDir: 'desc',
    columns: [
      { field: 'shortName',  label: 'Name',      sortable: true, render: row =>
        `<span style="font-weight:var(--fw-medium)">${row.shortName || row.title || '—'}</span>` },
      { field: 'status',     label: 'Status',     sortable: true, isStatus: true },
      { field: 'type',       label: 'Type',      sortable: true, render: row =>
        row.type ? `<span class="tag">${row.type}</span>` : '<span style="color:var(--text-muted)">—</span>' },
      { field: 'courseId',   label: 'Course',    sortable: true,
        sortFn: (a, b, dir) => {
          const ca = a.courseId ? (Store.getById('courses', a.courseId)?.name || '') : '';
          const cb = b.courseId ? (Store.getById('courses', b.courseId)?.name || '') : '';
          return dir === 'asc' ? ca.localeCompare(cb) : cb.localeCompare(ca);
        },
        render: row => {
          const c = row.courseId ? Store.getById('courses', row.courseId) : null;
          return c ? `<span style="color:var(--text-secondary)">${c.name}</span>` : '<span style="color:var(--text-muted)">—</span>';
        }},
      { field: 'donorId',    label: 'Donor',     sortable: true,
        sortFn: (a, b, dir) => {
          const ua = a.donorId ? Store.getById('users', a.donorId) : null;
          const ub = b.donorId ? Store.getById('users', b.donorId) : null;
          const na = ua ? `${ua.firstName} ${ua.lastName}` : '';
          const nb = ub ? `${ub.firstName} ${ub.lastName}` : '';
          return dir === 'asc' ? na.localeCompare(nb) : nb.localeCompare(na);
        },
        render: row => {
          const u = row.donorId ? Store.getById('users', row.donorId) : null;
          return u ? `${u.firstName} ${u.lastName}` : '<span style="color:var(--text-muted)">—</span>';
        }},
      { field: 'buyerId',    label: 'Buyer',     sortable: true,
        sortFn: (a, b, dir) => {
          const ua = a.buyerId ? Store.getById('users', a.buyerId) : null;
          const ub = b.buyerId ? Store.getById('users', b.buyerId) : null;
          const na = ua ? `${ua.firstName} ${ua.lastName}` : '';
          const nb = ub ? `${ub.firstName} ${ub.lastName}` : '';
          return dir === 'asc' ? na.localeCompare(nb) : nb.localeCompare(na);
        },
        render: row => {
          const u = row.buyerId ? Store.getById('users', row.buyerId) : null;
          return u ? `<span style="color:var(--text-accent)">${u.firstName} ${u.lastName}</span>` : '<span style="color:var(--text-muted)">—</span>';
        }},
      { field: 'launchDate', label: 'Date Open',  sortable: true, render: row =>
        `<span style="font-size:var(--text-xs);color:var(--text-muted)">${row.launchDate || '—'}</span>` },
      { field: 'endDate',    label: 'Date Close', sortable: true, render: row =>
        `<span style="font-size:var(--text-xs);color:var(--text-muted)">${row.endDate || '—'}</span>` },
      { field: 'schedulingStatus', label: 'Scheduling', sortable: true, render: row =>
        row.schedulingStatus ? StatusBadge.render(row.schedulingStatus) : '<span style="color:var(--text-muted)">—</span>' },
    ],
    onRowClick: id => openAuctionDrawer(id),
    footerExtra: () => `<button class="btn btn-ghost btn-sm" id="toggle-complete-btn" style="font-size:var(--text-xs)">${showComplete ? 'Hide' : 'Show'} Completed</button>`,
  });

  table.render();

  // Wire the toggle-complete button (rendered in table footer)
  const _wireToggle = () => {
    const btn = document.getElementById('toggle-complete-btn');
    if (btn) btn.addEventListener('click', () => { showComplete = !showComplete; table.refresh(); setTimeout(_wireToggle, 50); });
  };
  setTimeout(_wireToggle, 50);

  // Restore board view if navigated back from a record that was opened in Rounds mode
  if (viewMode === 'rounds') {
    setTimeout(() => {
      document.getElementById('auctions-page-content').style.display = 'none';
      document.getElementById('board-filter-bar').style.display = 'block';
      document.getElementById('rounds-board-wrap').style.display = 'block';
      document.querySelectorAll('.avt-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === 'rounds'));
      renderBoardFilters();
      renderRoundsBoard();
    }, 0);
  }

  if (params.open) setTimeout(() => openAuctionDrawer(params.open), 100);

  document.getElementById('new-auction-btn').addEventListener('click', () => openAuctionForm(null, table));
  document.getElementById('export-auctions-btn').addEventListener('click', () => {
    Store.downloadCSV('auctions', 'auctions-export.csv');
    Toast.success('Auctions exported to CSV');
  });
  document.getElementById('import-auctions-btn').addEventListener('click', () => {
    document.getElementById('auct-csv-input').click();
  });
  document.getElementById('auct-csv-input').addEventListener('change', e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => openAuctionImportModal(ev.target.result, table);
    reader.readAsText(file);
    e.target.value = '';
  });

  // ─── AUCTION FULL VIEW ────────────────────────────────────────────────────────
  function openAuctionDrawer(id) {
    let record = Store.getById('auctions', id);
    if (!record) return;
    let formData = { ...record };
    const linkedFields = {};
    const TABS = ['Details', 'Scheduling', 'GiveSmart', 'Tasks', 'Linked', 'Financials', 'Notes', 'Activity'];
    const view = new RecordFullView({ tabs: TABS });

    view.open({
      recordId: record.id,
      title: record.shortName || record.title,
      tabs: TABS,
      tabRenderer: (body, tab, editMode) => {
        record = Store.getById('auctions', id) || record;
        if      (tab === 'Details')    renderDetailsTab(body, record, formData, editMode, linkedFields);
        else if (tab === 'Scheduling') renderSchedulingTab(body, record, formData, editMode);
        else if (tab === 'GiveSmart')  renderGiveSmartTab(body, record, formData, editMode);
        else if (tab === 'Tasks')      renderAuctionTasksTab(body, record, id, table, view);
        else if (tab === 'Linked')     renderLinkedTab(body, record);
        else if (tab === 'Financials') window.renderLinkedFinancials(body, record, 'linkedAuctionId', record.id, record.shortName||record.id);
        else if (tab === 'Notes')      renderNotesTab(body, record, 'auctions');
        else if (tab === 'Activity')   body.innerHTML = renderActivityLog(record.activityLog);
      },
      quickBarRenderer: (bar) => injectQuickActions(id, record, table, view, () => {}, bar),
      onSave: () => {
        const updates = { ...formData };
        if (linkedFields.courseId !== undefined) updates.courseId = linkedFields.courseId;
        if (linkedFields.donorId  !== undefined) updates.donorId  = linkedFields.donorId;
        if (linkedFields.buyerId  !== undefined) updates.buyerId  = linkedFields.buyerId;
        const computed = Store.computeAuctionStatus({ ...record, ...updates });
        if (computed && !updates._manualStatus) updates.status = computed;
        const result = Store.update('auctions', id, updates);
        if (result) {
          Toast.success('Auction saved');
          table.refresh();
          view.updateTitle(updates.shortName || updates.title || 'Auction', id);
          Object.assign(record, result);
        }
      },
      onDelete: () => {
        Store.remove('auctions', id);
        Toast.success('Auction deleted');
        table.refresh();
        Router.navigate('auctions');
      },
      onClose: () => Router.navigate(viewMode === 'rounds' ? 'auctions?mode=rounds' : 'auctions'),
    });
  }

  // ─── TAB: DETAILS ─────────────────────────────────────────────────────────────
  function renderDetailsTab(body, record, formData, editMode, linkedFields) {
    const v = (field, fallback = '—') => record[field] || fallback;
    const inp = (id, val, type = 'text', placeholder = '') =>
      editMode
        ? `<input class="input" id="${id}" type="${type}" value="${String(val||'').replace(/"/g,'&quot;')}" placeholder="${placeholder}">`
        : `<div style="font-size:var(--text-sm);color:var(--text-primary)">${val || '<span style="color:var(--text-muted)">—</span>'}</div>`;
    const sel = (id, opts, val) =>
      editMode
        ? `<select class="select" id="${id}">${opts.map(o=>`<option ${val===o?'selected':''}>${o}</option>`).join('')}</select>`
        : `<div style="font-size:var(--text-sm);color:var(--text-primary)">${val || '—'}</div>`;

    body.innerHTML = `
      <div class="drawer-section">
        <div class="drawer-section-title">Auction Item</div>
        <div class="form-grid">
          <div class="form-group"><label class="form-label">Item Number</label>${inp('ad-itemNumber', record.itemNumber, 'text', 'GS-001')}</div>
          <div class="form-group"><label class="form-label">Type</label>${sel('ad-type', Store.AUCTION_TYPES, record.type)}</div>
          <div class="form-group form-full"><label class="form-label">Short Name</label>${inp('ad-shortName', record.shortName, 'text', 'Short display name')}</div>
          <div class="form-group form-full"><label class="form-label">Full Title</label>${inp('ad-title', record.title, 'text', 'Full auction title')}</div>
          <div class="form-group form-full"><label class="form-label">Description</label>
            ${editMode
              ? `<textarea class="input" id="ad-description" rows="4" style="resize:vertical;width:100%">${record.description||''}</textarea>`
              : `<div style="font-size:var(--text-sm);color:var(--text-secondary);white-space:pre-wrap">${record.description||'<span style="color:var(--text-muted)">—</span>'}</div>`}
          </div>
          <div class="form-group"><label class="form-label">Visibility</label>${sel('ad-visibility', Store.AUCTION_VISIBILITY, record.visibility)}</div>
          <div class="form-group"><label class="form-label">Quantity</label>${inp('ad-quantity', record.quantity, 'number', '1')}</div>
        </div>
      </div>

      <div class="drawer-section">
        <div class="drawer-section-title">Pricing</div>
        <div class="form-grid">
          <div class="form-group"><label class="form-label">FMV ($)</label>${inp('ad-fmv', record.fmv, 'number', '0')}</div>
          <div class="form-group"><label class="form-label">Starting Bid ($)</label>${inp('ad-reservePrice', record.reservePrice, 'number', '0')}</div>
          <div class="form-group"><label class="form-label">Sell Price ($)</label>${inp('ad-sellPrice', record.sellPrice, 'number', '0')}</div>
          <div class="form-group"><label class="form-label">Buy Now Price ($)</label>${inp('ad-buyNowPrice', record.buyNowPrice, 'number', '0')}</div>
        </div>
      </div>

      <div class="drawer-section">
        <div class="drawer-section-title">Location</div>
        <div class="form-grid">
          <div class="form-group"><label class="form-label">City</label>${inp('ad-city', record.city)}</div>
          <div class="form-group"><label class="form-label">State / Country</label>${inp('ad-state', record.state)}</div>
        </div>
      </div>

      <div class="drawer-section">
        <div class="drawer-section-title">Linked People & Course</div>
        <div class="form-grid">
          <div class="form-group"><label class="form-label">Course / Club</label>
            ${editMode ? `<div id="lf-course-wrap"></div>` : renderLinkedCourseChip(record.courseId)}
          </div>
          <div class="form-group"><label class="form-label">Donated By</label>
            ${editMode ? `<div id="lf-donor-wrap"></div>` : renderLinkedUserChip(record.donorId, 'Donor')}
          </div>
          <div class="form-group"><label class="form-label">Buyer</label>
            ${editMode ? `<div id="lf-buyer-wrap"></div>` : renderLinkedUserChip(record.buyerId, 'Buyer')}
          </div>
          <div class="form-group"><label class="form-label">Status</label>
            ${editMode
              ? `<select class="select" id="ad-status">${Store.STATUS.auctions.map(s=>`<option ${record.status===s?'selected':''}>${s}</option>`).join('')}</select>`
              : StatusBadge.render(record.status)}
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
      ['itemNumber','type','shortName','title','description','visibility','quantity','fmv','reservePrice','sellPrice','buyNowPrice','city','state'].forEach(f => {
        const el = body.querySelector(`#ad-${f}`);
        if (!el) return;
        const evt = el.tagName === 'SELECT' ? 'change' : 'input';
        el.addEventListener(evt, () => {
          formData[f] = (el.type === 'number') ? (parseFloat(el.value) || null) : el.value;
        });
      });
      const statusEl = body.querySelector('#ad-status');
      if (statusEl) statusEl.addEventListener('change', () => { formData.status = statusEl.value; formData._manualStatus = true; });

      const cw = body.querySelector('#lf-course-wrap');
      if (cw) { cw.id='lf-course'; createLinkedField({ container:cw, tableName:'courses', searchFields:['name','location'], displayFn:r=>r.name, onSelect:id=>linkedFields.courseId=id, value:record.courseId, placeholder:'Search courses...' }); }
      const dw = body.querySelector('#lf-donor-wrap');
      if (dw) { dw.id='lf-donor'; createLinkedField({ container:dw, tableName:'users', searchFields:['firstName','lastName','email'], displayFn:r=>`${r.firstName} ${r.lastName}`, onSelect:id=>linkedFields.donorId=id, value:record.donorId, placeholder:'Search users...' }); }
      const bw = body.querySelector('#lf-buyer-wrap');
      if (bw) { bw.id='lf-buyer'; createLinkedField({ container:bw, tableName:'users', searchFields:['firstName','lastName','email'], displayFn:r=>`${r.firstName} ${r.lastName}`, onSelect:id=>linkedFields.buyerId=id, value:record.buyerId, placeholder:'Search users...' }); }
    }
  }

  // ─── TAB: SCHEDULING ──────────────────────────────────────────────────────────
  function renderSchedulingTab(body, record, formData, editMode) {
    const inp = (id, val, type='text') =>
      editMode
        ? `<input class="input" id="${id}" type="${type}" value="${val||''}">`
        : `<div style="font-size:var(--text-sm);color:var(--text-primary)">${val || '<span style="color:var(--text-muted)">—</span>'}</div>`;

    body.innerHTML = `
      <div class="drawer-section">
        <div class="drawer-section-title">Round Details</div>
        <div class="form-grid">
          <div class="form-group"><label class="form-label">Round Type</label>
            ${editMode
              ? `<select class="select" id="as-roundType">${Store.ROUND_TYPES.map(r=>`<option ${record.roundType===r?'selected':''}>${r}</option>`).join('')}</select>`
              : `<div style="font-size:var(--text-sm)">${record.roundType||'—'}</div>`}
          </div>
          <div class="form-group"><label class="form-label">Players</label>${inp('as-players', record.players, 'number')}</div>
          <div class="form-group"><label class="form-label">Requested Play Date</label>${inp('as-requestedPlayDate', record.requestedPlayDate, 'date')}</div>
          <div class="form-group"><label class="form-label">Confirmed Play Date</label>${inp('as-confirmedPlayDate', record.confirmedPlayDate, 'date')}</div>
          <div class="form-group form-full"><label class="form-label">Scheduling Status</label>
            ${editMode
              ? `<select class="select" id="as-schedulingStatus">${Store.SCHEDULING_STATUS.map(s=>`<option ${record.schedulingStatus===s?'selected':''}>${s}</option>`).join('')}</select>`
              : `<span class="tag">${record.schedulingStatus||'—'}</span>`}
          </div>
        </div>
      </div>

      <div class="drawer-section">
        <div class="drawer-section-title">Computed Status</div>
        <div style="display:flex;align-items:center;gap:var(--space-3)">
          ${StatusBadge.render(record.status)}
          <span style="font-size:var(--text-xs);color:var(--text-muted)">Auto-updated based on dates and linked fields</span>
        </div>
        ${record.launchDate ? `<div style="margin-top:var(--space-3);font-size:var(--text-xs);color:var(--text-muted)">Launch: ${Store.formatDate(record.launchDate)} · End: ${Store.formatDate(record.endDate)} · Confirmed: ${Store.formatDate(record.confirmedPlayDate)}</div>` : ''}
      </div>
    `;

    if (editMode) {
      ['roundType','schedulingStatus'].forEach(f => {
        const el = body.querySelector(`#as-${f}`);
        if (el) el.addEventListener('change', () => formData[f] = el.value);
      });
      ['players'].forEach(f => {
        const el = body.querySelector(`#as-${f}`);
        if (el) el.addEventListener('input', () => formData[f] = parseInt(el.value)||null);
      });
      ['requestedPlayDate','confirmedPlayDate'].forEach(f => {
        const el = body.querySelector(`#as-${f}`);
        if (el) el.addEventListener('change', () => formData[f] = el.value);
      });
    }
  }

  // ─── TAB: GIVESMART ───────────────────────────────────────────────────────────
  function renderGiveSmartTab(body, record, formData, editMode) {
    const inp = (id, val, placeholder='') =>
      editMode
        ? `<input class="input" id="${id}" value="${String(val||'').replace(/"/g,'&quot;')}" placeholder="${placeholder}">`
        : `<div style="font-size:var(--text-sm);color:var(--text-primary)">${val || '<span style="color:var(--text-muted)">—</span>'}</div>`;

    body.innerHTML = `
      <div class="drawer-section">
        <div class="drawer-section-title">GiveSmart Auction Platform</div>
        <div style="background:rgba(34,197,94,0.05);border:1px solid rgba(34,197,94,0.15);border-radius:var(--radius-md);padding:var(--space-4);margin-bottom:var(--space-4);font-size:var(--text-sm);color:var(--text-secondary)">
          Bidding is managed externally via GiveSmart. Store the URL below and use "Bid Now" to send buyers directly to the live auction.
        </div>
        <div class="form-grid">
          <div class="form-group form-full"><label class="form-label">GiveSmart URL</label>${inp('gs-givesmartUrl', record.givesmartUrl, 'https://givesmart.com/...')}</div>
          <div class="form-group"><label class="form-label">Event Code</label>${inp('gs-eventCode', record.eventCode, 'EPIC-S25')}</div>
          <div class="form-group"><label class="form-label">Item Token</label>${inp('gs-itemToken', record.itemToken, 'GS001')}</div>
          <div class="form-group"><label class="form-label">Launch Date</label>
            ${editMode ? `<input class="input" id="gs-launchDate" type="date" value="${record.launchDate||''}">` : `<div style="font-size:var(--text-sm)">${Store.formatDate(record.launchDate)}</div>`}
          </div>
          <div class="form-group"><label class="form-label">End Date</label>
            ${editMode ? `<input class="input" id="gs-endDate" type="date" value="${record.endDate||''}">` : `<div style="font-size:var(--text-sm)">${Store.formatDate(record.endDate)}</div>`}
          </div>
        </div>
      </div>

      ${record.givesmartUrl ? `
        <div class="drawer-section">
          <div class="drawer-section-title">Bidder Actions</div>
          <div style="display:flex;gap:var(--space-3);flex-wrap:wrap">
            <a href="${record.givesmartUrl}" target="_blank" rel="noopener" class="btn btn-primary">
              ${Icons.link} Bid Now →
            </a>
            <button class="btn btn-ghost btn-sm" onclick="navigator.clipboard.writeText('${record.givesmartUrl}');Toast.success('URL copied')">
              Copy URL
            </button>
          </div>
        </div>
      ` : `
        <div class="drawer-section">
          <div style="color:var(--text-muted);font-size:var(--text-sm)">No GiveSmart URL set yet. Edit this record to add the auction link.</div>
        </div>
      `}
    `;

    if (editMode) {
      ['givesmartUrl','eventCode','itemToken'].forEach(f => {
        const el = body.querySelector(`#gs-${f}`);
        if (el) el.addEventListener('input', () => formData[f] = el.value);
      });
      ['launchDate','endDate'].forEach(f => {
        const el = body.querySelector(`#gs-${f}`);
        if (el) el.addEventListener('change', () => formData[f] = el.value);
      });
    }
  }

  // ─── TAB: TASKS ───────────────────────────────────────────────────────────────
  function renderAuctionTasksTab(body, record, auctionId, tbl, drawer) {
    const tasks = Store.getLinked('tasks', 'auctionId', auctionId);
    const open   = tasks.filter(t => t.status === 'Open' || t.status === 'In Progress');
    const closed = tasks.filter(t => t.status !== 'Open' && t.status !== 'In Progress');

    body.innerHTML = `
      <div class="drawer-section">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3)">
          <div class="drawer-section-title" style="margin-bottom:0">Open Tasks <span style="color:var(--text-muted);font-weight:normal;font-size:var(--text-xs)">(${open.length})</span></div>
          <button class="btn btn-primary btn-sm" id="create-task-btn-tab">${Icons.plus} Create Task</button>
        </div>
        ${open.length === 0
          ? `<div style="color:var(--text-muted);font-size:var(--text-sm)">No open tasks</div>`
          : `<div class="related-records">${open.map(t=>`
              <div class="related-record-row" data-navigate="tasks:${t.id}">
                <span class="related-record-id">${t.id}</span>
                <span class="related-record-name">${t.title}</span>
                <span style="font-size:var(--text-xs);color:var(--text-muted);margin-left:auto">Due ${Store.formatDate(t.dueDate)}</span>
                ${StatusBadge.render(t.status)}${Icons.chevronRight}
              </div>`).join('')}</div>`}
      </div>
      <div class="drawer-section">
        <div class="drawer-section-title">Completed / Cancelled <span style="color:var(--text-muted);font-weight:normal;font-size:var(--text-xs)">(${closed.length})</span></div>
        ${closed.length === 0
          ? `<div style="color:var(--text-muted);font-size:var(--text-sm)">None</div>`
          : `<div class="related-records">${closed.map(t=>`
              <div class="related-record-row" data-navigate="tasks:${t.id}">
                <span class="related-record-id">${t.id}</span>
                <span class="related-record-name">${t.title}</span>
                ${StatusBadge.render(t.status)}${Icons.chevronRight}
              </div>`).join('')}</div>`}
      </div>
    `;

    body.querySelector('#create-task-btn-tab')?.addEventListener('click', () => {
      openQuickTaskModal(auctionId, null, () => {
        tbl.refresh();
        // Re-render this tab
        renderAuctionTasksTab(body, record, auctionId, tbl, drawer);
      });
    });
  }

  // ─── TAB: LINKED ──────────────────────────────────────────────────────────────
  function renderLinkedTab(body, record) {
    const course = record.courseId ? [Store.getById('courses', record.courseId)].filter(Boolean) : [];
    const donor  = record.donorId  ? [Store.getById('users', record.donorId)].filter(Boolean)   : [];
    const buyer  = record.buyerId  ? [Store.getById('users', record.buyerId)].filter(Boolean)   : [];
    const fins   = Store.getLinked('financials', 'auctionId', record.id);
    body.innerHTML = `
      ${renderRelatedSection('Course', course.map(c=>({...c,title:c.name})), 'courses', 'name')}
      ${renderRelatedSection('Donor', donor, 'users', 'lastName')}
      ${renderRelatedSection('Buyer', buyer, 'users', 'lastName')}
      ${renderRelatedSection('Financial Entries', fins, 'financials', 'description')}
    `;
  }

  // ─── ROUNDS KANBAN BOARD ─────────────────────────────────────────────────────

  const BOARD_COLS = [
    { status: 'Waiting to reach out',     color: '#8b5cf6' },
    { status: 'Wait on buyer',            color: '#a855f7' },
    { status: 'Waiting on donor',         color: '#d946ef' },
    { status: 'Wait # days to book',      color: '#ec4899' },
    { status: 'Round Scheduled',          color: '#6366f1' },
    { status: 'Round Complete Follow Up', color: '#f97316' },
    { status: 'Round Complete',           color: '#059669' },
  ];
  const LIFECYCLE = BOARD_COLS.map(c => c.status);

  function renderBoardFilters() {
    const bar = document.getElementById('board-filter-bar');
    if (!bar) return;
    const courses = Store._getTable('courses');
    bar.innerHTML = `
      <div class="board-filter-bar">
        <input type="search" class="input" id="board-search" placeholder="🔍 Search rounds…" style="width:200px;flex-shrink:0">
        <select class="select" id="board-filter-course" style="width:auto;flex-shrink:0">
          <option value="">All Courses</option>
          ${courses.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
        </select>
        <select class="select" id="board-filter-buyer" style="width:auto;flex-shrink:0">
          <option value="">All Buyers</option>
          <option value="__no_buyer">⚠ No Buyer Assigned</option>
        </select>
        <select class="select" id="board-filter-status" style="width:auto;flex-shrink:0">
          <option value="">All Statuses</option>
          ${BOARD_COLS.map(c => `<option value="${c.status}">${c.status}</option>`).join('')}
        </select>
        <button class="btn btn-ghost btn-sm" id="board-reset-btn">Reset</button>
        <label class="board-archive-toggle" style="margin-left:auto;display:flex;align-items:center;gap:6px;cursor:pointer;font-size:var(--text-xs);color:var(--text-muted);user-select:none">
          <input type="checkbox" id="board-show-archived" style="accent-color:var(--accent)">
          Show Completed (Archived)
        </label>
      </div>`;
    ['board-search','board-filter-course','board-filter-buyer','board-filter-status'].forEach(id => {
      const el = bar.querySelector('#' + id);
      if (el) { el.addEventListener('input', renderRoundsBoard); el.addEventListener('change', renderRoundsBoard); }
    });
    bar.querySelector('#board-show-archived')?.addEventListener('change', renderRoundsBoard);
    bar.querySelector('#board-reset-btn')?.addEventListener('click', () => {
      ['board-search','board-filter-course','board-filter-buyer','board-filter-status'].forEach(id => {
        const el = bar.querySelector('#' + id); if (el) el.value = '';
      });
      renderRoundsBoard();
    });
  }

  function renderRoundsBoard() {
    const wrap = document.getElementById('rounds-board-wrap');
    const bar  = document.getElementById('board-filter-bar');
    if (!wrap) return;

    const q       = (bar?.querySelector('#board-search')?.value || '').toLowerCase().trim();
    const course  =  bar?.querySelector('#board-filter-course')?.value || '';
    const buyer   =  bar?.querySelector('#board-filter-buyer')?.value  || '';
    const status  =  bar?.querySelector('#board-filter-status')?.value || '';

    let rows = Store._getTable('auctions');
    if (q)      rows = rows.filter(r => (r.shortName||r.title||r.id||'').toLowerCase().includes(q));
    if (course) rows = rows.filter(r => r.courseId === course);
    if (buyer === '__no_buyer') rows = rows.filter(r => !r.buyerId);
    else if (buyer) rows = rows.filter(r => r.buyerId === buyer);
    if (status) rows = rows.filter(r => r.status === status);

    const showArchived = bar?.querySelector('#board-show-archived')?.checked || false;

    const groups = {};
    BOARD_COLS.forEach(c => { groups[c.status] = []; });
    rows.forEach(r => { if (groups[r.status] !== undefined) groups[r.status].push(r); });
    
    // Clear out Round Complete cards if we aren't showing archived
    if (!showArchived) {
      groups['Round Complete'] = [];
    }

    Object.values(groups).forEach(g => g.sort((a, b) => (a.launchDate||'').localeCompare(b.launchDate||'')));

    // Always render all columns
    const activeCols = BOARD_COLS;

    wrap.innerHTML = `
      <div class="board-stats-bar">
        <span style="font-size:var(--text-xs);color:var(--text-muted)">${rows.length} round${rows.length !== 1 ? 's' : ''}</span>
        ${activeCols.filter(c => c.status !== 'Round Complete' && groups[c.status]?.length > 0).map(c =>
          `<span class="board-stat-chip" style="--chip-color:${c.color}">${c.status.replace('Round Complete Follow Up','Follow Up')}&nbsp;<strong>${groups[c.status].length}</strong></span>`
        ).join('')}
        ${showArchived ? `<span class="board-stat-chip" style="--chip-color:#059669">✓ Archived&nbsp;<strong>${(groups['Round Complete']||[]).length}</strong></span>` : ''}
      </div>
      <div class="rounds-board">
        ${activeCols.map(col => {
          let emptyText = 'Drop a card here';
          if (col.status === 'Round Complete') emptyText = 'Drop here to Complete & Archive';
          return `
          <div class="rounds-col" data-status="${col.status}" data-drop="true">
            <div class="rounds-col-header" style="--col-color:${col.color}">
              <span class="rounds-col-dot" style="background:${col.color}"></span>
              <span class="rounds-col-title">${col.status === 'Round Complete' ? 'Completed' : col.status}</span>
              <span class="rounds-col-count" style="background:${col.color}20;color:${col.color}">${(groups[col.status]||[]).length}</span>
            </div>
            <div class="rounds-col-body">
              ${(groups[col.status]||[]).map(r => buildRoundCard(r, col.status === 'Round Complete')).join('')}
              ${(groups[col.status]||[]).length === 0 ? `<div class="rounds-col-empty">${emptyText}</div>` : ''}
            </div>
          </div>`;
        }).join('')}
      </div>`;

    // Drag on cards
    wrap.querySelectorAll('.rounds-card').forEach(card => {
      card.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', card.dataset.id); card.style.opacity = '0.45'; });
      card.addEventListener('dragend',   () => { card.style.opacity = ''; });
      card.addEventListener('click',     e => { if (!e.target.closest('[data-card-action]')) openAuctionDrawer(card.dataset.id); });
    });

    // Drop on columns
    wrap.querySelectorAll('[data-drop]').forEach(col => {
      col.addEventListener('dragover',  e => { e.preventDefault(); col.classList.add('col-drag-over'); });
      col.addEventListener('dragleave', () => col.classList.remove('col-drag-over'));
      col.addEventListener('drop', async e => {
        e.preventDefault(); col.classList.remove('col-drag-over');
        const id = e.dataTransfer.getData('text/plain');
        const toStatus = col.dataset.status;
        if (!id || !toStatus) return;
        const rec = Store.getById('auctions', id);
        if (!rec || rec.status === toStatus) return;
        const fromIdx = LIFECYCLE.indexOf(rec.status), toIdx = LIFECYCLE.indexOf(toStatus);
        // Round Complete → show notes modal
        if (toStatus === 'Round Complete') {
          const notes = await openRoundCompleteModal(rec);
          if (notes === null) return; // cancelled
          const existing = Store.getById('auctions', id);
          const combined = [existing.notes, notes].filter(Boolean).join('\n\n--- Round Completion Notes ---\n');
          Store.update('auctions', id, { status: 'Round Complete', _manualStatus: true, completionNotes: notes, notes: combined || notes });
          Store.refreshAllAuctionStatuses();
          Store.logAudit('round_completed', 'auctions', id);
          Toast.success('Round marked complete and archived ✓');
          table.refresh(); renderRoundsBoard(); return;
        }
        Store.update('auctions', id, { status: toStatus, _manualStatus: true });
        Store.refreshAllAuctionStatuses();
        Toast.success(`Moved → ${toStatus}`);
        table.refresh(); renderRoundsBoard();
      });
    });

    // Card quick actions
    wrap.querySelectorAll('[data-card-action]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const action = btn.dataset.cardAction;
        const id = btn.closest('.rounds-card').dataset.id;
        if (action === 'open')     { openAuctionDrawer(id); return; }
        if (action === 'buyer')    { openBoardUserPick(id, 'buyerId', 'Assign Buyer'); return; }
        if (action === 'schedule') { openBoardDatePick(id, 'confirmedPlayDate', 'Schedule Round'); return; }
        if (action === 'task')     { openTaskForm(null, id, null, null, () => { table.refresh(); renderRoundsBoard(); }); return; }
        if (action === 'complete') {
          openRoundCompleteModal(Store.getById('auctions', id)).then(notes => {
            if (notes === null) return;
            const existing = Store.getById('auctions', id);
            const combined = [existing.notes, notes].filter(Boolean).join('\n\n--- Round Completion Notes ---\n');
            Store.update('auctions', id, { status: 'Round Complete', _manualStatus: true, completionNotes: notes, notes: combined || notes });
            Store.refreshAllAuctionStatuses();
            Store.logAudit('round_completed', 'auctions', id);
            Toast.success('Round marked complete and archived ✓');
            table.refresh(); renderRoundsBoard();
          });
        }
      });
    });
  }

  function buildRoundCard(r, isArchived = false) {
    const today  = new Date().toISOString().split('T')[0];
    const course = r.courseId ? Store.getById('courses', r.courseId) : null;
    const donor  = r.donorId  ? Store.getById('users',   r.donorId)  : null;
    const buyer  = r.buyerId  ? Store.getById('users',   r.buyerId)  : null;
    const alerts = [];
    if (!r.buyerId)    alerts.push({ t: 'No Buyer',      c: '#f59e0b' });
    if (!r.courseId)   alerts.push({ t: 'No Course',     c: '#ef4444' });
    if (!r.donorId)    alerts.push({ t: 'No Donor',      c: '#f59e0b' });
    if (!r.launchDate) alerts.push({ t: 'No Open Date',  c: '#94a3b8' });
    if (!r.endDate)    alerts.push({ t: 'No Close Date', c: '#94a3b8' });
    if (r.endDate && r.endDate < today && !['Round Complete','Auction Closed'].includes(r.status))
      alerts.push({ t: 'Overdue', c: '#ef4444' });
    const dn = donor  ? `${donor.firstName} ${donor.lastName}`   : null;
    const bn = buyer  ? `${buyer.firstName} ${buyer.lastName}`   : null;
    const cn = course ? course.name : null;
    return `
      <div class="rounds-card" data-id="${r.id}" draggable="true">
        <div class="rounds-card-name">${r.shortName || r.title || r.id}</div>
        <div class="rounds-card-info">
          ${cn ? `<div class="rci-row">🏌️ ${cn}</div>` : `<div class="rci-row rci-warn">No Course</div>`}
          ${dn ? `<div class="rci-row">🎁 ${dn}</div>` : ''}
          ${bn ? `<div class="rci-row rci-buyer">👤 ${bn}</div>` : `<div class="rci-row rci-muted">👤 No buyer</div>`}
          ${r.confirmedPlayDate ? `<div class="rci-row rci-play">⛳ Play: ${r.confirmedPlayDate}</div>` : ''}
          ${(r.launchDate || r.endDate) ? `<div class="rci-row rci-dates">${r.launchDate ? `Open ${r.launchDate}` : ''}${r.launchDate && r.endDate ? ' · ' : ''}${r.endDate ? `Close ${r.endDate}` : ''}</div>` : ''}
        </div>
        ${alerts.length ? `<div class="rounds-card-alerts">${alerts.map(a => `<span class="rc-alert" style="background:${a.c}18;color:${a.c};border-color:${a.c}50">${a.t}</span>`).join('')}</div>` : ''}
        <div class="rounds-card-actions">
          <button class="card-action-btn" data-card-action="open"     title="Open Record">↗</button>
          <button class="card-action-btn" data-card-action="buyer"    title="Assign Buyer">👤</button>
          <button class="card-action-btn" data-card-action="schedule" title="Schedule Round">📅</button>
          <button class="card-action-btn" data-card-action="task"     title="Create Task">✓</button>
          ${r.status === 'Round Complete Follow Up' ? `<button class="card-action-btn card-complete-btn" data-card-action="complete">✓ Complete</button>` : ''}
        </div>
        ${isArchived && r.completionNotes ? `<div class="rounds-card-completion-notes">📝 ${r.completionNotes.slice(0,100)}${r.completionNotes.length > 100 ? '…' : ''}</div>` : ''}
      </div>`;
  }

  function openRoundCompleteModal(rec) {
    return new Promise(resolve => {
      const ov = document.createElement('div');
      ov.className = 'modal-overlay open';
      ov.innerHTML = `
        <div class="modal" style="max-width:520px">
          <div class="modal-header">
            <span class="modal-title">✓ Mark Round Complete</span>
            <button class="drawer-close" id="rcm-x">${Icons.close}</button>
          </div>
          <div class="modal-body">
            <div style="background:rgba(5,150,105,0.06);border:1px solid rgba(5,150,105,0.2);border-radius:var(--radius-md);padding:var(--space-3) var(--space-4);margin-bottom:var(--space-4);font-size:var(--text-sm);color:var(--text-secondary)">
              <strong>${rec?.shortName || rec?.title || 'This round'}</strong> will be archived once saved. Add any notes about how the round went below.
            </div>
            <div class="form-group">
              <label class="form-label">Round Notes <span style="color:var(--text-muted);font-weight:normal">(optional)</span></label>
              <textarea class="input" id="rcm-notes" rows="6" placeholder="How did the round go? Any issues, feedback, who attended, or follow-ups to remember…" style="resize:vertical;width:100%;font-family:var(--font-sans)"></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="rcm-cancel">Cancel</button>
            <button class="btn btn-primary" id="rcm-save" style="background:var(--status-green);border-color:var(--status-green)">✓ Save &amp; Archive</button>
          </div>
        </div>`;
      document.body.appendChild(ov);
      const close = result => { ov.remove(); resolve(result); };
      ov.querySelector('#rcm-x').onclick     = () => close(null);
      ov.querySelector('#rcm-cancel').onclick = () => close(null);
      ov.querySelector('#rcm-save').onclick   = () => close(ov.querySelector('#rcm-notes').value.trim());
      // Focus the textarea
      setTimeout(() => ov.querySelector('#rcm-notes')?.focus(), 100);
    });
  }

  function openBoardUserPick(auctionId, field, title) {
    const ov = document.createElement('div');
    ov.className = 'modal-overlay open';
    ov.innerHTML = `<div class="modal" style="max-width:480px"><div class="modal-header"><span class="modal-title">${title}</span><button class="drawer-close" id="bup-x">${Icons.close}</button></div><div class="modal-body"><div class="form-group"><label class="form-label">Select User</label><div id="bup-w"></div></div></div><div class="modal-footer"><button class="btn btn-secondary" id="bup-no">Cancel</button><button class="btn btn-primary" id="bup-ok">Assign</button></div></div>`;
    document.body.appendChild(ov);
    let sel = null;
    const close = () => ov.remove();
    ov.querySelector('#bup-x').onclick = ov.querySelector('#bup-no').onclick = close;
    createLinkedField({ container: ov.querySelector('#bup-w'), tableName: 'users', searchFields: ['firstName','lastName','email'], displayFn: r => `${r.firstName} ${r.lastName}`, onSelect: id => { sel = id; }, value: null, placeholder: 'Search users…' });
    ov.querySelector('#bup-ok').onclick = () => {
      if (!sel) { Toast.error('Select a user'); return; }
      Store.update('auctions', auctionId, { [field]: sel });
      Store.refreshAllAuctionStatuses();
      Toast.success('Assigned'); close(); table.refresh(); renderRoundsBoard();
    };
  }

  function openBoardDatePick(auctionId, field, title) {
    const ov = document.createElement('div');
    ov.className = 'modal-overlay open';
    ov.innerHTML = `<div class="modal" style="max-width:400px"><div class="modal-header"><span class="modal-title">${title}</span><button class="drawer-close" id="bdp-x">${Icons.close}</button></div><div class="modal-body"><div class="form-group"><label class="form-label">Date</label><input class="input" id="bdp-d" type="date"></div></div><div class="modal-footer"><button class="btn btn-secondary" id="bdp-no">Cancel</button><button class="btn btn-primary" id="bdp-ok">Confirm</button></div></div>`;
    document.body.appendChild(ov);
    const close = () => ov.remove();
    ov.querySelector('#bdp-x').onclick = ov.querySelector('#bdp-no').onclick = close;
    ov.querySelector('#bdp-ok').onclick = () => {
      const d = ov.querySelector('#bdp-d').value;
      if (!d) { Toast.error('Pick a date'); return; }
      Store.update('auctions', auctionId, { [field]: d, schedulingStatus: 'Confirmed' });
      Store.refreshAllAuctionStatuses();
      Toast.success('Round scheduled'); close(); table.refresh(); renderRoundsBoard();
    };
  }

} // end renderAuctions

// ─── QUICK ACTIONS INJECTOR ───────────────────────────────────────────────────
function injectQuickActions(auctionId, record, table, drawer, refreshChips) {
  const drawerEl = document.getElementById('record-drawer');
  if (!drawerEl) return;
  const existing = drawerEl.querySelector('#quick-action-bar');
  if (existing) existing.remove();

  const bar = document.createElement('div');
  bar.id = 'quick-action-bar';
  bar.style.cssText = `display:flex;gap:8px;flex-wrap:wrap;padding:10px 24px;border-bottom:var(--border-subtle);background:var(--bg-elevated);flex-shrink:0`;
  bar.innerHTML = `
    <button class="btn btn-ghost btn-sm" id="qa-add-buyer">${Icons.users} Add Buyer</button>
    <button class="btn btn-ghost btn-sm" id="qa-schedule">${Icons.events} Schedule Round</button>
    <button class="btn btn-ghost btn-sm" id="qa-create-task">${Icons.tasks} Create Task</button>
    ${record.status === 'Round Complete Follow Up'
      ? `<button class="btn btn-primary btn-sm" id="qa-complete">✓ Mark Complete</button>`
      : ''}
  `;

  // Insert after drawer-tabs
  const tabs = drawerEl.querySelector('#drawer-tabs');
  if (tabs) tabs.after(bar);

  bar.querySelector('#qa-add-buyer')?.addEventListener('click', () => {
    openQuickUserPickModal(auctionId, 'buyerId', 'Assign Buyer', table, drawer, refreshChips);
  });

  bar.querySelector('#qa-schedule')?.addEventListener('click', () => {
    openQuickDateModal(auctionId, 'confirmedPlayDate', 'Schedule Round — Confirmed Play Date', table, drawer, refreshChips);
  });

  bar.querySelector('#qa-create-task')?.addEventListener('click', () => {
    openTaskForm(null, auctionId, null, null, () => { table.refresh(); });
  });

  bar.querySelector('#qa-complete')?.addEventListener('click', async () => {
    const ok = await Confirm.show('Mark this auction as Round Complete? This cannot be auto-reversed.', 'Mark Round Complete');
    if (!ok) return;
    Store.update('auctions', auctionId, { status: 'Round Complete' });
    Toast.success('Marked as Round Complete');
    table.refresh();
    if (refreshChips) refreshChips();
    drawer.close();
  });
}

function openQuickUserPickModal(auctionId, field, title, table, drawer, refreshChips) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay open';
  overlay.innerHTML = `
    <div class="modal" style="max-width:480px">
      <div class="modal-header">
        <span class="modal-title">${title}</span>
        <button class="drawer-close" id="qup-close">${Icons.close}</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Select User</label>
          <div id="qup-user-wrap"></div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="qup-cancel">Cancel</button>
        <button class="btn btn-primary" id="qup-save">Assign</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  let selectedId = null;
  const close = () => overlay.remove();
  overlay.querySelector('#qup-close').onclick = close;
  overlay.querySelector('#qup-cancel').onclick = close;
  createLinkedField({ container: overlay.querySelector('#qup-user-wrap'), tableName: 'users', searchFields: ['firstName','lastName','email'], displayFn: r=>`${r.firstName} ${r.lastName}`, onSelect: id => selectedId = id, value: null, placeholder: 'Search users...' });
  overlay.querySelector('#qup-save').onclick = () => {
    if (!selectedId) { Toast.error('Please select a user'); return; }
    Store.update('auctions', auctionId, { [field]: selectedId });
    Store.refreshAllAuctionStatuses();
    Toast.success('Assigned successfully');
    close();
    table.refresh();
    if (refreshChips) refreshChips();
    drawer.close();
    setTimeout(() => Router.navigate(`auctions?open=${auctionId}`), 100);
  };
}

function openQuickDateModal(auctionId, field, title, table, drawer, refreshChips) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay open';
  overlay.innerHTML = `
    <div class="modal" style="max-width:400px">
      <div class="modal-header">
        <span class="modal-title">${title}</span>
        <button class="drawer-close" id="qd-close">${Icons.close}</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Date</label>
          <input class="input" id="qd-date" type="date">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="qd-cancel">Cancel</button>
        <button class="btn btn-primary" id="qd-save">Confirm Date</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelector('#qd-close').onclick = close;
  overlay.querySelector('#qd-cancel').onclick = close;
  overlay.querySelector('#qd-save').onclick = () => {
    const date = overlay.querySelector('#qd-date').value;
    if (!date) { Toast.error('Please select a date'); return; }
    Store.update('auctions', auctionId, { [field]: date, schedulingStatus: 'Confirmed' });
    Store.refreshAllAuctionStatuses();
    Toast.success('Round scheduled');
    close();
    table.refresh();
    if (refreshChips) refreshChips();
    drawer.close();
    setTimeout(() => Router.navigate(`auctions?open=${auctionId}`), 100);
  };
}

// openQuickTaskModal replaced by global openTaskForm (tasks.js)
// Call: openTaskForm(null, auctionId, userId, null, onCreated)

// ─── NEW / EDIT AUCTION FORM ──────────────────────────────────────────────────
function openAuctionForm(existingId, table) {
  const existing = existingId ? Store.getById('auctions', existingId) : null;
  const formData = existing ? { ...existing } : { status: 'New', quantity: 1, visibility: 'Public' };
  const linkedFields = {};

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay open';
  overlay.innerHTML = `
    <div class="modal" style="max-width:700px">
      <div class="modal-header">
        <span class="modal-title">${existing ? 'Edit Auction' : 'New Auction'}</span>
        <button class="drawer-close" id="af-close">${Icons.close}</button>
      </div>
      <div class="modal-body" style="max-height:72vh;overflow-y:auto">
        <div class="form-grid">
          <div class="form-group"><label class="form-label">Item Number</label>
            <input class="input" id="af-itemNumber" value="${formData.itemNumber||''}" placeholder="GS-001"></div>
          <div class="form-group"><label class="form-label">Type</label>
            <select class="select" id="af-type">${Store.AUCTION_TYPES.map(t=>`<option ${formData.type===t?'selected':''}>${t}</option>`).join('')}</select></div>
          <div class="form-group form-full"><label class="form-label">Short Name *</label>
            <input class="input" id="af-shortName" value="${formData.shortName||''}" placeholder="Short display name"></div>
          <div class="form-group form-full"><label class="form-label">Full Title</label>
            <input class="input" id="af-title" value="${formData.title||''}" placeholder="Full auction title"></div>
          <div class="form-group form-full"><label class="form-label">Description</label>
            <textarea class="input" id="af-description" rows="3" placeholder="Item description...">${formData.description||''}</textarea></div>
          <div class="form-group"><label class="form-label">FMV ($)</label>
            <input class="input" id="af-fmv" type="number" value="${formData.fmv||''}" placeholder="0"></div>
          <div class="form-group"><label class="form-label">Starting Bid ($)</label>
            <input class="input" id="af-reservePrice" type="number" value="${formData.reservePrice||''}" placeholder="0"></div>
          <div class="form-group"><label class="form-label">Buy Now Price ($)</label>
            <input class="input" id="af-buyNowPrice" type="number" value="${formData.buyNowPrice||''}" placeholder="0"></div>
          <div class="form-group"><label class="form-label">Quantity</label>
            <input class="input" id="af-quantity" type="number" value="${formData.quantity||1}" placeholder="1"></div>
          <div class="form-group"><label class="form-label">City</label>
            <input class="input" id="af-city" value="${formData.city||''}" placeholder="City"></div>
          <div class="form-group"><label class="form-label">State</label>
            <input class="input" id="af-state" value="${formData.state||''}" placeholder="CA"></div>
          <div class="form-group"><label class="form-label">GiveSmart URL</label>
            <input class="input" id="af-givesmartUrl" value="${formData.givesmartUrl||''}" placeholder="https://givesmart.com/..."></div>
          <div class="form-group"><label class="form-label">Event Code</label>
            <input class="input" id="af-eventCode" value="${formData.eventCode||''}" placeholder="EPIC-S25"></div>
          <div class="form-group"><label class="form-label">Launch Date</label>
            <input class="input" id="af-launchDate" type="date" value="${formData.launchDate||''}"></div>
          <div class="form-group"><label class="form-label">End Date</label>
            <input class="input" id="af-endDate" type="date" value="${formData.endDate||''}"></div>
          <div class="form-group form-full"><label class="form-label">Course / Club</label>
            <div id="af-course-wrap"></div></div>
          <div class="form-group"><label class="form-label">Donated By (User)</label>
            <div id="af-donor-wrap"></div></div>
          <div class="form-group"><label class="form-label">Buyer (User)</label>
            <div id="af-buyer-wrap"></div></div>
          <div class="form-group form-full"><label class="form-label">Notes</label>
            <textarea class="input" id="af-notes" rows="2" placeholder="Internal notes...">${formData.notes||''}</textarea></div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="af-cancel">Cancel</button>
        <button class="btn btn-primary" id="af-submit">${Icons.plus} ${existing ? 'Save Changes' : 'Create Auction'}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelector('#af-close').onclick = close;
  overlay.querySelector('#af-cancel').onclick = close;

  createLinkedField({ container: overlay.querySelector('#af-course-wrap'), tableName: 'courses', searchFields: ['name','location'], displayFn: r=>r.name, onSelect: id=>linkedFields.courseId=id, value: formData.courseId, placeholder: 'Search courses...' });
  createLinkedField({ container: overlay.querySelector('#af-donor-wrap'), tableName: 'users', searchFields: ['firstName','lastName','email'], displayFn: r=>`${r.firstName} ${r.lastName}`, onSelect: id=>linkedFields.donorId=id, value: formData.donorId, placeholder: 'Search users...' });
  createLinkedField({ container: overlay.querySelector('#af-buyer-wrap'), tableName: 'users', searchFields: ['firstName','lastName','email'], displayFn: r=>`${r.firstName} ${r.lastName}`, onSelect: id=>linkedFields.buyerId=id, value: formData.buyerId, placeholder: 'Search users...' });

  overlay.querySelector('#af-submit').onclick = () => {
    const shortName = overlay.querySelector('#af-shortName').value.trim();
    if (!shortName) { Toast.error('Short Name is required'); return; }
    const data = {
      shortName,
      title:         overlay.querySelector('#af-title').value.trim() || shortName,
      description:   overlay.querySelector('#af-description').value.trim(),
      type:          overlay.querySelector('#af-type').value,
      itemNumber:    overlay.querySelector('#af-itemNumber').value.trim(),
      fmv:           parseFloat(overlay.querySelector('#af-fmv').value) || null,
      reservePrice:  parseFloat(overlay.querySelector('#af-reservePrice').value) || null,
      buyNowPrice:   parseFloat(overlay.querySelector('#af-buyNowPrice').value) || null,
      quantity:      parseInt(overlay.querySelector('#af-quantity').value) || 1,
      city:          overlay.querySelector('#af-city').value.trim(),
      state:         overlay.querySelector('#af-state').value.trim(),
      givesmartUrl:  overlay.querySelector('#af-givesmartUrl').value.trim(),
      eventCode:     overlay.querySelector('#af-eventCode').value.trim(),
      launchDate:    overlay.querySelector('#af-launchDate').value,
      endDate:       overlay.querySelector('#af-endDate').value,
      notes:         overlay.querySelector('#af-notes').value.trim(),
      courseId:      linkedFields.courseId || formData.courseId || null,
      donorId:       linkedFields.donorId  || formData.donorId  || null,
      buyerId:       linkedFields.buyerId  || formData.buyerId  || null,
    };
    data.status = Store.computeAuctionStatus(data);
    if (existing) { Store.update('auctions', existing.id, data); Toast.success('Auction updated'); }
    else           { const r = Store.create('auctions', data); Toast.success(`Auction created: ${r.id}`); }
    close();
    if (table) table.refresh();
  };
}

// ─── CSV IMPORT MODAL ─────────────────────────────────────────────────────────
function openAuctionImportModal(csvText, table) {
  const rows = Store.parseCSV(csvText);
  if (!rows.length) { Toast.error('No data found in CSV'); return; }
  const headers = Object.keys(rows[0]);
  const CRM_FIELDS = [
    { key: '__skip__',    label: '— Skip —' },
    { key: 'shortName',  label: 'Short Name' },
    { key: 'title',      label: 'Full Title' },
    { key: 'itemNumber', label: 'Item Number' },
    { key: 'type',       label: 'Type' },
    { key: 'fmv',        label: 'FMV ($)' },
    { key: 'reservePrice',label: 'Starting Bid ($)' },
    { key: 'givesmartUrl',label: 'GiveSmart URL' },
    { key: 'launchDate', label: 'Launch Date' },
    { key: 'endDate',    label: 'End Date' },
    { key: 'city',       label: 'City' },
    { key: 'state',      label: 'State' },
    { key: 'notes',      label: 'Notes' },
  ];
  const guessMap = h => {
    const n = h.toLowerCase().replace(/[\s_]/g,'');
    return n.includes('short') ? 'shortName' : n.includes('item') ? 'itemNumber' :
      n.includes('title') ? 'title' : n.includes('fmv') ? 'fmv' :
      n.includes('launch') ? 'launchDate' : n.includes('end') ? 'endDate' :
      n.includes('givesmart') || n.includes('url') ? 'givesmartUrl' :
      n.includes('city') ? 'city' : n.includes('state') ? 'state' :
      n.includes('notes') ? 'notes' : '__skip__';
  };
  const mapping = {};
  headers.forEach(h => { mapping[h] = guessMap(h); });

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay open';
  overlay.innerHTML = `
    <div class="modal" style="max-width:760px">
      <div class="modal-header">
        <span class="modal-title">${Icons.imports} Import Auctions — CSV</span>
        <button class="drawer-close" id="ai-close">${Icons.close}</button>
      </div>
      <div class="modal-body" style="max-height:72vh;overflow-y:auto">
        <div style="font-size:var(--text-sm);color:var(--text-secondary);margin-bottom:var(--space-4)">
          <strong>${rows.length}</strong> rows found. Map columns, then preview and import.
        </div>
        <div class="drawer-section">
          <div class="drawer-section-title">Column Mapping</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3)">
            ${headers.map(h=>`
              <div style="display:flex;align-items:center;gap:var(--space-2)">
                <span style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--text-muted);min-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${h}</span>
                <span style="color:var(--text-muted)">→</span>
                <select class="select" style="flex:1" data-header="${h}">
                  ${CRM_FIELDS.map(cf=>`<option value="${cf.key}" ${mapping[h]===cf.key?'selected':''}>${cf.label}</option>`).join('')}
                </select>
              </div>`).join('')}
          </div>
        </div>
        <div class="drawer-section">
          <div class="drawer-section-title">Preview (first 8 rows)</div>
          <div id="ai-preview"></div>
        </div>
        <div id="ai-summary" style="font-size:var(--text-sm);color:var(--text-secondary);margin-top:var(--space-2)"></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="ai-cancel">Cancel</button>
        <button class="btn btn-ghost btn-sm" id="ai-refresh">Refresh Preview</button>
        <button class="btn btn-primary" id="ai-submit">${Icons.plus} Import</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelector('#ai-close').onclick = close;
  overlay.querySelector('#ai-cancel').onclick = close;

  const getMap = () => { const m={}; overlay.querySelectorAll('[data-header]').forEach(s=>m[s.dataset.header]=s.value); return m; };
  const buildRow = (row, m) => { const r={}; headers.forEach(h=>{ if(m[h]&&m[h]!=='__skip__') r[m[h]]=row[h]||''; }); return r; };
  const isDup = r => Store.getAll('auctions').some(a => (r.itemNumber && a.itemNumber === r.itemNumber) || (r.shortName && a.shortName === r.shortName && !r.itemNumber));

  function buildPreview() {
    const m = getMap();
    const preview = rows.slice(0,8).map(r => buildRow(r,m));
    overlay.querySelector('#ai-preview').innerHTML = `
      <div class="table-container" style="max-height:200px;overflow-y:auto">
        <table class="crm-table"><thead><tr><th style="width:28px"></th><th>Short Name</th><th>Item #</th><th>City</th><th>Launch</th></tr></thead>
        <tbody>${preview.map(r=>`<tr>
          <td title="${isDup(r)?'Possible duplicate':'New record'}" style="font-size:15px">${isDup(r)?'⚠':'✓'}</td>
          <td>${r.shortName||'—'}</td><td style="font-family:var(--font-mono);font-size:var(--text-xs)">${r.itemNumber||'—'}</td>
          <td>${r.city||'—'}</td><td style="font-size:var(--text-xs)">${r.launchDate||'—'}</td>
        </tr>`).join('')}</tbody></table>
      </div>`;
    const dupes = rows.filter(r=>isDup(buildRow(r,m))).length;
    overlay.querySelector('#ai-summary').innerHTML =
      `<strong>${rows.length}</strong> rows · <span style="color:var(--status-green)"><strong>${rows.length-dupes}</strong> new</span> · <span style="color:#f59e0b"><strong>${dupes}</strong> duplicate${dupes!==1?'s':''}</span> (will be skipped)`;
  }

  buildPreview();
  overlay.querySelector('#ai-refresh').onclick = buildPreview;
  overlay.querySelectorAll('[data-header]').forEach(s=>s.addEventListener('change',buildPreview));

  overlay.querySelector('#ai-submit').onclick = () => {
    const m = getMap();
    let created=0, skipped=0;
    rows.forEach(row => {
      const r = buildRow(row,m);
      if (!r.shortName && !r.title) { skipped++; return; }
      if (isDup(r)) { skipped++; return; }
      r.status = Store.computeAuctionStatus(r);
      r.quantity = parseInt(r.quantity)||1;
      r.fmv = parseFloat(r.fmv)||null;
      r.reservePrice = parseFloat(r.reservePrice)||null;
      Store.create('auctions', r);
      created++;
    });
    close();
    if (table) table.refresh();
    if (created>0) Toast.success(`Imported ${created} auction${created!==1?'s':''}${skipped>0?` (${skipped} skipped)`:''}`);
    else Toast.info(`No new auctions imported. ${skipped} skipped.`);
  };
}

/**
 * EPIC Foundation CRM — Events Page (Updated)
 * Full-view pattern, improved attendees with status + bidirectional user linking,
 * removed ID column from table list.
 */

function renderEvents(params = {}) {
  const main = document.getElementById('main');

  main.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <span class="page-title">Events</span>
        <span class="page-subtitle">Galas, golf trips, and charity events</span>
      </div>
      <div class="page-header-right">
        <button class="btn btn-primary" id="new-event-btn">${Icons.plus} New Event</button>
      </div>
    </div>
    <div class="page-content"><div id="events-table-wrap"></div></div>
  `;

  const table = new CRMTable({
    containerId: 'events-table-wrap',
    tableName: 'events',
    searchFields: ['title', 'location', 'type'],
    filterDefs: [
      { field: 'status', label: 'All Statuses', options: Store.STATUS.events },
      { field: 'type',   label: 'All Types',    options: ['Auction Event', 'Golf Trip', 'Gala Dinner', 'Member Event', 'Other'] },
    ],
    defaultSort: 'date',
    preFilter: items => {
      if (table && table.state.filters.status === 'Completed') return items;
      return items.filter(r => r.status !== 'Completed');
    },
    columns: [
      { field: 'title',           label: 'Event',      sortable: true },
      { field: 'type',            label: 'Type',       sortable: true, render: row => row.type ? `<span class="tag">${row.type}</span>` : '—' },
      { field: 'date',            label: 'Date',       sortable: true, render: row => `<span style="color:var(--text-secondary)">${row.date||'—'}</span>` },
      { field: 'location',        label: 'Location',   sortable: true },
      { field: 'spotsRegistered', label: 'Attendees',  sortable: true, render: row => `<span style="color:var(--text-muted)">${getAttendees(row).length} / ${row.capacity||'∞'}</span>` },
      { field: 'status',          label: 'Status',     sortable: true, isStatus: true },
    ],
    onRowClick: id => openEventFullView(id),
  });

  table.render();
  if (params.open) setTimeout(() => openEventFullView(params.open), 100);
  document.getElementById('new-event-btn').addEventListener('click', () => openEventForm(null, table));

  // ─── Attendee helpers ───────────────────────────────────────────────────────
  // Attendees: stored as array of { userId, status: 'Registered'|'Waitlisted'|'Cancelled' }
  // Migrate legacy userIds on read
  function getAttendees(record) {
    if (Array.isArray(record.attendees)) return record.attendees;
    // migrate legacy userIds array
    if (Array.isArray(record.userIds) && record.userIds.length) {
      return record.userIds.map(uid => ({ userId: uid, status: 'Registered' }));
    }
    return [];
  }

  function updateAttendeeOnUser(userId, eventId, attendeeStatus) {
    const user = Store.getById('users', userId);
    if (!user) return;
    const eventAttendances = (user.eventAttendances || []).filter(ea => ea.eventId !== eventId);
    if (attendeeStatus !== 'Removed') {
      eventAttendances.push({ eventId, status: attendeeStatus });
    }
    Store.update('users', userId, { eventAttendances });
  }

  // ─── Full View ──────────────────────────────────────────────────────────────
  function openEventFullView(id) {
    let record = Store.getById('events', id);
    if (!record) return;
    let formData = { ...record };
    let linkedFields = {};
    const view = new RecordFullView();

    view.open({
      recordId: record.id,
      title: record.title,
      tabs: ['Details', 'Attendees', 'Financials', 'Notes', 'Activity'],
      tabRenderer: (body, tab, editMode) => {
        record = Store.getById('events', id) || record;
        if (tab === 'Details') renderEventDetails(body, record, formData, editMode, linkedFields);
        else if (tab === 'Attendees') renderEventAttendees(body, record, editMode, view, table);
        else if (tab === 'Financials') window.renderLinkedFinancials(body, record, 'linkedEventId', record.id, record.name||record.id);
        else if (tab === 'Notes') renderNotesTab(body, record, 'events');
        else if (tab === 'Activity') body.innerHTML = renderActivityLog(record.activityLog);
      },
      onSave: () => {
        const updates = { ...formData };
        if (linkedFields.courseId !== undefined) updates.courseId = linkedFields.courseId;
        Store.update('events', id, updates);
        Toast.success('Event updated');
        table.refresh();
        view.updateTitle(formData.title, id);
      },
      onDelete: () => {
        Store.remove('events', id);
        Toast.success('Event deleted');
        table.refresh();
        Router.navigate('events');
      },
      onClose: () => Router.navigate('events'),
    });
  }

  function renderEventDetails(body, record, formData, editMode, linkedFields) {
    body.innerHTML = `
      <div class="drawer-section"><div class="drawer-section-title">Event Details</div>
        <div class="form-grid">
          <div class="form-group form-full"><label class="form-label">Event Name</label>
            ${editMode ? `<input class="input" id="e-title" value="${record.title||''}">` : `<div style="font-size:var(--text-lg);font-weight:var(--fw-medium)">${record.title||'—'}</div>`}
          </div>
          <div class="form-group"><label class="form-label">Type</label>
            ${editMode ? `<select class="select" id="e-type"><option value="">—</option>${['Auction Event','Golf Trip','Gala Dinner','Member Event','Other'].map(t=>`<option ${record.type===t?'selected':''}>${t}</option>`).join('')}</select>` : (record.type ? `<span class="tag">${record.type}</span>` : '—')}
          </div>
          <div class="form-group"><label class="form-label">Status</label>
            ${editMode ? `<select class="select" id="e-status">${Store.STATUS.events.map(s=>`<option ${record.status===s?'selected':''}>${s}</option>`).join('')}</select>` : StatusBadge.render(record.status)}
          </div>
          <div class="form-group"><label class="form-label">Date</label>
            ${editMode ? `<input class="input" id="e-date" type="date" value="${record.date||''}">` : `<div style="color:var(--text-secondary)">${record.date||'—'}</div>`}
          </div>
          <div class="form-group form-full"><label class="form-label">Location</label>
            ${editMode ? `<input class="input" id="e-location" value="${record.location||''}">` : `<div style="color:var(--text-secondary)">${record.location||'—'}</div>`}
          </div>
          <div class="form-group"><label class="form-label">Capacity</label>
            ${editMode ? `<input class="input" id="e-capacity" type="number" value="${record.capacity||''}">` : `<div style="color:var(--text-secondary)">${record.capacity||'—'}</div>`}
          </div>
          <div class="form-group"><label class="form-label">Linked Course</label>
            ${editMode ? `<div id="e-course-wrap"></div>` : renderLinkedCourseChip(record.courseId)}
          </div>
        </div>
      </div>
      <div class="drawer-section"><div class="drawer-section-title">Financial Config</div>
        <div class="form-grid">
          <div class="form-group"><label class="form-label">Entry Fee ($)</label>
            ${editMode ? `<input class="input" id="e-entryFee" type="number" value="${record.entryFee||''}">` : `<div>${(record.entryFee||0).toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0})}</div>`}
          </div>
          <div class="form-group"><label class="form-label">Sponsorships ($)</label>
            ${editMode ? `<input class="input" id="e-sponsorshipRevenue" type="number" value="${record.sponsorshipRevenue||''}">` : `<div>${(record.sponsorshipRevenue||0).toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0})}</div>`}
          </div>
          <div class="form-group"><label class="form-label">Discounts ($)</label>
            ${editMode ? `<input class="input" id="e-discounts" type="number" value="${record.discounts||''}">` : `<div>${(record.discounts||0).toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0})}</div>`}
          </div>
          <div class="form-group"><label class="form-label">Refunds ($)</label>
            ${editMode ? `<input class="input" id="e-refunds" type="number" value="${record.refunds||''}">` : `<div>${(record.refunds||0).toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0})}</div>`}
          </div>
        </div>
      </div>
      <div class="drawer-section"><div class="drawer-section-title">Internal ID</div>
        <div style="font-family:var(--font-mono);font-size:var(--text-sm);color:var(--text-muted)">${record.id}</div>
      </div>
      <div class="drawer-section"><div class="drawer-section-title">Metadata</div>
        <div class="form-grid">
          <div class="form-group"><label class="form-label">Created</label><div style="color:var(--text-muted);font-size:var(--text-sm)">${Store.formatDateTime(record.createdAt)}</div></div>
          <div class="form-group"><label class="form-label">Last Updated</label><div style="color:var(--text-muted);font-size:var(--text-sm)">${Store.formatDateTime(record.updatedAt)}</div></div>
        </div>
      </div>
    `;
    if (editMode) {
      ['title','type','status','date','location'].forEach(f => { const el = body.querySelector(`#e-${f}`); if(el) el.addEventListener(el.tagName==='SELECT'?'change':'input', ()=>formData[f]=el.value); });
      ['capacity'].forEach(f => { const el = body.querySelector(`#e-${f}`); if(el) el.addEventListener('input', ()=>formData[f]=parseInt(el.value)||0); });
      ['entryFee','sponsorshipRevenue','discounts','refunds'].forEach(f => { const el = body.querySelector(`#e-${f}`); if(el) el.addEventListener('input', ()=>formData[f]=parseFloat(el.value)||0); });
      const cw = body.querySelector('#e-course-wrap');
      if (cw) { cw.id='lf-e-course'; createLinkedField({container:cw,tableName:'courses',searchFields:['name'],displayFn:r=>r.name,onSelect:id=>linkedFields.courseId=id,value:record.courseId,placeholder:'Search courses...'}); }
    }
  }

  function renderEventAttendees(body, record, editMode, view, table) {
    const attendees = getAttendees(record);
    const STATUSES = ['Registered', 'Waitlisted', 'Cancelled'];

    body.innerHTML = `
      <div class="drawer-section">
        <div class="drawer-section-title">Attendees <span style="font-weight:normal;color:var(--text-muted)">(${attendees.filter(a=>a.status!=='Cancelled').length})</span></div>
        <div id="attendee-list">
          ${attendees.length ? attendees.map(a => {
            const u = Store.getById('users', a.userId);
            if (!u) return '';
            return `<div class="attendee-row" data-uid="${a.userId}">
              <div style="flex:1">
                <div class="attendee-name">${u.firstName} ${u.lastName}</div>
                <div class="attendee-email">${u.email||''}</div>
              </div>
              <select class="attendee-status-select" data-uid="${a.userId}">
                ${STATUSES.map(s => `<option ${a.status===s?'selected':''}>${s}</option>`).join('')}
              </select>
              <button class="btn btn-ghost btn-sm att-remove" data-uid="${a.userId}" title="Remove">✕</button>
            </div>`;
          }).join('') : `<div style="color:var(--text-muted);font-size:var(--text-sm)">No attendees yet.</div>`}
        </div>
        <div style="margin-top:var(--space-4);border-top:var(--border-subtle);padding-top:var(--space-4)">
          <label class="form-label" style="margin-bottom:var(--space-2);display:block">Add Attendee</label>
          <div style="display:flex;gap:var(--space-2);align-items:center">
            <div id="att-user-wrap" style="flex:1"></div>
            <select class="select" id="att-status-new" style="width:140px">
              ${STATUSES.map(s=>`<option>${s}</option>`).join('')}
            </select>
            <button class="btn btn-secondary btn-sm" id="add-attendee-btn">Add</button>
          </div>
        </div>
      </div>
    `;

    // Linked field for adding
    let selectedUserId = null;
    const uwrap = body.querySelector('#att-user-wrap');
    if (uwrap) {
      uwrap.id = 'lf-att-user';
      createLinkedField({
        container: uwrap, tableName: 'users',
        searchFields: ['firstName','lastName','email'],
        displayFn: r => `${r.firstName} ${r.lastName}`,
        onSelect: id => { selectedUserId = id; },
        value: null, placeholder: 'Search users to add...'
      });
    }

    // Status change listener
    body.querySelectorAll('.attendee-status-select').forEach(sel => {
      sel.addEventListener('change', () => {
        const curr = Store.getById('events', record.id);
        const atts = getAttendees(curr).map(a => a.userId === sel.dataset.uid ? { ...a, status: sel.value } : a);
        Store.update('events', record.id, { attendees: atts, userIds: atts.filter(a=>a.status!=='Cancelled').map(a=>a.userId), spotsRegistered: atts.filter(a=>a.status==='Registered').length });
        updateAttendeeOnUser(sel.dataset.uid, record.id, sel.value);
        Toast.success(`Status → ${sel.value}`);
        table.refresh();
      });
    });

    // Remove attendee
    body.querySelectorAll('.att-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const curr = Store.getById('events', record.id);
        const atts = getAttendees(curr).filter(a => a.userId !== btn.dataset.uid);
        Store.update('events', record.id, { attendees: atts, userIds: atts.filter(a=>a.status!=='Cancelled').map(a=>a.userId), spotsRegistered: atts.filter(a=>a.status==='Registered').length });
        updateAttendeeOnUser(btn.dataset.uid, record.id, 'Removed');
        Toast.success('Attendee removed');
        table.refresh();
        renderEventAttendees(body, Store.getById('events', record.id), editMode, view, table);
      });
    });

    // Add attendee
    body.querySelector('#add-attendee-btn')?.addEventListener('click', () => {
      if (!selectedUserId) { Toast.error('Select a user first'); return; }
      const curr = Store.getById('events', record.id);
      const atts = getAttendees(curr);
      if (atts.some(a => a.userId === selectedUserId)) { Toast.info('User already added'); return; }
      const newStatus = body.querySelector('#att-status-new')?.value || 'Registered';
      atts.push({ userId: selectedUserId, status: newStatus });
      Store.update('events', record.id, { attendees: atts, userIds: atts.filter(a=>a.status!=='Cancelled').map(a=>a.userId), spotsRegistered: atts.filter(a=>a.status==='Registered').length });
      updateAttendeeOnUser(selectedUserId, record.id, newStatus);
      Toast.success('Attendee added');
      table.refresh();
      renderEventAttendees(body, Store.getById('events', record.id), editMode, view, table);
    });
  }
}

function openEventForm(existingId, table) {
  const existing = existingId ? Store.getById('events', existingId) : null;
  const linkedFields = {};
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay open';
  overlay.innerHTML = `
    <div class="modal" style="width:min(640px,95vw)">
      <div class="modal-header"><span class="modal-title">${existing?'Edit Event':'New Event'}</span><button class="drawer-close" id="modal-close">${Icons.close}</button></div>
      <div class="modal-body">
        <div class="form-grid">
          <div class="form-group form-full"><label class="form-label">Event Name *</label><input class="input" id="ef-title" value="${existing?.title||''}" placeholder="e.g. Spring Charity Gala 2025"></div>
          <div class="form-group"><label class="form-label">Type</label><select class="select" id="ef-type"><option value="">—</option>${['Auction Event','Golf Trip','Gala Dinner','Member Event','Other'].map(t=>`<option ${existing?.type===t?'selected':''}>${t}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">Status</label><select class="select" id="ef-status">${Store.STATUS.events.map(s=>`<option ${(existing?.status||'Upcoming')===s?'selected':''}>${s}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">Date</label><input class="input" id="ef-date" type="date" value="${existing?.date||''}"></div>
          <div class="form-group form-full"><label class="form-label">Location</label><input class="input" id="ef-location" value="${existing?.location||''}" placeholder="Venue name, City, State"></div>
          <div class="form-group"><label class="form-label">Capacity</label><input class="input" id="ef-capacity" type="number" value="${existing?.capacity||''}"></div>
          <div class="form-group"><label class="form-label">Course</label><div id="ef-course-wrap"></div></div>
          
          <div class="form-group"><label class="form-label">Entry Fee ($)</label><input class="input" id="ef-entryFee" type="number" value="${existing?.entryFee||''}"></div>
          <div class="form-group"><label class="form-label">Sponsorships ($)</label><input class="input" id="ef-sponsorshipRevenue" type="number" value="${existing?.sponsorshipRevenue||''}"></div>
          <div class="form-group"><label class="form-label">Discounts ($)</label><input class="input" id="ef-discounts" type="number" value="${existing?.discounts||''}"></div>
          <div class="form-group"><label class="form-label">Refunds ($)</label><input class="input" id="ef-refunds" type="number" value="${existing?.refunds||''}"></div>

          <div class="form-group form-full"><label class="form-label">Notes</label><textarea class="textarea" id="ef-notes">${existing?.notes||''}</textarea></div>
        </div>
      </div>
      <div class="modal-footer"><button class="btn btn-secondary" id="modal-cancel">Cancel</button><button class="btn btn-primary" id="modal-submit">${Icons.plus} ${existing?'Save':'Create Event'}</button></div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('#modal-close').onclick = overlay.querySelector('#modal-cancel').onclick = () => overlay.remove();
  createLinkedField({container:overlay.querySelector('#ef-course-wrap'),tableName:'courses',searchFields:['name'],displayFn:r=>r.name,onSelect:id=>linkedFields.courseId=id,value:existing?.courseId,placeholder:'Search courses...'});
  overlay.querySelector('#modal-submit').onclick = () => {
    const title = overlay.querySelector('#ef-title').value.trim();
    if (!title) { Toast.error('Event name required'); return; }
    const data = {
      title, type: overlay.querySelector('#ef-type').value,
      status: overlay.querySelector('#ef-status').value,
      date: overlay.querySelector('#ef-date').value,
      location: overlay.querySelector('#ef-location').value,
      capacity: parseInt(overlay.querySelector('#ef-capacity').value) || null,
      entryFee: parseFloat(overlay.querySelector('#ef-entryFee').value) || 0,
      sponsorshipRevenue: parseFloat(overlay.querySelector('#ef-sponsorshipRevenue').value) || 0,
      discounts: parseFloat(overlay.querySelector('#ef-discounts').value) || 0,
      refunds: parseFloat(overlay.querySelector('#ef-refunds').value) || 0,
      notes: overlay.querySelector('#ef-notes').value,
      courseId: linkedFields.courseId || existing?.courseId || null,
      attendees: existing?.attendees || [],
      userIds: existing?.userIds || [],
      spotsRegistered: existing?.spotsRegistered || 0,
    };
    if (existing) { Store.update('events', existing.id, data); Toast.success('Event updated'); }
    else { const r = Store.create('events', data); Toast.success(`Event created: ${r.id}`); }
    overlay.remove(); table.refresh();
  };
}

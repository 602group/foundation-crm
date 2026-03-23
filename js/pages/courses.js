/**
 * EPIC Foundation CRM — Courses / Clubs Page (Full Rebuild)
 * Master course database. Tabs: Details, Auctions, Opportunities, Donations, Notes, Activity.
 */

function renderCourses(params = {}) {
  const main = document.getElementById('main');

  main.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <span class="page-title">Courses &amp; Clubs</span>
        <span class="page-subtitle">Master registry — one shared database reused across Auctions, Opportunities, and Donations</span>
      </div>
      <div class="page-header-right">
        <button class="btn btn-ghost btn-sm" id="export-courses-btn">${Icons.download} Export</button>
        <button class="btn btn-primary" id="new-course-btn">${Icons.plus} New Course</button>
      </div>
    </div>
    <div class="page-content"><div id="courses-table-wrap"></div></div>
  `;


  const table = new CRMTable({
    containerId: 'courses-table-wrap',
    tableName: 'courses',
    searchFields: ['id', 'name', 'city', 'state', 'contactName'],
    filterDefs: [
      { field: 'type',   label: 'All Types',   options: Store.COURSE_TYPES },
      { field: 'tier',   label: 'All Tiers',   options: Store.COURSE_TIERS },
      { field: 'status', label: 'All Statuses', options: Store.STATUS.courses },
    ],
    defaultSort: 'name',
    columns: [
      { field: 'name',        label: 'Course Name',  sortable: true, render: row =>
        `<span style="font-weight:var(--fw-medium)">${row.name}</span>` },
      { field: 'city',        label: 'City, State',  sortable: true, render: row =>
        row.city ? `<span style="color:var(--text-secondary)">${row.city}${row.state ? `, ${row.state}` : ''}</span>` : '<span style="color:var(--text-muted)">—</span>' },
      { field: 'type',        label: 'Type',         sortable: true, render: row => {
        if (!row.type) return '—';
        const colors = {
          'Private': 'background:#f3e8ff;color:#6b21a8',    // Purple
          'Public': 'background:#e0f2fe;color:#0369a1',     // Light Blue
          'Resort': 'background:#e0e7ff;color:#3730a3',     // Indigo
          'Semi-Private': 'background:#ccfbf1;color:#0f766e' // Teal
        };
        const style = colors[row.type] || 'background:#f3f4f6;color:#374151';
        return `<span class="tag" style="${style};border:none">${row.type}</span>`;
      }},
      { field: 'tier',        label: 'Tier',         sortable: true, render: row => {
        const colors = { Platinum: 'badge-blue', Gold: 'badge-amber', Silver: 'badge-gray' };
        return row.tier ? `<span class="badge ${colors[row.tier]||'badge-gray'}">${row.tier}</span>` : '—';
      }},
      { field: 'contactName', label: 'Contact',      sortable: true, render: row =>
        row.contactName ? row.contactName : '<span style="color:var(--text-muted)">—</span>' },
      { field: 'status',      label: 'Status',       sortable: true, isStatus: true },
      { field: '_linked',     label: 'Linked',       sortable: false, render: row => {
        const a = Store.getLinked('auctions',      'courseId', row.id).length;
        const o = Store.getLinked('opportunities', 'courseId', row.id).length;
        const d = Store.getLinked('donations',     'courseId', row.id).length;
        return `<span style="font-size:var(--text-xs);color:var(--text-muted)">${a}A · ${o}O · ${d}D</span>`;
      }},
    ],
    onRowClick: id => openCourseDrawer(id),
  });

  table.render();
  if (params.open) setTimeout(() => openCourseDrawer(params.open), 100);
  document.getElementById('new-course-btn').addEventListener('click', () => openCourseForm(null, table));
  document.getElementById('export-courses-btn').addEventListener('click', () => {
    Store.downloadCSV('courses', 'courses-export.csv');
    Toast.success('Courses exported');
  });

  function openCourseDrawer(id) {
    let record = Store.getById('courses', id);
    if (!record) return;
    let formData = { ...record };
    const TABS = ['Details', 'Media', 'Auctions', 'Opportunities', 'Donations', 'Notes', 'Activity'];
    const view = new RecordFullView({ tabs: TABS });

    view.open({
      recordId: record.id,
      title: record.name,
      tabs: TABS,
      tabRenderer: (body, tab, editMode) => {
        record = Store.getById('courses', id) || record;
        if      (tab === 'Details')       renderCourseDetails(body, record, formData, editMode);
        else if (tab === 'Media')         renderCourseMedia(body, record, id);
        else if (tab === 'Auctions')      renderCourseLinkedTable(body, 'auctions',      id, 'auctions',      r => r.shortName || r.title || r.id);
        else if (tab === 'Opportunities') renderCourseLinkedTable(body, 'opportunities', id, 'opportunities', r => r.shortName || r.title || r.id);
        else if (tab === 'Donations')     renderCourseLinkedTable(body, 'donations',     id, 'donations',     r => r.description || r.title || r.id);
        else if (tab === 'Notes')         renderNotesTab(body, record, 'courses');
        else if (tab === 'Activity')      body.innerHTML = renderActivityLog(record.activityLog);
      },
      onSave: () => {
        Store.update('courses', id, formData);
        Toast.success('Course updated'); table.refresh();
        view.updateTitle(formData.name || id, id);
      },
      onDelete: () => { Store.remove('courses', id); Toast.success('Course deleted'); table.refresh(); Router.navigate('courses'); },
      onClose: () => Router.navigate('courses'),
    });
  }

  // ─── MEDIA TAB ─────────────────────────────────────────────────────────
  function renderCourseMedia(body, record, courseId) {
    const imgs = record.images || [];
    body.innerHTML = `
      <div class="drawer-section">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3)">
          <div class="drawer-section-title" style="margin-bottom:0">Course Photos <span style="color:var(--text-muted);font-size:var(--text-xs)">(${imgs.length})</span></div>
          <label class="btn btn-primary btn-sm" style="cursor:pointer">
            ${Icons.plus} Upload Image
            <input type="file" id="cm-upload" accept="image/*" multiple style="display:none">
          </label>
        </div>
        ${imgs.length === 0
          ? '<div style="color:var(--text-muted);font-size:var(--text-sm);padding:var(--space-4) 0">No images uploaded yet. Click Upload to add photos.</div>'
          : `<div class="media-grid" id="cm-grid">${imgs.map((img, i) => `
              <div class="media-card ${img.isMain?'main-image':''}" data-idx="${i}" draggable="true">
                ${img.isMain ? '<div class="media-main-badge">MAIN</div>' : ''}
                <img src="${img.dataUrl}" alt="Course image ${i+1}">
                <div class="media-card-actions">
                  ${!img.isMain ? `<button class="btn btn-ghost btn-sm" data-action="main" data-idx="${i}" style="font-size:10px">Set Main</button>` : ''}
                  <button class="btn btn-ghost btn-sm" data-action="delete" data-idx="${i}" style="font-size:10px;color:var(--status-red)">Delete</button>
                </div>
              </div>`).join('')}</div>`}
      </div>
    `;

    // Wire upload
    const upInput = body.querySelector('#cm-upload');
    if (upInput) upInput.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files);
      const newImgs = [...imgs];
      for (const file of files) {
        const dataUrl = await new Promise(res => { const r = new FileReader(); r.onload = ev => res(ev.target.result); r.readAsDataURL(file); });
        newImgs.push({ dataUrl, isMain: newImgs.length === 0 });
      }
      Store.update('courses', courseId, { images: newImgs });
      const updated = Store.getById('courses', courseId);
      renderCourseMedia(body, updated, courseId);
    });

    // Wire card actions
    body.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.idx);
        let newImgs = [...imgs];
        if (btn.dataset.action === 'main') {
          newImgs = newImgs.map((img, i) => ({ ...img, isMain: i === idx }));
        } else if (btn.dataset.action === 'delete') {
          newImgs.splice(idx, 1);
          if (newImgs.length > 0 && !newImgs.some(i => i.isMain)) newImgs[0].isMain = true;
        }
        Store.update('courses', courseId, { images: newImgs });
        const updated = Store.getById('courses', courseId);
        renderCourseMedia(body, updated, courseId);
      });
    });
  }

  function renderCourseDetails(body, record, formData, editMode) {
    const inp = (fid, val, type='text', ph='') =>
      editMode ? `<input class="input" id="${fid}" type="${type}" value="${String(val||'').replace(/"/g,'&quot;')}" placeholder="${ph}">`
               : `<div style="font-size:var(--text-sm)">${val || '<span style="color:var(--text-muted)">—</span>'}</div>`;

    body.innerHTML = `
      <div class="drawer-section">
        <div class="drawer-section-title">Course Information</div>
        <div class="form-grid">
          <div class="form-group form-full"><label class="form-label">Course / Club Name</label>${inp('cd-name', record.name, 'text', 'e.g. Pebble Beach Golf Links')}</div>
          <div class="form-group"><label class="form-label">Type</label>
            ${editMode ? `<select class="select" id="cd-type"><option value="">—</option>${Store.COURSE_TYPES.map(t=>`<option ${record.type===t?'selected':''}>${t}</option>`).join('')}</select>`
              : (record.type ? `<span class="tag">${record.type}</span>` : '—')}</div>
          <div class="form-group"><label class="form-label">Tier</label>
            ${editMode ? `<select class="select" id="cd-tier"><option value="">—</option>${Store.COURSE_TIERS.map(t=>`<option ${record.tier===t?'selected':''}>${t}</option>`).join('')}</select>`
              : (record.tier ? `<span class="badge ${({Platinum:'badge-blue',Gold:'badge-amber',Silver:'badge-gray'}[record.tier]||'badge-gray')}">${record.tier}</span>` : '—')}</div>
          <div class="form-group"><label class="form-label">Status</label>
            ${editMode ? `<select class="select" id="cd-status">${Store.STATUS.courses.map(s=>`<option ${record.status===s?'selected':''}>${s}</option>`).join('')}</select>`
              : StatusBadge.render(record.status)}</div>
          <div class="form-group"><label class="form-label">Website</label>
            ${editMode ? inp('cd-website', record.website, 'text', 'example.com')
              : (record.website ? `<a href="https://${record.website.replace(/^https?:\/\//,'')}" target="_blank" style="color:var(--text-accent)">${record.website}</a>` : '—')}</div>
        </div>
      </div>
      <div class="drawer-section">
        <div class="drawer-section-title">Location</div>
        <div class="form-grid">
          <div class="form-group form-full"><label class="form-label">Address</label>${inp('cd-address', record.address, 'text', 'Street address')}</div>
          <div class="form-group"><label class="form-label">City</label>${inp('cd-city', record.city, 'text', 'City')}</div>
          <div class="form-group"><label class="form-label">State</label>${inp('cd-state', record.state, 'text', 'State')}</div>
          <div class="form-group"><label class="form-label">Region</label>
            ${editMode ? `<select class="select" id="cd-region"><option value="">—</option>${Store.COURSE_REGIONS.map(r=>`<option ${record.region===r?'selected':''}>${r}</option>`).join('')}</select>`
              : (record.region ? `<span class="tag">${record.region}</span>` : '—')}</div>
        </div>
      </div>
      <div class="drawer-section">
        <div class="drawer-section-title">Primary Contact</div>
        <div class="form-grid">
          <div class="form-group"><label class="form-label">Contact Name</label>${inp('cd-contactName', record.contactName, 'text', 'Full name')}</div>
          <div class="form-group"><label class="form-label">Contact Email</label>${inp('cd-contactEmail', record.contactEmail, 'email', 'email@example.com')}</div>
          <div class="form-group"><label class="form-label">Contact Phone</label>${inp('cd-contactPhone', record.contactPhone, 'tel', '(555) 000-0000')}</div>
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
      ['name','type','tier','status','website','address','city','state','region','contactName','contactEmail','contactPhone'].forEach(f => {
        const el = body.querySelector(`#cd-${f}`); if (!el) return;
        el.addEventListener(el.tagName==='SELECT'?'change':'input', ()=>formData[f]=el.value);
      });
    }
  }

  function renderCourseLinkedTable(body, tableName, courseId, section, labelFn) {
    const records = Store.getLinked(tableName, 'courseId', courseId);
    body.innerHTML = `
      <div class="drawer-section">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3)">
          <div class="drawer-section-title" style="margin-bottom:0">${section.charAt(0).toUpperCase()+section.slice(1)} <span style="color:var(--text-muted);font-size:var(--text-xs)">(${records.length})</span></div>
          <button class="btn btn-ghost btn-sm" id="clt-new-btn">${Icons.plus} New</button>
        </div>
        ${records.length === 0
          ? `<div style="color:var(--text-muted);font-size:var(--text-sm)">No ${tableName} linked to this course</div>`
          : `<div class="related-records">${records.map(r=>`
              <div class="related-record-row" data-id="${r.id}" style="cursor:pointer">
                <span class="related-record-id">${r.id}</span>
                <span class="related-record-name">${labelFn(r)}</span>
                ${StatusBadge.render(r.status)}
                ${Icons.chevronRight}
              </div>`).join('')}</div>`}
      </div>
    `;
    body.querySelectorAll('.related-record-row').forEach(el => {
      el.addEventListener('click', () => { body.closest('#record-drawer')?.querySelector('.drawer-close')?.click(); setTimeout(()=>Router.navigate(`${section}?open=${el.dataset.id}`),100); });
    });
    body.querySelector('#clt-new-btn')?.addEventListener('click', () => {
      if (section==='auctions')      { openAuctionForm && openAuctionForm(null, null, {courseId}); }
      else if (section==='opportunities') { openOppForm && openOppForm(null, null, {courseId}); }
      else if (section==='donations')    { openDonationForm && openDonationForm(null, null, {courseId}); }
    });
  }
}

function openCourseForm(existingId, table) {
  const existing = existingId ? Store.getById('courses', existingId) : null;
  const overlay = document.createElement('div'); overlay.className = 'modal-overlay open';
  overlay.innerHTML = `
    <div class="modal" style="max-width:680px">
      <div class="modal-header"><span class="modal-title">${existing?'Edit Course':'New Course / Club'}</span><button class="drawer-close" id="cf-c">${Icons.close}</button></div>
      <div class="modal-body" style="max-height:72vh;overflow-y:auto">
        <div class="form-grid">
          <div class="form-group form-full"><label class="form-label">Course Name *</label><input class="input" id="cf-name" value="${existing?.name||''}" placeholder="e.g. Pebble Beach Golf Links"></div>
          <div class="form-group"><label class="form-label">Type</label><select class="select" id="cf-type"><option value="">—</option>${Store.COURSE_TYPES.map(t=>`<option ${existing?.type===t?'selected':''}>${t}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">Tier</label><select class="select" id="cf-tier"><option value="">—</option>${Store.COURSE_TIERS.map(t=>`<option ${existing?.tier===t?'selected':''}>${t}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">Status</label><select class="select" id="cf-status">${Store.STATUS.courses.map(s=>`<option ${(existing?.status||'Active')===s?'selected':''}>${s}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">Website</label><input class="input" id="cf-website" value="${existing?.website||''}" placeholder="example.com"></div>
          <div class="form-group form-full"><label class="form-label">Address</label><input class="input" id="cf-address" value="${existing?.address||''}" placeholder="Street address"></div>
          <div class="form-group"><label class="form-label">City</label><input class="input" id="cf-city" value="${existing?.city||''}" placeholder="City"></div>
          <div class="form-group"><label class="form-label">State</label><input class="input" id="cf-state" value="${existing?.state||''}" placeholder="State"></div>
          <div class="form-group"><label class="form-label">Region</label><select class="select" id="cf-region"><option value="">—</option>${Store.COURSE_REGIONS.map(r=>`<option ${existing?.region===r?'selected':''}>${r}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">Contact Name</label><input class="input" id="cf-contactName" value="${existing?.contactName||''}" placeholder="Full name"></div>
          <div class="form-group"><label class="form-label">Contact Email</label><input class="input" id="cf-contactEmail" type="email" value="${existing?.contactEmail||''}" placeholder="email@example.com"></div>
          <div class="form-group"><label class="form-label">Contact Phone</label><input class="input" id="cf-contactPhone" type="tel" value="${existing?.contactPhone||''}" placeholder="(555) 000-0000"></div>
          <div class="form-group form-full"><label class="form-label">Notes</label><textarea class="input" id="cf-notes" rows="2" placeholder="Internal notes...">${existing?.notes||''}</textarea></div>
        </div>
      </div>
      <div class="modal-footer"><button class="btn btn-secondary" id="cf-cancel">Cancel</button><button class="btn btn-primary" id="cf-submit">${Icons.plus} ${existing?'Save Changes':'Create Course'}</button></div>
    </div>`;
  document.body.appendChild(overlay);
  const close=()=>overlay.remove();
  overlay.querySelector('#cf-c').onclick=close; overlay.querySelector('#cf-cancel').onclick=close;
  overlay.querySelector('#cf-submit').onclick=()=>{
    const name=overlay.querySelector('#cf-name').value.trim();
    if(!name){Toast.error('Course name required');return;}
    const data={name,type:overlay.querySelector('#cf-type').value,tier:overlay.querySelector('#cf-tier').value,status:overlay.querySelector('#cf-status').value,website:overlay.querySelector('#cf-website').value.trim(),address:overlay.querySelector('#cf-address').value.trim(),city:overlay.querySelector('#cf-city').value.trim(),state:overlay.querySelector('#cf-state').value.trim(),region:overlay.querySelector('#cf-region').value,contactName:overlay.querySelector('#cf-contactName').value.trim(),contactEmail:overlay.querySelector('#cf-contactEmail').value.trim(),contactPhone:overlay.querySelector('#cf-contactPhone').value.trim(),notes:overlay.querySelector('#cf-notes').value.trim()};
    if(existing){Store.update('courses',existing.id,data);Toast.success('Course updated');}
    else{const r=Store.create('courses',data);Toast.success(`Course created: ${r.id}`);}
    close(); if(table)table.refresh();
  };
}

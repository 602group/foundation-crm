/**
 * EPIC Foundation CRM — Settings & Admin Page (Chunk 8 Full Rebuild)
 * 5 Tabs: Admin Users | Permissions | System Settings | Status Reference | Audit Log
 */

function renderAdmin(params = {}) {
  const main = document.getElementById('main');
  const session = typeof Auth !== 'undefined' ? Auth.getSession() : null;
  const isSuperAdmin = session?.role === 'Super Admin';

  let activeTab = params.tab || 'admins';

  const TABS = [
    { key: 'admins',   label: '👥 Admin Users' },
    { key: 'perms',    label: '🔐 Permissions' },
    { key: 'settings', label: '⚙️ System Settings' },
    { key: 'statuses', label: '🏷 Status Reference' },
    { key: 'audit',    label: '📋 Audit Log',  superAdminOnly: false },
  ];

  main.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <span class="page-title">Settings &amp; Admin</span>
        <span class="page-subtitle">Admin users, permissions, and system configuration</span>
      </div>
      <div class="page-header-right" id="admin-page-actions"></div>
    </div>
    <div class="page-content">
      <div class="tab-bar" style="margin-bottom:var(--space-5)">
        ${TABS.filter(t => !t.superAdminOnly || isSuperAdmin).map(t =>
          `<button class="tab-btn ${activeTab===t.key?'active':''}" data-tab="${t.key}">${t.label}</button>`
        ).join('')}
      </div>
      <div id="admin-tab-body"></div>
    </div>
  `;

  document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab;
      document.querySelectorAll('.tab-btn[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === activeTab));
      renderAdminTab();
    });
  });

  function renderAdminTab() {
    const body = document.getElementById('admin-tab-body');
    if (!body) return;
    const actionsEl = document.getElementById('admin-page-actions');
    if (actionsEl) actionsEl.innerHTML = '';
    if (activeTab === 'admins')   renderAdminUsersTab(body, actionsEl);
    if (activeTab === 'perms')    renderPermissionsTab(body);
    if (activeTab === 'settings') renderSystemSettingsTab(body);
    if (activeTab === 'statuses') renderStatusReferenceTab(body);
    if (activeTab === 'audit')    renderAuditLogTab(body, actionsEl);
  }

  renderAdminTab();
  if (params.open) setTimeout(() => openAdminDrawer(params.open), 100);

  // ════════════════════════════════════════════════════════════════════
  // TAB 1: ADMIN USERS
  // ════════════════════════════════════════════════════════════════════
  function renderAdminUsersTab(body, actionsEl) {
    body.innerHTML = `<div id="admins-table-wrap"></div>`;
    if (actionsEl) {
      actionsEl.innerHTML = `<button class="btn btn-primary" id="new-admin-btn">${Icons.plus} New Admin User</button>`;
      document.getElementById('new-admin-btn').addEventListener('click', () => openAdminForm(null));
    }

    const table = new CRMTable({
      containerId: 'admins-table-wrap',
      tableName: 'admins',
      searchFields: ['id', 'name', 'email', 'role'],
      filterDefs: [
        { field: 'status', label: 'All Statuses', options: Store.STATUS.admins },
        { field: 'role',   label: 'All Roles',    options: Store.ADMIN_ROLES },
      ],
      defaultSort: 'name',
      columns: [
        { field: 'id',        label: 'Admin ID',  width: '110px', sortable: false },
        { field: 'name',      label: 'Name',       sortable: true },
        { field: 'email',     label: 'Email',      sortable: true },
        { field: 'role',      label: 'Role',       sortable: true, render: row =>
          `<span class="tag tag-accent">${row.role || '—'}</span>` },
        { field: 'status',    label: 'Status',     sortable: true, isStatus: true },
        { field: 'lastLogin', label: 'Last Login', sortable: true, render: row =>
          row.lastLogin ? `<span style="font-size:var(--text-xs);color:var(--text-muted)">${Store.formatDateTime(row.lastLogin)}</span>` : '<span style="color:var(--text-muted)">Never</span>' },
      ],
      onRowClick: id => openAdminDrawer(id),
    });
    table.render();
  }

  // ════════════════════════════════════════════════════════════════════
  // ADMIN DRAWER
  // ════════════════════════════════════════════════════════════════════
  const PERM_SECTIONS = [
    { key: 'dashboard',     label: 'Dashboard' },
    { key: 'users',         label: 'Users' },
    { key: 'auctions',      label: 'Auctions' },
    { key: 'opportunities', label: 'Special Opps' },
    { key: 'donations',     label: 'Donations' },
    { key: 'courses',       label: 'Courses' },
    { key: 'tasks',         label: 'Tasks' },
    { key: 'financials',    label: 'Financials' },
    { key: 'messages',      label: 'Messages' },
    { key: 'events',        label: 'Events' },
    { key: 'imports',       label: 'Imports/Exports' },
    { key: 'admin',         label: 'Settings/Admin' },
  ];
  const PERM_ACTIONS = ['view','create','edit','delete','export','import'];

  function parsePermString(str) {
    if (!str) return {};
    const parts = str.split(',').map(s => s.trim());
    const obj = {};
    parts.forEach(p => { if (p) obj[p] = true; });
    return obj;
  }

  function buildPermString(obj) {
    return Object.keys(obj).filter(k => obj[k]).join(',');
  }

  function hasPerm(permsObj, section, action) {
    if (!permsObj) return false;
    if (permsObj._all) return true;
    const str = permsObj[section] || '';
    return str.split(',').map(s=>s.trim()).includes(action);
  }

  function openAdminDrawer(id) {
    const drawer = new RecordDrawer({ tabs: ['Details', 'Permissions', 'Activity'] });
    let record = Store.getById('admins', id);
    if (!record) return;
    let formData = { ...record };
    let localPerms = { ...(record.permissions || {}) };
    const viewerIsSuper = isSuperAdmin;
    const targetIsSuper = record.role === 'Super Admin';
    const canEdit = viewerIsSuper || (!targetIsSuper && session?.role === 'Admin');

    drawer.open({
      recordId: record.id,
      title: record.name,
      subtitle: record.role,
      tabs: ['Details', 'Permissions', 'Activity'],
      tabRenderer: (body, tab, editMode) => {
        record = Store.getById('admins', id) || record;

        if (tab === 'Details') {
          const locked = !canEdit && !editMode;
          body.innerHTML = `
            <div class="drawer-section">
              <div class="drawer-section-title">Admin Details</div>
              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label">Full Name</label>
                  ${editMode && canEdit ? `<input class="input" id="adm-name" value="${record.name||''}">` : `<div class="drawer-field-value">${record.name||'—'}</div>`}
                </div>
                <div class="form-group">
                  <label class="form-label">Email</label>
                  ${editMode && canEdit ? `<input class="input" id="adm-email" type="email" value="${record.email||''}">` : `<a href="mailto:${record.email}" style="color:var(--accent)">${record.email||'—'}</a>`}
                </div>
                <div class="form-group">
                  <label class="form-label">Role</label>
                  ${editMode && canEdit ? `<select class="select" id="adm-role">${Store.ADMIN_ROLES.map(r=>`<option ${record.role===r?'selected':''}>${r}</option>`).join('')}</select>` : `<span class="tag tag-accent">${record.role||'—'}</span>`}
                </div>
                <div class="form-group">
                  <label class="form-label">Status</label>
                  ${editMode && canEdit ? `<select class="select" id="adm-status">${Store.STATUS.admins.map(s=>`<option ${record.status===s?'selected':''}>${s}</option>`).join('')}</select>` : StatusBadge.render(record.status)}
                </div>
                ${editMode && canEdit ? `
                  <div class="form-group" style="grid-column:1/-1">
                    <label class="form-label">Set / Change Password <span style="color:var(--text-muted);font-weight:normal">(leave blank to keep current)</span></label>
                    <input class="input" id="adm-password" type="password" placeholder="New password…">
                  </div>
                ` : ''}
              </div>
              <div style="margin-top:var(--space-4);font-size:var(--text-xs);color:var(--text-muted)">
                ID: <code>${record.id}</code> · Created: ${Store.formatDate(record.createdAt)} · Last Login: ${record.lastLogin ? Store.formatDateTime(record.lastLogin) : 'Never'}
              </div>
            </div>
          `;
          if (editMode && canEdit) {
            ['name','email','role','status'].forEach(f => {
              const el = body.querySelector(`#adm-${f}`);
              if (el) el.addEventListener(el.tagName==='SELECT'?'change':'input', () => formData[f] = el.value);
            });
          }
        }

        else if (tab === 'Permissions') {
          const perms = localPerms;
          const isAll = perms._all;

          body.innerHTML = `
            <div class="drawer-section">
              <div class="drawer-section-title">
                Section Permissions
                <span style="font-size:var(--text-xs);color:var(--text-muted);font-weight:normal;margin-left:var(--space-3)">
                  ${isAll ? '⚡ Super Admin — all permissions' : 'Check to grant access'}
                </span>
              </div>
              ${isAll ? `<div style="padding:var(--space-4);background:var(--status-green-bg);border-radius:var(--radius-md);color:var(--status-green);font-size:var(--text-sm)">
                ⚡ This is a Super Admin. They have unrestricted access to everything.
              </div>` : `
              <div class="permissions-grid">
                <div class="perm-grid-header">
                  <span>Section</span>
                  ${PERM_ACTIONS.map(a => `<span>${a.charAt(0).toUpperCase()+a.slice(1)}</span>`).join('')}
                </div>
                ${PERM_SECTIONS.map(sec => {
                  const secPerms = parsePermString(perms[sec.key] || '');
                  return `<div class="perm-grid-row" data-section="${sec.key}">
                    <span class="perm-section-label">${sec.label}</span>
                    ${PERM_ACTIONS.map(action => `
                      <div><input type="checkbox" class="perm-check" data-section="${sec.key}" data-action="${action}"
                        ${secPerms[action] ? 'checked' : ''}
                        ${!editMode || !canEdit ? 'disabled' : ''}
                      ></div>
                    `).join('')}
                  </div>`;
                }).join('')}
              </div>
              ${editMode && canEdit ? `
                <div style="margin-top:var(--space-4);display:flex;gap:var(--space-3)">
                  <button class="btn btn-secondary btn-sm" id="perm-grant-all">Grant All View</button>
                  <button class="btn btn-ghost btn-sm" id="perm-clear-all" style="color:var(--status-red)">Clear All</button>
                </div>` : ''}
              `}
            </div>
          `;

          if (editMode && canEdit && !isAll) {
            // Listen for checkbox changes
            body.querySelectorAll('.perm-check').forEach(cb => {
              cb.addEventListener('change', () => {
                const sec = cb.dataset.section;
                const act = cb.dataset.action;
                const cur = parsePermString(localPerms[sec] || '');
                cur[act] = cb.checked;
                if (!cb.checked) delete cur[act];
                localPerms[sec] = buildPermString(cur);
              });
            });

            // Grant all view shortcut
            body.querySelector('#perm-grant-all')?.addEventListener('click', () => {
              PERM_SECTIONS.forEach(sec => {
                const cur = parsePermString(localPerms[sec.key] || '');
                cur.view = true;
                localPerms[sec.key] = buildPermString(cur);
              });
              body.querySelectorAll('.perm-check[data-action="view"]').forEach(cb => { cb.checked = true; });
            });

            // Clear all shortcut
            body.querySelector('#perm-clear-all')?.addEventListener('click', () => {
              PERM_SECTIONS.forEach(sec => { localPerms[sec.key] = ''; });
              body.querySelectorAll('.perm-check').forEach(cb => { cb.checked = false; });
            });
          }
        }

        else if (tab === 'Activity') {
          body.innerHTML = renderActivityLog(record.activityLog);
        }
      },

      onSave: async () => {
        if (!canEdit) { Toast.error('Permission denied'); return; }
        const updates = { ...formData, permissions: localPerms };
        // Handle password change
        const pwEl = document.getElementById('adm-password');
        if (pwEl && pwEl.value.trim()) {
          if (typeof Auth !== 'undefined') {
            updates.passwordHash = await Auth.hashPassword(pwEl.value.trim());
          }
        }
        Store.update('admins', id, updates);
        Store.logAudit('permissions_updated', 'admins', id);
        Toast.success('Admin user updated');
        document.querySelectorAll('.nav-item').forEach(n => n.style.display = '');
        Auth?.applyPermissions?.();
      },

      onDelete: async () => {
        if (!canEdit) { Toast.error('Permission denied'); return; }
        if (record.role === 'Super Admin' && !isSuperAdmin) { Toast.error('Cannot delete Super Admin'); return; }
        Store.remove('admins', id);
        Toast.success('Admin deleted');
      },
    });
  }

  // ════════════════════════════════════════════════════════════════════
  // ADMIN CREATE / EDIT FORM
  // ════════════════════════════════════════════════════════════════════
  function openAdminForm(existingId) {
    const existing = existingId ? Store.getById('admins', existingId) : null;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay open';
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title">${existing ? 'Edit Admin User' : 'New Admin User'}</span>
          <button class="drawer-close" id="modal-close">${Icons.close}</button>
        </div>
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Full Name *</label>
              <input class="input" id="af-name" value="${existing?.name||''}" placeholder="Full name">
            </div>
            <div class="form-group">
              <label class="form-label">Email *</label>
              <input class="input" id="af-email" type="email" value="${existing?.email||''}" placeholder="admin@epicfoundation.com">
            </div>
            <div class="form-group">
              <label class="form-label">Role</label>
              <select class="select" id="af-role">
                ${Store.ADMIN_ROLES.map(r => `<option ${(existing?.role||'Admin')===r?'selected':''}>${r}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Status</label>
              <select class="select" id="af-status">
                ${Store.STATUS.admins.map(s => `<option ${(existing?.status||'Active')===s?'selected':''}>${s}</option>`).join('')}
              </select>
            </div>
            <div class="form-group" style="grid-column:1/-1">
              <label class="form-label">Password ${existing ? '(leave blank to keep current)' : '*'}</label>
              <input class="input" id="af-password" type="password" placeholder="${existing ? 'New password (optional)' : 'Set a password'}">
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="modal-cancel">Cancel</button>
          <button class="btn btn-primary" id="modal-submit">${Icons.plus} ${existing ? 'Save Changes' : 'Create Admin'}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.querySelector('#modal-close').onclick = close;
    overlay.querySelector('#modal-cancel').onclick = close;

    overlay.querySelector('#modal-submit').onclick = async () => {
      const name  = overlay.querySelector('#af-name').value.trim();
      const email = overlay.querySelector('#af-email').value.trim();
      const role  = overlay.querySelector('#af-role').value;
      const status = overlay.querySelector('#af-status').value;
      const pw   = overlay.querySelector('#af-password').value;
      if (!name) { Toast.error('Name is required'); return; }
      if (!email) { Toast.error('Email is required'); return; }

      let passwordHash = existing?.passwordHash ?? null;
      if (pw && typeof Auth !== 'undefined') {
        passwordHash = await Auth.hashPassword(pw);
      }

      const roleDefaults = typeof Auth !== 'undefined' ? Auth.ROLE_DEFAULTS[role] || {} : {};
      const data = { name, email, role, status, passwordHash, permissions: roleDefaults, lastLogin: null };

      if (existing) {
        Store.update('admins', existing.id, data);
        Toast.success('Admin updated');
      } else {
        const r = Store.create('admins', data);
        Store.logAudit('admin_created', 'admins', r.id);
        Toast.success(`Admin created: ${r.id}`);
      }
      close();
      renderAdminUsersTab(document.getElementById('admin-tab-body'), document.getElementById('admin-page-actions'));
    };
  }

  // ════════════════════════════════════════════════════════════════════
  // TAB 2: PERMISSIONS REFERENCE
  // ════════════════════════════════════════════════════════════════════
  function renderPermissionsTab(body) {
    const roleDefaults = typeof Auth !== 'undefined' ? Auth.ROLE_DEFAULTS : {};
    const roles = Store.ADMIN_ROLES;

    body.innerHTML = `
      <div class="feed-card">
        <div class="feed-card-header">Role Permission Reference</div>
        <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--space-4)">
          These are the default permissions applied when creating a new admin with a given role.
          Individual admins can have custom permissions set in their profile.
        </div>
        <div class="permissions-grid">
          <div class="perm-grid-header">
            <span>Section</span>
            ${roles.map(r => `<span style="white-space:nowrap">${r}</span>`).join('')}
          </div>
          ${PERM_SECTIONS.map(sec => `
            <div class="perm-grid-row">
              <span class="perm-section-label">${sec.label}</span>
              ${roles.map(role => {
                const perms = roleDefaults[role] || {};
                if (perms._all) return `<span style="color:var(--status-green);font-size:var(--text-xs)">⚡ All</span>`;
                const str = perms[sec.key] || '';
                if (!str) return `<span style="color:var(--text-muted);font-size:var(--text-xs)">—</span>`;
                const actions = str.split(',').filter(Boolean);
                return `<span style="font-size:10px;color:var(--text-secondary)">${actions.join(', ')}</span>`;
              }).join('')}
            </div>
          `).join('')}
        </div>
      </div>

      <div style="margin-top:var(--space-5);display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4)">
        <div class="feed-card">
          <div class="feed-card-header">Data Management</div>
          <div style="display:flex;flex-direction:column;gap:var(--space-3)">
            <div style="padding:var(--space-3);background:var(--bg-elevated);border:var(--border-subtle);border-radius:var(--radius-md)">
              <div style="font-size:var(--text-sm);font-weight:var(--fw-medium);margin-bottom:4px">Reset Seed Data</div>
              <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--space-3)">Re-run seed records. Existing real records are not deleted.</div>
              <button class="btn btn-secondary btn-sm" id="btn-reseed">Reset &amp; Reload Seed</button>
            </div>
            <div style="padding:var(--space-3);background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.2);border-radius:var(--radius-md)">
              <div style="font-size:var(--text-sm);font-weight:var(--fw-medium);color:var(--status-green);margin-bottom:4px">Mass Export Everything</div>
              <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--space-3)">Export all system data (Users, Auctions, Opportunities, Donations, Courses, Tasks, Financials, Messages, Events) as individual CSV files.</div>
              <button class="btn btn-secondary btn-sm" id="btn-mass-export">${Icons.download} Mass Export Everything</button>
            </div>
            <div style="padding:var(--space-3);background:rgba(59,130,246,0.06);border:1px solid rgba(59,130,246,0.15);border-radius:var(--radius-md)">
              <div style="font-size:var(--text-sm);font-weight:var(--fw-medium);color:var(--status-blue);margin-bottom:4px">Deduplicate Courses</div>
              <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--space-3)">Find duplicate course records with the same name and merge all linked records (auctions, donations, opportunities) to one canonical course.</div>
              <button class="btn btn-secondary btn-sm" id="btn-dedup-courses">Deduplicate Courses</button>
            </div>
          </div>
        </div>
        <div class="feed-card">
          <div class="feed-card-header">System Information</div>
          <div style="display:flex;flex-direction:column;gap:var(--space-3)">
            ${[
              { label: 'Platform', value: 'Epic Foundation CRM' },
              { label: 'Version', value: 'v8 — Full Platform' },
              { label: 'Persistence', value: 'Browser localStorage' },
              { label: 'Auth', value: 'SHA-256 Session Auth' },
              { label: 'Build Date', value: new Date().toLocaleDateString('en-US') },
            ].map(item => `
              <div style="display:flex;justify-content:space-between;font-size:var(--text-sm)">
                <span style="color:var(--text-muted)">${item.label}</span>
                <span style="color:var(--text-secondary);font-weight:var(--fw-medium)">${item.value}</span>
              </div>
            `).join('')}
            <div style="border-top:var(--border-subtle);padding-top:var(--space-3);margin-top:var(--space-2)">
              ${Object.keys(Store.TABLES).filter(t=>!['counters','settings'].includes(t)).map(t=>`
                <div style="display:flex;justify-content:space-between;font-size:var(--text-xs);padding:2px 0">
                  <span style="color:var(--text-muted);font-family:var(--font-mono)">${t}</span>
                  <span style="color:var(--text-muted)">${Store.getAll(t).length} records</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-reseed')?.addEventListener('click', async () => {
      const ok = await Confirm.show('This will re-run seed data. Existing records are not deleted.', 'Reload Seed Data');
      if (ok) {
        localStorage.removeItem('crm_seeded_v7');
        Seed.run();
        Seed.deduplicateAll(); // collapse any duplicates immediately
        Toast.success('Seed data reloaded and deduplicated');
        Router.navigate('dashboard');
      }
    });

    document.getElementById('btn-mass-export')?.addEventListener('click', () => {
      if (typeof ExcelJS === 'undefined') {
        Toast.error('Excel library error. Check connection.');
        return;
      }

      const TABLES = [
        { table: 'users', label: 'Users', icon: '👤' },
        { table: 'auctions', label: 'Auctions', icon: '🏌️' },
        { table: 'opportunities', label: 'Special Opportunities', icon: '⭐' },
        { table: 'donations', label: 'Donations', icon: '🤝' },
        { table: 'courses', label: 'Courses', icon: '📍' },
        { table: 'tasks', label: 'Tasks', icon: '✅' },
        { table: 'financials', label: 'Financials', icon: '💰' },
        { table: 'messages', label: 'Messages', icon: '💬' },
        { table: 'events', label: 'Events', icon: '📅' },
      ];

      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay open';
      
      const checkBoxesHtml = TABLES.map(item => `
        <label style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3);background:var(--bg-surface);border:1px solid var(--border-subtle);border-radius:var(--radius-sm);cursor:pointer;transition:border-color 0.2s">
          <input type="checkbox" class="export-checkbox" value="${item.table}" data-label="${item.label}" checked style="width:16px;height:16px;cursor:pointer">
          <span style="font-size:1.2em">${item.icon}</span>
          <span style="font-size:var(--text-sm);font-weight:var(--fw-medium);color:var(--text-primary)">${item.label}</span>
        </label>
      `).join('');

      overlay.innerHTML = `
        <div class="modal" style="max-width:500px">
          <div class="modal-header">
            <span class="modal-title">Select Modules to Export</span>
            <button class="drawer-close" id="export-modal-close">✕</button>
          </div>
          <div class="modal-body" style="padding:var(--space-4)">
            <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--space-4)">
              Check each module you want to include as a separate tab in your downloaded Excel file.
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:var(--space-3)">
              <button class="btn btn-ghost btn-sm" id="export-check-all" style="color:var(--accent)">Select All</button>
              <button class="btn btn-ghost btn-sm" id="export-uncheck-all" style="color:var(--text-muted)">Unselect All</button>
            </div>
            <div style="display:flex;flex-direction:column;gap:var(--space-2);max-height:400px;overflow-y:auto;padding-right:4px">
              ${checkBoxesHtml}
            </div>
          </div>
          <div class="modal-footer" style="padding:var(--space-4);border-top:1px solid var(--border-subtle)">
            <button class="btn btn-secondary" id="export-modal-cancel">Cancel</button>
            <button class="btn btn-primary" id="export-modal-submit">📥 Generate Excel File</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      const close = () => overlay.remove();
      overlay.querySelector('#export-modal-close').onclick = close;
      overlay.querySelector('#export-modal-cancel').onclick = close;

      const checkboxes = overlay.querySelectorAll('.export-checkbox');
      overlay.querySelector('#export-check-all').onclick = () => checkboxes.forEach(cb => cb.checked = true);
      overlay.querySelector('#export-uncheck-all').onclick = () => checkboxes.forEach(cb => cb.checked = false);

      overlay.querySelector('#export-modal-submit').onclick = async () => {
        const selected = Array.from(checkboxes).filter(cb => cb.checked).map(cb => ({
          key: cb.value,
          label: cb.dataset.label
        }));

        if (selected.length === 0) {
          Toast.error('Please select at least one module to export.');
          return;
        }

        const submitBtn = overlay.querySelector('#export-modal-submit');
        submitBtn.innerHTML = '⏳ Generating...';
        submitBtn.disabled = true;

        try {
          const workbook = new ExcelJS.Workbook();
          workbook.creator = 'Epic Foundation CRM';
          workbook.created = new Date();

          for (const t of selected) {
            const records = Store.getAll(t.key);
            if (!records.length) {
              const emptySheet = workbook.addWorksheet(t.label);
              emptySheet.getCell('A1').value = 'No records found for this module.';
              continue;
            }

            const sheet = workbook.addWorksheet(t.label);
            const firstRec = records[0];
            const keys = Object.keys(firstRec).filter(k => k !== 'activityLog' && k !== 'passwordHash');
            
            sheet.columns = keys.map(k => ({
              header: k,
              key: k,
              width: Math.max(k.length + 5, 15)
            }));
            
            sheet.getRow(1).font = { bold: true };
            sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAF0F6' } };

            records.forEach(r => {
              const rowData = {};
              keys.forEach(k => {
                let val = r[k];
                if (Array.isArray(val)) val = val.join(', ');
                if (!isNaN(val) && val !== '' && val !== null && typeof val !== 'boolean' && !k.toLowerCase().includes('phone') && !k.toLowerCase().includes('id')) {
                  val = Number(val);
                }
                rowData[k] = val;
              });
              sheet.addRow(rowData);
            });

            // Financials Logic (adding SUM formulas)
            if (t.key === 'financials') {
              const rowCount = records.length;
              const summaryRowIdx = rowCount + 3; // Leave a blank row
              
              sheet.getCell(`A${summaryRowIdx}`).value = 'TOTALS (VIA FORMULA)';
              sheet.getCell(`A${summaryRowIdx}`).font = { bold: true };

              keys.forEach((k, colIndex) => {
                if (['fmv', 'salePrice', 'estimatedRevenue', 'actualRevenue'].includes(k)) {
                  const colLetter = sheet.getColumn(colIndex + 1).letter;
                  const cell = sheet.getCell(`${colLetter}${summaryRowIdx}`);
                  cell.value = { formula: `SUM(${colLetter}2:${colLetter}${rowCount + 1})` };
                  cell.font = { bold: true, color: { argb: 'FF0D9488' } }; 
                  cell.numFmt = '"$"#,##0.00';
                  
                  for(let r=2; r<=rowCount+1; r++) {
                    sheet.getCell(`${colLetter}${r}`).numFmt = '"$"#,##0.00';
                  }
                }
              });
            }
          }

          const buffer = await workbook.xlsx.writeBuffer();
          const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          const url = URL.createObjectURL(blob);
          
          const a = document.createElement('a');
          a.href = url;
          a.download = `Epic-Foundation-Custom-${new Date().toISOString().split('T')[0]}.xlsx`;
          a.click();
          URL.revokeObjectURL(url);
          
          Store.logAudit('mass_export_excel', 'system', `exported ${selected.length} tables`);
          Toast.success('Excel workbook exported successfully!');
          close();
        } catch (e) {
          console.error('Excel Export Error:', e);
          Toast.error('Export failed: ' + e.message);
          submitBtn.innerHTML = '📥 Generate Excel File';
          submitBtn.disabled = false;
        }
      };
    });

    document.getElementById('btn-dedup-courses')?.addEventListener('click', async () => {
      const courses = Store.getAll('courses');
      // Group by normalized name
      const groups = {};
      courses.forEach(c => {
        const key = (c.name || '').trim().toLowerCase();
        if (!groups[key]) groups[key] = [];
        groups[key].push(c);
      });
      const dupeGroups = Object.values(groups).filter(g => g.length > 1);
      if (dupeGroups.length === 0) { Toast.success('No duplicate courses found!'); return; }
      const dupeCount = dupeGroups.reduce((sum, g) => sum + g.length - 1, 0);
      const ok = await Confirm.show(`Found ${dupeGroups.length} course name(s) with duplicates (${dupeCount} extra records). Merge all linked records to the oldest record and delete extras?`, 'Deduplicate Courses');
      if (!ok) return;
      let merged = 0;
      dupeGroups.forEach(group => {
        // Keep the oldest record (smallest createdAt), delete the rest
        group.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
        const [canonical, ...extras] = group;
        extras.forEach(dup => {
          // Re-link auctions
          Store.getAll('auctions').filter(r => r.courseId === dup.id)
            .forEach(r => Store.update('auctions', r.id, { courseId: canonical.id }));
          // Re-link opportunities
          Store.getAll('opportunities').filter(r => r.courseId === dup.id)
            .forEach(r => Store.update('opportunities', r.id, { courseId: canonical.id }));
          // Re-link donations
          Store.getAll('donations').filter(r => r.courseId === dup.id)
            .forEach(r => Store.update('donations', r.id, { courseId: canonical.id }));
          // Re-link events
          Store.getAll('events').filter(r => r.courseId === dup.id)
            .forEach(r => Store.update('events', r.id, { courseId: canonical.id }));
          // Delete the duplicate
          Store.remove('courses', dup.id);
          merged++;
        });
      });
      Store.logAudit('courses_deduped', 'courses', `merged ${merged} duplicates`);
      Toast.success(`Done! Merged and removed ${merged} duplicate course record(s).`);
    });
  }

  // ════════════════════════════════════════════════════════════════════
  // TAB 3: SYSTEM SETTINGS
  // ════════════════════════════════════════════════════════════════════
  function renderSystemSettingsTab(body) {
    const settings = Store.getSettings();
    body.innerHTML = `
      <div class="feed-card" style="max-width:720px">
        <div class="feed-card-header">System Settings</div>
        <div style="display:flex;flex-direction:column;gap:var(--space-5)">

          <div class="form-group">
            <label class="form-label">Platform Name</label>
            <input class="input" id="set-platform-name" value="${settings.platformName||'Epic Foundation CRM'}" placeholder="Platform name">
          </div>

          <div class="form-group">
            <label class="form-label">Default Timezone</label>
            <select class="select" id="set-timezone">
              ${['America/New_York','America/Chicago','America/Denver','America/Los_Angeles','America/Phoenix',
                 'America/Anchorage','Pacific/Honolulu','UTC'].map(tz =>
                `<option value="${tz}" ${(settings.timezone||'America/Los_Angeles')===tz?'selected':''}>${tz}</option>`
              ).join('')}
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Date Format</label>
            <select class="select" id="set-date-format">
              <option value="MM/DD/YYYY" ${(settings.dateFormat||'MM/DD/YYYY')==='MM/DD/YYYY'?'selected':''}>MM/DD/YYYY</option>
              <option value="YYYY-MM-DD" ${settings.dateFormat==='YYYY-MM-DD'?'selected':''}>YYYY-MM-DD</option>
              <option value="DD/MM/YYYY" ${settings.dateFormat==='DD/MM/YYYY'?'selected':''}>DD/MM/YYYY</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Default Import Action</label>
            <select class="select" id="set-import-action">
              <option value="create" ${(settings.defaultImportAction||'create')==='create'?'selected':''}>Create new records only</option>
              <option value="both"   ${settings.defaultImportAction==='both'?'selected':''}>Create new + update existing</option>
              <option value="update" ${settings.defaultImportAction==='update'?'selected':''}>Update existing only</option>
            </select>
          </div>

          <div style="display:flex;align-items:center;gap:var(--space-3)">
            <input type="checkbox" id="set-auto-link" style="width:16px;height:16px;cursor:pointer" ${settings.autoCreateLinkedRecords?'checked':''}>
            <label for="set-auto-link" style="font-size:var(--text-sm);cursor:pointer;color:var(--text-secondary)">
              Auto-create linked records during import (e.g. donors, courses not found)
            </label>
          </div>

          <div style="display:flex;align-items:center;gap:var(--space-3)">
            <input type="checkbox" id="set-overdue-alerts" style="width:16px;height:16px;cursor:pointer" ${settings.overdueTaskAlerts!==false?'checked':''}>
            <label for="set-overdue-alerts" style="font-size:var(--text-sm);cursor:pointer;color:var(--text-secondary)">
              Show overdue task alerts on dashboard
            </label>
          </div>

          <div style="display:flex;align-items:center;gap:var(--space-3)">
            <input type="checkbox" id="set-audit-all" style="width:16px;height:16px;cursor:pointer" ${settings.auditAllChanges?'checked':''}>
            <label for="set-audit-all" style="font-size:var(--text-sm);cursor:pointer;color:var(--text-secondary)">
              Log all record updates to audit trail (in addition to create/delete)
            </label>
          </div>

          <div style="padding-top:var(--space-3);border-top:var(--border-subtle)">
            <button class="btn btn-primary" id="save-settings-btn">💾 Save Settings</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('save-settings-btn')?.addEventListener('click', () => {
      const newSettings = {
        platformName: document.getElementById('set-platform-name').value.trim() || 'Epic Foundation CRM',
        timezone: document.getElementById('set-timezone').value,
        dateFormat: document.getElementById('set-date-format').value,
        defaultImportAction: document.getElementById('set-import-action').value,
        autoCreateLinkedRecords: document.getElementById('set-auto-link').checked,
        overdueTaskAlerts: document.getElementById('set-overdue-alerts').checked,
        auditAllChanges: document.getElementById('set-audit-all').checked,
      };
      Store.saveSettings({ ...Store.getSettings(), ...newSettings });
      Store.logAudit('settings_updated', 'settings', 'system');
      Toast.success('Settings saved');
    });
  }

  // ════════════════════════════════════════════════════════════════════
  // TAB 4: STATUS REFERENCE
  // ════════════════════════════════════════════════════════════════════
  function renderStatusReferenceTab(body) {
    const tableNames = Object.keys(Store.STATUS).filter(t => !['counters','settings'].includes(t));
    body.innerHTML = `
      <div class="feed-card">
        <div class="feed-card-header">Status Reference</div>
        <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--space-4)">
          These are system-defined controlled status values. They are used throughout the platform for consistency.
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:var(--space-4)">
          ${tableNames.map(table => `
            <div style="background:var(--bg-elevated);border:var(--border-subtle);border-radius:var(--radius-md);padding:var(--space-4)">
              <div style="font-size:var(--text-xs);font-weight:var(--fw-semi);color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:var(--space-3)">
                ${table.charAt(0).toUpperCase() + table.slice(1)}
              </div>
              <div style="display:flex;flex-wrap:wrap;gap:var(--space-2)">
                ${Store.STATUS[table].map(s => StatusBadge.render(s)).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // ════════════════════════════════════════════════════════════════════
  // TAB 5: AUDIT LOG
  // ════════════════════════════════════════════════════════════════════
  function renderAuditLogTab(body, actionsEl) {
    if (actionsEl && isSuperAdmin) {
      actionsEl.innerHTML = `<button class="btn btn-ghost btn-sm" id="clear-audit-btn" style="color:var(--status-red)">Clear Audit Log</button>`;
      document.getElementById('clear-audit-btn')?.addEventListener('click', async () => {
        const ok = await Confirm.show('Clear the entire audit log? This cannot be undone.', 'Clear Audit Log');
        if (ok) {
          Store.clearAuditLog();
          Toast.success('Audit log cleared');
          renderAuditLogTab(body, actionsEl);
        }
      });
    }

    let filterTable = '';
    let filterAction = '';

    function renderLog() {
      const logs = Store.getAuditLog(200);
      let filtered = logs;
      if (filterTable) filtered = filtered.filter(l => l.tableName === filterTable);
      if (filterAction) filtered = filtered.filter(l => l.action === filterAction);

      const actionColors = {
        created: 'var(--status-green)', deleted: 'var(--status-red)',
        updated: 'var(--status-blue)', permissions_updated: 'var(--status-amber)',
        admin_created: 'var(--status-green)', settings_updated: 'var(--text-muted)',
      };
      const allTables = [...new Set(logs.map(l => l.tableName))].sort();
      const allActions = [...new Set(logs.map(l => l.action))].sort();

      body.innerHTML = `
        <div class="feed-card">
          <div class="feed-card-header">
            Audit Log
            <span style="font-size:var(--text-xs);color:var(--text-muted);font-weight:normal">${filtered.length} entries</span>
          </div>
          <div style="display:flex;gap:var(--space-3);margin-bottom:var(--space-4)">
            <select class="select" id="audit-filter-table" style="width:auto;min-width:140px">
              <option value="">All Tables</option>
              ${allTables.map(t => `<option value="${t}" ${filterTable===t?'selected':''}>${t}</option>`).join('')}
            </select>
            <select class="select" id="audit-filter-action" style="width:auto;min-width:140px">
              <option value="">All Actions</option>
              ${allActions.map(a => `<option value="${a}" ${filterAction===a?'selected':''}>${a}</option>`).join('')}
            </select>
          </div>
          ${filtered.length === 0
            ? `<div style="text-align:center;padding:var(--space-10);color:var(--text-muted)">No audit entries yet. Actions like creating, updating, and deleting records will appear here.</div>`
            : `<div class="table-container">
                <table class="crm-table" style="font-size:var(--text-xs)">
                  <thead><tr>
                    <th>Time</th><th>Actor</th><th>Action</th><th>Table</th><th>Record ID</th>
                  </tr></thead>
                  <tbody>
                    ${filtered.map(entry => `<tr class="audit-row">
                      <td style="color:var(--text-muted);white-space:nowrap">${new Date(entry.timestamp).toLocaleString()}</td>
                      <td style="font-weight:var(--fw-medium)">${entry.actor}</td>
                      <td><span style="color:${actionColors[entry.action]||'var(--text-secondary)'};font-weight:var(--fw-medium)">${entry.action}</span></td>
                      <td style="font-family:var(--font-mono)">${entry.tableName}</td>
                      <td style="font-family:var(--font-mono);color:var(--text-muted)">${entry.recordId||'—'}</td>
                    </tr>`).join('')}
                  </tbody>
                </table>
              </div>`
          }
        </div>
      `;

      body.querySelector('#audit-filter-table')?.addEventListener('change', e => {
        filterTable = e.target.value; renderLog();
      });
      body.querySelector('#audit-filter-action')?.addEventListener('change', e => {
        filterAction = e.target.value; renderLog();
      });
    }

    renderLog();
  }
}

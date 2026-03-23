/**
 * EPIC Foundation CRM — Marketing Section
 * Unified module with 5 internal tabs: Dashboard, Email Marketing, Social Media, Newsletter, Email Templates
 * All tabs live under the single route 'marketing' and switch via ?tab= param.
 */

// ─── MARKETING MODULE SHELL ───────────────────────────────────────────────────
const MKT_TABS = [
  { id: 'dashboard',  label: 'Marketing Dashboard' },
  { id: 'email',      label: 'Email Marketing' },
  { id: 'social',     label: 'Social Media' },
  { id: 'newsletter', label: 'Newsletter' },
];

function renderMarketingModule(params = {}) {
  const main = document.getElementById('main');
  if (!main) return;

  // Normalize tab — 'templates' now lives inside 'email'
  const rawTab = params.tab || 'dashboard';
  const activeTab = rawTab === 'templates' ? 'email' : rawTab;

  main.innerHTML = `
    <div class="marketing-module" id="mkt-module">
      <!-- Page header: title + subtitle + action button all on one bar -->
      <div class="mkt-module-header">
        <div class="mkt-module-header-left">
          <div class="mkt-module-title">Marketing</div>
          <div class="mkt-module-subtitle">Schedule, tasks, outreach and campaigns</div>
        </div>
        <div class="mkt-module-header-right" id="mkt-header-actions">
          <!-- Tab-specific buttons injected here after tab renders -->
        </div>
      </div>
      <!-- Tab bar -->
      <div class="mkt-tab-bar">
        ${MKT_TABS.map(t => `
          <div class="mkt-tab${t.id === activeTab ? ' active' : ''}" data-tab="${t.id}">${t.label}</div>
        `).join('')}
      </div>
      <div id="mkt-content" style="flex:1;display:flex;flex-direction:column;overflow:hidden"></div>
    </div>
  `;

  // Wire tab clicks
  document.querySelectorAll('.mkt-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tid = tab.dataset.tab;
      document.querySelectorAll('.mkt-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tid));
      Router.navigate(`marketing?tab=${tid}`);
      renderMktTab(tid);
    });
  });

  renderMktTab(activeTab);
}

function renderMktTab(tabId) {
  const container = document.getElementById('mkt-content');
  if (!container) return;

  container.innerHTML = '';

  const realMain = document.getElementById('main');
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'flex:1;display:flex;flex-direction:column;overflow:hidden';
  container.appendChild(wrapper);

  realMain.removeAttribute('id');
  wrapper.id = 'main';

  try {
    if      (tabId === 'dashboard')  renderMarketing({});
    else if (tabId === 'email')      renderEmailMarketingWithTemplates({});
    else if (tabId === 'social')     renderSocialMedia({});
    else if (tabId === 'newsletter') renderNewsletter({});
  } finally {
    wrapper.removeAttribute('id');
    realMain.id = 'main';
  }
}

// ─── LOCAL STORAGE HELPERS ───────────────────────────────────────────────────
const MktStore = {
  get: key => { try { return JSON.parse(localStorage.getItem(key) || 'null') || []; } catch { return []; } },
  set: (key, val) => localStorage.setItem(key, JSON.stringify(val)),
  getObj: key => { try { return JSON.parse(localStorage.getItem(key) || 'null') || {}; } catch { return {}; } },
  setObj: (key, val) => localStorage.setItem(key, JSON.stringify(val)),
  nextId: key => {
    const items = MktStore.get(key);
    return (Math.max(0, ...items.map(i => i._id || 0)) + 1);
  },
};

// ─── MARKETING DASHBOARD ─────────────────────────────────────────────────────
function renderMarketing(params = {}) {
  const main = document.getElementById('main');

  main.innerHTML = `
    <div class="page-content">
      <div class="marketing-grid">

        <!-- Left column: Tasks + Schedule -->
        <div style="display:flex;flex-direction:column;gap:var(--space-5)">

          <!-- Marketing Tasks -->
          <div class="mkt-card">
            <div class="mkt-card-title">
              <span>Marketing Tasks</span>
              <button class="btn btn-ghost btn-sm" id="mkt-new-task-btn">${Icons.plus} New</button>
            </div>
            <div id="mkt-tasks-list"></div>
          </div>

          <!-- Upcoming Schedule -->
          <div class="mkt-card">
            <div class="mkt-card-title">
              <span>Upcoming Schedule</span>
            </div>
            <div id="mkt-schedule-list"></div>
          </div>

        </div>

        <!-- Right column: Newsletter + Quick Links -->
        <div style="display:flex;flex-direction:column;gap:var(--space-5)">

          <!-- Newsletter Contacts -->
          <div class="mkt-card">
            <div class="mkt-card-title"><span>Newsletter Contacts</span></div>
            <div class="newsletter-count-box" id="newsletter-count-box">
              <div class="newsletter-count-num" id="newsletter-count-num">0</div>
              <div class="newsletter-count-label">Active email contacts</div>
              <div style="margin-top:var(--space-2);font-size:var(--text-xs);color:var(--text-muted)">Click to view all →</div>
            </div>
          </div>

          <!-- Quick Links -->
          <div class="mkt-card">
            <div class="mkt-card-title"><span>Quick Links</span></div>
            <div style="display:flex;flex-direction:column;gap:var(--space-2)">
              <button class="btn btn-ghost btn-sm" style="justify-content:flex-start" onclick="Router.navigate('marketing?tab=email')">Email Marketing</button>
              <button class="btn btn-ghost btn-sm" style="justify-content:flex-start" onclick="Router.navigate('marketing?tab=email')">Email Templates</button>
              <button class="btn btn-ghost btn-sm" style="justify-content:flex-start" onclick="Router.navigate('marketing?tab=social')">Social Media</button>
              <button class="btn btn-ghost btn-sm" style="justify-content:flex-start" onclick="Router.navigate('marketing?tab=newsletter')">Newsletter List</button>
            </div>
          </div>

        </div>
      </div>
    </div>
  `;

  // Inject Add Item button into the module header actions slot
  const actionsSlot = document.getElementById('mkt-header-actions');
  if (actionsSlot) {
    actionsSlot.innerHTML = `<button class="btn btn-primary" id="mkt-add-item-btn">${Icons.plus} Add Item</button>`;
    document.getElementById('mkt-add-item-btn')?.addEventListener('click', () => openMktScheduleForm());
  }

  // Newsletter count
  const users = Store.getAll('users');
  const emailContacts = users.filter(u => u.email && u.email.trim());
  const countEl = document.getElementById('newsletter-count-num');
  if (countEl) countEl.textContent = emailContacts.length;
  document.getElementById('newsletter-count-box')?.addEventListener('click', () => Router.navigate('marketing?tab=newsletter'));

  renderMktTasks();
  renderMktSchedule();
  document.getElementById('mkt-new-task-btn')?.addEventListener('click', () => openMktTaskForm());
}

function renderMktTasks() {
  const list = document.getElementById('mkt-tasks-list');
  if (!list) return;
  const tasks = Store.getAll('tasks')
    .filter(t => t.taskType === 'Marketing' || t.tags?.includes('marketing'))
    .sort((a, b) => (a.dueDate || '9') < (b.dueDate || '9') ? -1 : 1)
    .slice(0, 10);

  if (!tasks.length) {
    list.innerHTML = `<div style="color:var(--text-muted);font-size:var(--text-sm)">No marketing tasks yet. Create one to get started.</div>`;
    return;
  }

  list.innerHTML = tasks.map(t => `
    <div class="mkt-task-row" data-id="${t.id}">
      <input type="checkbox" class="mkt-task-check" ${t.status === 'Complete' ? 'checked' : ''} data-id="${t.id}">
      <span class="mkt-task-text ${t.status === 'Complete' ? 'done' : ''}">${t.title}</span>
      ${t.dueDate ? `<span style="font-size:var(--text-xs);color:var(--text-muted)">${t.dueDate}</span>` : ''}
    </div>
  `).join('');

  list.querySelectorAll('.mkt-task-check').forEach(cb => {
    cb.addEventListener('change', () => {
      const today = new Date().toISOString().split('T')[0];
      Store.update('tasks', cb.dataset.id, { status: cb.checked ? 'Complete' : 'Open', completedDate: cb.checked ? today : null });
      renderMktTasks();
    });
  });
}

function renderMktSchedule() {
  const list = document.getElementById('mkt-schedule-list');
  if (!list) return;
  const items = MktStore.get('crm_marketing_items')
    .sort((a, b) => (a.date || '9') < (b.date || '9') ? -1 : 1);

  if (!items.length) {
    list.innerHTML = `<div style="color:var(--text-muted);font-size:var(--text-sm)">No scheduled items yet. Click "Add Item" above.</div>`;
    return;
  }

  list.innerHTML = items.map(item => `
    <div class="mkt-schedule-item">
      <span class="mkt-schedule-date">${item.date || '—'}</span>
      <span class="mkt-schedule-title">${item.title}</span>
      ${item.priority ? `<span class="badge ${item.priority === 'High' ? 'badge-red' : item.priority === 'Medium' ? 'badge-amber' : 'badge-gray'}">${item.priority}</span>` : ''}
      <button class="btn btn-ghost btn-sm" style="padding:2px 6px" data-del="${item._id}" title="Remove">✕</button>
    </div>
  `).join('');

  list.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.del);
      const items = MktStore.get('crm_marketing_items').filter(i => i._id !== id);
      MktStore.set('crm_marketing_items', items);
      renderMktSchedule();
    });
  });
}

function openMktTaskForm() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay open';
  overlay.innerHTML = `
    <div class="modal" style="max-width:480px">
      <div class="modal-header"><span class="modal-title">New Marketing Task</span><button class="drawer-close" id="mt-close">${Icons.close}</button></div>
      <div class="modal-body">
        <div class="form-grid">
          <div class="form-group form-full"><label class="form-label">Task Title *</label><input class="input" id="mt-title" placeholder="What needs to be done?"></div>
          <div class="form-group"><label class="form-label">Due Date</label><input class="input" id="mt-due" type="date"></div>
          <div class="form-group"><label class="form-label">Priority</label>
            <select class="select" id="mt-priority">
              <option value="">—</option>
              ${Store.TASK_PRIORITIES.map(p => `<option>${p}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>
      <div class="modal-footer"><button class="btn btn-secondary" id="mt-cancel">Cancel</button><button class="btn btn-primary" id="mt-submit">${Icons.plus} Create Task</button></div>
    </div>
  `;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelector('#mt-close').onclick = close;
  overlay.querySelector('#mt-cancel').onclick = close;
  overlay.querySelector('#mt-submit').onclick = () => {
    const title = overlay.querySelector('#mt-title').value.trim();
    if (!title) { Toast.error('Title required'); return; }
    Store.create('tasks', {
      title,
      taskType: 'Marketing',
      status: 'Open',
      priority: overlay.querySelector('#mt-priority').value || 'Medium',
      dueDate: overlay.querySelector('#mt-due').value || null,
      tags: ['marketing'],
    });
    Toast.success('Marketing task created');
    close();
    renderMktTasks();
  };
}

function openMktScheduleForm() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay open';
  overlay.innerHTML = `
    <div class="modal" style="max-width:440px">
      <div class="modal-header"><span class="modal-title">Add Schedule Item</span><button class="drawer-close" id="ms-close">${Icons.close}</button></div>
      <div class="modal-body">
        <div class="form-grid">
          <div class="form-group form-full"><label class="form-label">Title *</label><input class="input" id="ms-title" placeholder="Campaign, post, email, etc."></div>
          <div class="form-group"><label class="form-label">Date</label><input class="input" id="ms-date" type="date"></div>
          <div class="form-group"><label class="form-label">Priority</label>
            <select class="select" id="ms-priority"><option value="">—</option><option>High</option><option>Medium</option><option>Low</option></select>
          </div>
        </div>
      </div>
      <div class="modal-footer"><button class="btn btn-secondary" id="ms-cancel">Cancel</button><button class="btn btn-primary" id="ms-submit">${Icons.plus} Add</button></div>
    </div>
  `;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelector('#ms-close').onclick = close;
  overlay.querySelector('#ms-cancel').onclick = close;
  overlay.querySelector('#ms-submit').onclick = () => {
    const title = overlay.querySelector('#ms-title').value.trim();
    if (!title) { Toast.error('Title required'); return; }
    const items = MktStore.get('crm_marketing_items');
    items.push({ _id: MktStore.nextId('crm_marketing_items'), title, date: overlay.querySelector('#ms-date').value, priority: overlay.querySelector('#ms-priority').value });
    MktStore.set('crm_marketing_items', items);
    Toast.success('Schedule item added');
    close();
    renderMktSchedule();
  };
}

// ─── EMAIL MARKETING ──────────────────────────────────────────────────────────
function renderEmailMarketing(params = {}) {
  const main = document.getElementById('main');
  const KEY = 'crm_marketing_email';

  function load() { return MktStore.get(KEY); }
  function save(items) { MktStore.set(KEY, items); }

  main.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <span class="page-title">Email Marketing</span>
        <span class="page-subtitle">Campaign ideas, draft content, and project notes</span>
      </div>
      <div class="page-header-right">
        <button class="btn btn-primary" id="em-new-btn">${Icons.plus} New Entry</button>
      </div>
    </div>
    <div class="page-content">
      <div id="em-list"></div>
    </div>
  `;

  function renderList() {
    const items = load();
    const el = document.getElementById('em-list');
    if (!el) return;
    if (!items.length) {
      el.innerHTML = `<div style="color:var(--text-muted);text-align:center;padding:var(--space-12)">No entries yet. Click "New Entry" to start planning email campaigns.</div>`;
      return;
    }
    el.innerHTML = `<div style="display:flex;flex-direction:column;gap:var(--space-3)">` + items.map(item => `
      <div class="mkt-card" style="position:relative">
        <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-3)">
          <span style="font-weight:var(--fw-semi);font-size:var(--text-md)">${item.title}</span>
          ${item.status ? `<span class="badge ${item.status === 'Draft' ? 'badge-amber' : item.status === 'Sent' ? 'badge-green' : 'badge-gray'}">${item.status}</span>` : ''}
          <div style="margin-left:auto;display:flex;gap:var(--space-2)">
            <button class="btn btn-ghost btn-sm em-del" data-id="${item._id}">✕</button>
          </div>
        </div>
        ${item.notes ? `<div style="font-size:var(--text-sm);color:var(--text-secondary);white-space:pre-wrap;border-top:var(--border-subtle);padding-top:var(--space-3)">${item.notes}</div>` : ''}
        <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:var(--space-2)">${item.date ? `Planned: ${item.date}` : ''}</div>
      </div>
    `).join('') + `</div>`;

    el.querySelectorAll('.em-del').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id);
        save(load().filter(i => i._id !== id));
        renderList();
        Toast.success('Entry removed');
      });
    });
  }

  renderList();

  document.getElementById('em-new-btn')?.addEventListener('click', () => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay open';
    overlay.innerHTML = `
      <div class="modal" style="max-width:560px">
        <div class="modal-header"><span class="modal-title">New Email Campaign Entry</span><button class="drawer-close" id="em-c">${Icons.close}</button></div>
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group form-full"><label class="form-label">Campaign Title *</label><input class="input" id="em-title" placeholder="e.g. Spring Golf Fundraiser Email"></div>
            <div class="form-group"><label class="form-label">Status</label>
              <select class="select" id="em-status"><option>Idea</option><option>Draft</option><option>Ready</option><option>Sent</option></select>
            </div>
            <div class="form-group"><label class="form-label">Planned Date</label><input class="input" id="em-date" type="date"></div>
            <div class="form-group form-full"><label class="form-label">Notes / Draft Content</label><textarea class="input" id="em-notes" rows="5" placeholder="Paste draft copy, ideas, subject lines…"></textarea></div>
          </div>
        </div>
        <div class="modal-footer"><button class="btn btn-secondary" id="em-cancel">Cancel</button><button class="btn btn-primary" id="em-submit">${Icons.plus} Save</button></div>
      </div>
    `;
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.querySelector('#em-c').onclick = close;
    overlay.querySelector('#em-cancel').onclick = close;
    overlay.querySelector('#em-submit').onclick = () => {
      const title = overlay.querySelector('#em-title').value.trim();
      if (!title) { Toast.error('Title required'); return; }
      const items = load();
      items.push({ _id: MktStore.nextId(KEY), title, status: overlay.querySelector('#em-status').value, date: overlay.querySelector('#em-date').value, notes: overlay.querySelector('#em-notes').value });
      save(items);
      close();
      renderList();
      Toast.success('Entry saved');
    };
  });
}

// ─── EMAIL TEMPLATES ──────────────────────────────────────────────────────────
function renderEmailTemplates(params = {}) {
  const main = document.getElementById('main');
  const KEY = 'crm_email_templates';

  function load() { return MktStore.get(KEY); }
  function save(items) { MktStore.set(KEY, items); }

  main.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <span class="page-title">Email Templates</span>
        <span class="page-subtitle">Reusable templates for donor outreach, event invitations, and campaigns</span>
      </div>
      <div class="page-header-right">
        <button class="btn btn-primary" id="et-new-btn">${Icons.plus} New Template</button>
      </div>
    </div>
    <div class="page-content">
      <div id="et-list"></div>
    </div>
  `;

  let editingId = null;

  function renderList() {
    const templates = load();
    const el = document.getElementById('et-list');
    if (!el) return;
    if (!templates.length) {
      el.innerHTML = `<div style="color:var(--text-muted);text-align:center;padding:var(--space-12)">No templates yet. Click "New Template" to create your first one.</div>`;
      return;
    }
    el.innerHTML = `<div style="display:flex;flex-direction:column;gap:var(--space-3)">` + templates.map(t => `
      <div class="mkt-card">
        <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-3)">
          <div style="flex:1">
            <div style="font-weight:var(--fw-semi);font-size:var(--text-md)">${t.title}</div>
            <div style="font-size:var(--text-sm);color:var(--text-muted)">${t.subject || 'No subject'}</div>
          </div>
          <button class="btn btn-ghost btn-sm et-edit" data-id="${t._id}">Edit</button>
          <button class="btn btn-ghost btn-sm et-copy" data-id="${t._id}" title="Copy body to clipboard">📋</button>
          <button class="btn btn-ghost btn-sm et-del" data-id="${t._id}">✕</button>
        </div>
        <div style="background:var(--bg-elevated);border:var(--border-subtle);border-radius:var(--radius-md);padding:var(--space-3);font-size:var(--text-sm);color:var(--text-secondary);white-space:pre-wrap;max-height:120px;overflow-y:auto">${t.body || '—'}</div>
      </div>
    `).join('') + `</div>`;

    el.querySelectorAll('.et-del').forEach(btn => {
      btn.addEventListener('click', async () => {
        const ok = await Confirm.show('Delete this template?', 'Delete Template');
        if (!ok) return;
        save(load().filter(i => i._id !== parseInt(btn.dataset.id)));
        renderList();
        Toast.success('Template deleted');
      });
    });

    el.querySelectorAll('.et-copy').forEach(btn => {
      btn.addEventListener('click', () => {
        const t = load().find(i => i._id === parseInt(btn.dataset.id));
        if (t) navigator.clipboard.writeText(t.body || '').then(() => Toast.success('Copied to clipboard'));
      });
    });

    el.querySelectorAll('.et-edit').forEach(btn => {
      btn.addEventListener('click', () => {
        editingId = parseInt(btn.dataset.id);
        const t = load().find(i => i._id === editingId);
        openTemplateForm(t);
      });
    });
  }

  function openTemplateForm(existing) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay open';
    overlay.innerHTML = `
      <div class="modal" style="max-width:640px">
        <div class="modal-header"><span class="modal-title">${existing ? 'Edit Template' : 'New Email Template'}</span><button class="drawer-close" id="et-c">${Icons.close}</button></div>
        <div class="modal-body" style="max-height:72vh;overflow-y:auto">
          <div class="form-grid">
            <div class="form-group form-full"><label class="form-label">Template Name *</label><input class="input" id="et-title" value="${existing?.title||''}" placeholder="e.g. Donor Thank You"></div>
            <div class="form-group form-full"><label class="form-label">Subject / Heading</label><input class="input" id="et-subject" value="${existing?.subject||''}" placeholder="Email subject line"></div>
            <div class="form-group form-full"><label class="form-label">Body Content</label><textarea class="input" id="et-body" rows="12" style="font-family:var(--font-mono);font-size:var(--text-sm)" placeholder="Write your email template here…">${existing?.body||''}</textarea></div>
          </div>
        </div>
        <div class="modal-footer"><button class="btn btn-secondary" id="et-cancel">Cancel</button><button class="btn btn-primary" id="et-submit">${Icons.plus} ${existing ? 'Save Changes' : 'Create Template'}</button></div>
      </div>
    `;
    document.body.appendChild(overlay);
    const close = () => { overlay.remove(); editingId = null; };
    overlay.querySelector('#et-c').onclick = close;
    overlay.querySelector('#et-cancel').onclick = close;
    overlay.querySelector('#et-submit').onclick = () => {
      const title = overlay.querySelector('#et-title').value.trim();
      if (!title) { Toast.error('Template name required'); return; }
      const items = load();
      const data = { title, subject: overlay.querySelector('#et-subject').value, body: overlay.querySelector('#et-body').value };
      if (existing) {
        const idx = items.findIndex(i => i._id === existing._id);
        if (idx >= 0) items[idx] = { ...items[idx], ...data };
      } else {
        items.push({ _id: MktStore.nextId(KEY), ...data });
      }
      save(items);
      close();
      renderList();
      Toast.success(existing ? 'Template updated' : 'Template created');
    };
  }

  renderList();
  document.getElementById('et-new-btn')?.addEventListener('click', () => openTemplateForm(null));
}

// ─── EMAIL MARKETING + TEMPLATES (combined tab) ───────────────────────────────
function renderEmailMarketingWithTemplates(params = {}) {
  const main = document.getElementById('main');
  if (!main) return;

  const EM_KEY  = 'crm_marketing_email';
  const ET_KEY  = 'crm_email_templates';

  main.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <span class="page-title">Email Marketing</span>
        <span class="page-subtitle">Campaigns, drafts, and reusable templates</span>
      </div>
      <div class="page-header-right">
        <button class="btn btn-ghost btn-sm" id="em-new-btn">${Icons.plus} New Campaign</button>
        <button class="btn btn-primary" id="et-new-btn">${Icons.plus} New Template</button>
      </div>
    </div>
    <div class="page-content">
      <!-- Campaigns section -->
      <div class="rfv-section-header" style="margin-bottom:var(--space-4)">
        <span style="font-size:var(--text-base);font-weight:var(--fw-semi);color:var(--text-primary)">📬 Campaigns</span>
      </div>
      <div id="em-list" style="margin-bottom:var(--space-8)"></div>

      <!-- Divider -->
      <div style="border-top:var(--border-subtle);margin:var(--space-6) 0"></div>

      <!-- Templates section -->
      <div class="rfv-section-header" style="margin-bottom:var(--space-4)">
        <span style="font-size:var(--text-base);font-weight:var(--fw-semi);color:var(--text-primary)">📄 Email Templates</span>
      </div>
      <div id="et-list"></div>
    </div>
  `;

  let editingId = null;

  // ── Campaigns ──
  function loadEM() { return MktStore.get(EM_KEY); }
  function saveEM(v) { MktStore.set(EM_KEY, v); }

  function renderCampaigns() {
    const items = loadEM();
    const el = document.getElementById('em-list');
    if (!el) return;
    if (!items.length) {
      el.innerHTML = `<div style="color:var(--text-muted);padding:var(--space-4) 0">No campaigns yet. Click "New Campaign" above.</div>`;
      return;
    }
    el.innerHTML = `<div class="rfv-wide-grid">` + items.map(item => `
      <div class="mkt-card" style="position:relative">
        <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-2)">
          <span style="font-weight:var(--fw-semi)">${item.title}</span>
          ${item.status ? `<span class="badge ${item.status==='Draft'?'badge-amber':item.status==='Sent'?'badge-green':'badge-gray'}">${item.status}</span>` : ''}
          <div style="margin-left:auto"><button class="btn btn-ghost btn-sm em-del" data-id="${item._id}">✕</button></div>
        </div>
        ${item.notes ? `<div style="font-size:var(--text-sm);color:var(--text-secondary);white-space:pre-wrap">${item.notes}</div>` : ''}
        <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:var(--space-2)">${item.date ? `Planned: ${item.date}` : ''}</div>
      </div>
    `).join('') + `</div>`;
    el.querySelectorAll('.em-del').forEach(btn => {
      btn.addEventListener('click', () => {
        saveEM(loadEM().filter(i => i._id !== parseInt(btn.dataset.id)));
        renderCampaigns(); Toast.success('Entry removed');
      });
    });
  }

  // ── Templates ──
  function loadET() { return MktStore.get(ET_KEY); }
  function saveET(v) { MktStore.set(ET_KEY, v); }

  function renderTemplates() {
    const templates = loadET();
    const el = document.getElementById('et-list');
    if (!el) return;
    if (!templates.length) {
      el.innerHTML = `<div style="color:var(--text-muted);padding:var(--space-4) 0">No templates yet. Click "New Template" above.</div>`;
      return;
    }
    el.innerHTML = `<div class="rfv-wide-grid">` + templates.map(t => `
      <div class="mkt-card">
        <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-3)">
          <div style="flex:1">
            <div style="font-weight:var(--fw-semi)">${t.title}</div>
            <div style="font-size:var(--text-sm);color:var(--text-muted)">${t.subject || 'No subject'}</div>
          </div>
          <button class="btn btn-ghost btn-sm et-edit" data-id="${t._id}">Edit</button>
          <button class="btn btn-ghost btn-sm et-copy" data-id="${t._id}" title="Copy">📋</button>
          <button class="btn btn-ghost btn-sm et-del" data-id="${t._id}">✕</button>
        </div>
        <div style="background:var(--bg-elevated);border:var(--border-subtle);border-radius:var(--radius-md);padding:var(--space-3);font-size:var(--text-sm);color:var(--text-secondary);white-space:pre-wrap;max-height:100px;overflow-y:auto">${t.body || '—'}</div>
      </div>
    `).join('') + `</div>`;
    el.querySelectorAll('.et-del').forEach(btn => {
      btn.addEventListener('click', async () => {
        const ok = await Confirm.show('Delete this template?', 'Delete Template');
        if (!ok) return;
        saveET(loadET().filter(i => i._id !== parseInt(btn.dataset.id)));
        renderTemplates(); Toast.success('Template deleted');
      });
    });
    el.querySelectorAll('.et-copy').forEach(btn => {
      btn.addEventListener('click', () => {
        const t = loadET().find(i => i._id === parseInt(btn.dataset.id));
        if (t) navigator.clipboard.writeText(t.body || '').then(() => Toast.success('Copied'));
      });
    });
    el.querySelectorAll('.et-edit').forEach(btn => {
      btn.addEventListener('click', () => {
        editingId = parseInt(btn.dataset.id);
        openTemplateForm(loadET().find(i => i._id === editingId));
      });
    });
  }

  function openTemplateForm(existing) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay open';
    overlay.innerHTML = `
      <div class="modal" style="max-width:640px">
        <div class="modal-header"><span class="modal-title">${existing ? 'Edit Template' : 'New Email Template'}</span><button class="drawer-close" id="et-c">${Icons.close}</button></div>
        <div class="modal-body" style="max-height:72vh;overflow-y:auto">
          <div class="form-grid">
            <div class="form-group form-full"><label class="form-label">Template Name *</label><input class="input" id="et-title" value="${existing?.title||''}" placeholder="e.g. Donor Thank You"></div>
            <div class="form-group form-full"><label class="form-label">Subject / Heading</label><input class="input" id="et-subject" value="${existing?.subject||''}" placeholder="Email subject line"></div>
            <div class="form-group form-full"><label class="form-label">Body Content</label><textarea class="input" id="et-body" rows="12" style="font-family:var(--font-mono);font-size:var(--text-sm)">${existing?.body||''}</textarea></div>
          </div>
        </div>
        <div class="modal-footer"><button class="btn btn-secondary" id="et-cancel">Cancel</button><button class="btn btn-primary" id="et-submit">${Icons.plus} ${existing ? 'Save Changes' : 'Create Template'}</button></div>
      </div>
    `;
    document.body.appendChild(overlay);
    const close = () => { overlay.remove(); editingId = null; };
    overlay.querySelector('#et-c').onclick = close;
    overlay.querySelector('#et-cancel').onclick = close;
    overlay.querySelector('#et-submit').onclick = () => {
      const title = overlay.querySelector('#et-title').value.trim();
      if (!title) { Toast.error('Name required'); return; }
      const items = loadET();
      const data = { title, subject: overlay.querySelector('#et-subject').value, body: overlay.querySelector('#et-body').value };
      if (existing) {
        const idx = items.findIndex(i => i._id === existing._id);
        if (idx >= 0) items[idx] = { ...items[idx], ...data };
      } else {
        items.push({ _id: MktStore.nextId(ET_KEY), ...data });
      }
      saveET(items); close(); renderTemplates();
      Toast.success(existing ? 'Template updated' : 'Template created');
    };
  }

  renderCampaigns();
  renderTemplates();

  document.getElementById('em-new-btn')?.addEventListener('click', () => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay open';
    overlay.innerHTML = `
      <div class="modal" style="max-width:560px">
        <div class="modal-header"><span class="modal-title">New Email Campaign</span><button class="drawer-close" id="em-c">${Icons.close}</button></div>
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group form-full"><label class="form-label">Campaign Title *</label><input class="input" id="em-title" placeholder="e.g. Spring Golf Fundraiser Email"></div>
            <div class="form-group"><label class="form-label">Status</label><select class="select" id="em-status"><option>Idea</option><option>Draft</option><option>Ready</option><option>Sent</option></select></div>
            <div class="form-group"><label class="form-label">Planned Date</label><input class="input" id="em-date" type="date"></div>
            <div class="form-group form-full"><label class="form-label">Notes / Draft Content</label><textarea class="input" id="em-notes" rows="5"></textarea></div>
          </div>
        </div>
        <div class="modal-footer"><button class="btn btn-secondary" id="em-cancel">Cancel</button><button class="btn btn-primary" id="em-submit">${Icons.plus} Save</button></div>
      </div>
    `;
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.querySelector('#em-c').onclick = close;
    overlay.querySelector('#em-cancel').onclick = close;
    overlay.querySelector('#em-submit').onclick = () => {
      const title = overlay.querySelector('#em-title').value.trim();
      if (!title) { Toast.error('Title required'); return; }
      const items = loadEM();
      items.push({ _id: MktStore.nextId(EM_KEY), title, status: overlay.querySelector('#em-status').value, date: overlay.querySelector('#em-date').value, notes: overlay.querySelector('#em-notes').value });
      saveEM(items); close(); renderCampaigns(); Toast.success('Campaign saved');
    };
  });

  document.getElementById('et-new-btn')?.addEventListener('click', () => openTemplateForm(null));
}

// ─── SOCIAL MEDIA ─────────────────────────────────────────────────────────────
function renderSocialMedia(params = {}) {
  const main = document.getElementById('main');
  const KEY = 'crm_marketing_social';
  const SETTINGS_KEY = 'crm_marketing_canva_url';

  function loadPosts() { return MktStore.get(KEY); }
  function savePosts(posts) { MktStore.set(KEY, posts); }

  const canvaUrl = localStorage.getItem(SETTINGS_KEY) || '';

  main.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <span class="page-title">Social Media</span>
        <span class="page-subtitle">Content ideas, post concepts, and planning</span>
      </div>
      <div class="page-header-right">
        ${canvaUrl ? `<a href="${canvaUrl}" target="_blank" rel="noopener" class="btn btn-secondary">🎨 Open Canva</a>` : ''}
        <button class="btn btn-ghost btn-sm" id="sm-canva-set-btn">⚙ Set Canva Link</button>
        <button class="btn btn-primary" id="sm-new-btn">${Icons.plus} New Post Idea</button>
      </div>
    </div>
    <div class="page-content">
      <div id="sm-list"></div>
    </div>
  `;

  function renderList() {
    const posts = loadPosts();
    const el = document.getElementById('sm-list');
    if (!el) return;
    if (!posts.length) {
      el.innerHTML = `<div style="color:var(--text-muted);text-align:center;padding:var(--space-12)">No posts planned yet. Click "New Post Idea" to start brainstorming.</div>`;
      return;
    }
    const PLATFORM_COLORS = { Instagram: '#e1306c', Facebook: '#1877f2', LinkedIn: '#0a66c2', Twitter: '#1da1f2', 'TikTok': '#010101', Other: '#64748b' };

    el.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:var(--space-4)">` + posts.map(p => {
      const color = PLATFORM_COLORS[p.platform] || '#64748b';
      return `
        <div class="mkt-card" style="border-top:3px solid ${color}">
          <div style="display:flex;align-items:center;gap:var(--space-2);margin-bottom:var(--space-3)">
            <span style="font-size:var(--text-xs);font-weight:var(--fw-semi);color:${color}">${p.platform || 'General'}</span>
            ${p.status ? `<span class="badge ${p.status === 'Posted' ? 'badge-green' : p.status === 'Ready' ? 'badge-blue' : 'badge-gray'}">${p.status}</span>` : ''}
            <div style="margin-left:auto;display:flex;gap:4px">
              <button class="btn btn-ghost btn-sm sm-del" data-id="${p._id}" style="padding:2px 6px">✕</button>
            </div>
          </div>
          <div style="font-weight:var(--fw-medium);margin-bottom:var(--space-2)">${p.title}</div>
          ${p.notes ? `<div style="font-size:var(--text-sm);color:var(--text-secondary);white-space:pre-wrap">${p.notes}</div>` : ''}
          ${p.date ? `<div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:var(--space-2)">📅 ${p.date}</div>` : ''}
        </div>
      `;
    }).join('') + `</div>`;

    el.querySelectorAll('.sm-del').forEach(btn => {
      btn.addEventListener('click', () => {
        savePosts(loadPosts().filter(p => p._id !== parseInt(btn.dataset.id)));
        renderList();
        Toast.success('Post idea removed');
      });
    });
  }

  renderList();

  document.getElementById('sm-canva-set-btn')?.addEventListener('click', () => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay open';
    const current = localStorage.getItem(SETTINGS_KEY) || '';
    overlay.innerHTML = `
      <div class="modal" style="max-width:480px">
        <div class="modal-header"><span class="modal-title">Canva Workspace Link</span><button class="drawer-close" id="cv-c">${Icons.close}</button></div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Canva URL</label>
            <input class="input" id="cv-url" value="${current}" placeholder="https://www.canva.com/design/…">
          </div>
        </div>
        <div class="modal-footer"><button class="btn btn-secondary" id="cv-cancel">Cancel</button><button class="btn btn-primary" id="cv-save">Save</button></div>
      </div>
    `;
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.querySelector('#cv-c').onclick = close;
    overlay.querySelector('#cv-cancel').onclick = close;
    overlay.querySelector('#cv-save').onclick = () => {
      localStorage.setItem(SETTINGS_KEY, overlay.querySelector('#cv-url').value.trim());
      close();
      renderSocialMedia(params);
      Toast.success('Canva link saved');
    };
  });

  document.getElementById('sm-new-btn')?.addEventListener('click', () => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay open';
    overlay.innerHTML = `
      <div class="modal" style="max-width:560px">
        <div class="modal-header"><span class="modal-title">New Post Idea</span><button class="drawer-close" id="sp-c">${Icons.close}</button></div>
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group form-full"><label class="form-label">Post Title / Concept *</label><input class="input" id="sp-title" placeholder="What's the post about?"></div>
            <div class="form-group"><label class="form-label">Platform</label>
              <select class="select" id="sp-platform"><option>Instagram</option><option>Facebook</option><option>LinkedIn</option><option>Twitter</option><option>TikTok</option><option>Other</option></select>
            </div>
            <div class="form-group"><label class="form-label">Status</label>
              <select class="select" id="sp-status"><option>Idea</option><option>Draft</option><option>Ready</option><option>Posted</option></select>
            </div>
            <div class="form-group"><label class="form-label">Planned Date</label><input class="input" id="sp-date" type="date"></div>
            <div class="form-group form-full"><label class="form-label">Notes / Caption Draft</label><textarea class="input" id="sp-notes" rows="4" placeholder="Caption ideas, hashtags, image description…"></textarea></div>
          </div>
        </div>
        <div class="modal-footer"><button class="btn btn-secondary" id="sp-cancel">Cancel</button><button class="btn btn-primary" id="sp-submit">${Icons.plus} Save</button></div>
      </div>
    `;
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.querySelector('#sp-c').onclick = close;
    overlay.querySelector('#sp-cancel').onclick = close;
    overlay.querySelector('#sp-submit').onclick = () => {
      const title = overlay.querySelector('#sp-title').value.trim();
      if (!title) { Toast.error('Title required'); return; }
      const posts = loadPosts();
      posts.push({ _id: MktStore.nextId(KEY), title, platform: overlay.querySelector('#sp-platform').value, status: overlay.querySelector('#sp-status').value, date: overlay.querySelector('#sp-date').value, notes: overlay.querySelector('#sp-notes').value });
      savePosts(posts);
      close();
      renderList();
      Toast.success('Post idea saved');
    };
  });
}

// ─── NEWSLETTER ───────────────────────────────────────────────────────────────
function renderNewsletter(params = {}) {
  const main = document.getElementById('main');

  main.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <span class="page-title">Newsletter</span>
        <span class="page-subtitle">All contacts with email addresses — your newsletter audience</span>
      </div>
      <div class="page-header-right">
        <button class="btn btn-ghost btn-sm" id="nl-export-btn">${Icons.download} Export CSV</button>
      </div>
    </div>
    <div class="page-content">
      <div style="margin-bottom:var(--space-4);display:flex;align-items:center;gap:var(--space-3)">
        <div style="position:relative;flex:1;max-width:360px">
          <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--text-muted)">${Icons.search}</span>
          <input type="text" class="search-input" id="nl-search" placeholder="Search contacts…" style="padding-left:34px">
        </div>
        <span id="nl-count" style="font-size:var(--text-sm);color:var(--text-muted)"></span>
      </div>
      <div class="table-container"><div class="table-wrap"><table class="crm-table" id="nl-table">
        <thead><tr>
          <th>Name</th><th>Email</th><th>Role</th><th>Status</th>
        </tr></thead>
        <tbody id="nl-tbody"></tbody>
      </table></div></div>
    </div>
  `;

  let search = '';

  function renderRows() {
    const users = Store.getAll('users').filter(u => u.email && u.email.trim());
    const filtered = search ? users.filter(u =>
      `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(search.toLowerCase())
    ) : users;

    const countEl = document.getElementById('nl-count');
    if (countEl) countEl.textContent = `${filtered.length} contact${filtered.length !== 1 ? 's' : ''}`;

    const tbody = document.getElementById('nl-tbody');
    if (!tbody) return;

    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:var(--space-8);color:var(--text-muted)">No contacts found</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(u => `
      <tr class="table-row" style="cursor:pointer" onclick="Router.navigate('users?open=${u.id}')">
        <td><span style="font-weight:var(--fw-medium)">${u.firstName || ''} ${u.lastName || ''}</span></td>
        <td><a href="mailto:${u.email}" onclick="event.stopPropagation()" style="color:var(--text-accent);font-size:var(--text-sm)">${u.email}</a></td>
        <td>${u.userType ? `<span class="tag">${u.userType}</span>` : '—'}</td>
        <td>${StatusBadge.render(u.status || 'Active')}</td>
      </tr>
    `).join('');
  }

  renderRows();

  document.getElementById('nl-search')?.addEventListener('input', e => {
    search = e.target.value;
    renderRows();
  });

  document.getElementById('nl-export-btn')?.addEventListener('click', () => {
    const users = Store.getAll('users').filter(u => u.email && u.email.trim());
    const rows = [['Name', 'Email', 'Role', 'Status'], ...users.map(u => [`${u.firstName} ${u.lastName}`, u.email, u.userType || '', u.status || ''])];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = 'newsletter-contacts.csv'; a.click();
    URL.revokeObjectURL(url);
    Toast.success('Newsletter list exported');
  });
}

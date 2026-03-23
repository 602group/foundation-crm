/**
 * EPIC Foundation CRM — UI Utilities & Shared Helpers
 */

// ─── TOAST NOTIFICATIONS ─────────────────────────────────────────────────────
const Toast = (() => {
  function show(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = { success: '✓', error: '✕', info: 'ℹ' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span style="font-size:14px;font-weight:600;color:var(--${type === 'success' ? 'status-green' : type === 'error' ? 'status-red' : 'status-blue'})">${icons[type]}</span> ${message}`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  return { show, success: m => show(m, 'success'), error: m => show(m, 'error'), info: m => show(m, 'info') };
})();

// ─── CONFIRM DIALOG ───────────────────────────────────────────────────────────
const Confirm = (() => {
  let _resolve = null;

  function show(message, title = 'Confirm Action') {
    let dialog = document.getElementById('confirm-dialog');
    if (!dialog) {
      dialog = document.createElement('div');
      dialog.id = 'confirm-dialog';
      dialog.className = 'confirm-dialog';
      dialog.innerHTML = `
        <div class="confirm-box">
          <h3 id="confirm-title"></h3>
          <p id="confirm-msg"></p>
          <div class="confirm-actions">
            <button class="btn btn-secondary" id="confirm-no">Cancel</button>
            <button class="btn btn-danger" id="confirm-yes">Delete</button>
          </div>
        </div>
      `;
      document.body.appendChild(dialog);
      dialog.querySelector('#confirm-no').addEventListener('click', () => resolve(false));
      dialog.querySelector('#confirm-yes').addEventListener('click', () => resolve(true));
    }
    dialog.querySelector('#confirm-title').textContent = title;
    dialog.querySelector('#confirm-msg').textContent = message;
    dialog.classList.add('open');

    return new Promise(res => { _resolve = res; });
  }

  function resolve(val) {
    const dialog = document.getElementById('confirm-dialog');
    if (dialog) dialog.classList.remove('open');
    if (_resolve) { _resolve(val); _resolve = null; }
  }

  return { show };
})();

// ─── ICON LIBRARY ────────────────────────────────────────────────────────────
const Icons = {
  dashboard:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
  users:        `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  auctions:     `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
  opportunities:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  courses:      `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  donations:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
  tasks:        `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
  financials:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
  messages:     `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  events:       `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  imports:      `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
  admin:        `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>`,
  close:        `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  plus:         `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  search:       `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  download:     `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  edit:         `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  trash:        `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
  link:         `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
  chevronRight: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`,
  filter:       `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>`,
  golf:         `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="18" r="2"/><path d="M12 16V3"/><path d="M12 3l6 4-6 4"/>`,
  marketing:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>`,
};

// ─── STATUS BADGE RENDERER ────────────────────────────────────────────────────
const StatusBadge = {
  colorMap: {
    // Auction pipeline statuses (9-stage)
    'New':                       'gray',
    'Auction Pending':            'amber',
    'Auction Booked':             'blue',
    'Auction Live':               'green',
    'Auction Closed':             'gray',
    'Waiting to reach out':       'amber',
    'Wait on buyer':              'purple',
    'Waiting on donor':           'purple',
    'Wait # days to book':        'pink',
    'Round Scheduled':            'teal',
    'Round Complete Follow Up':   'purple',
    'Round Complete':             'green',
    // Opportunity pipeline statuses (8-stage)
    'New':                           'gray',
    'Available':                     'green',
    'Reserved':                      'blue',
    'Sold':                          'teal',
    'Waiting to reach out':          'amber',
    'Wait on buyer':                 'purple',
    'Waiting on donor':              'purple',
    'Wait # days to book':           'pink',
    'Round Scheduled':               'teal',
    'Round Complete Follow Up':      'purple',
    'Complete':                      'green',
    // Task-specific statuses
    'Waiting':      'orange',
    'Urgent':       'red',
    // Donation statuses
    'Unassigned':                    'amber',
    'Assigned':                      'blue',
    'Used':                          'teal',
    // Legacy opportunity/donation statuses
    'Available_old':  'green',
    'Pending':        'amber',
    'Committed':      'blue',
    'Closed':         'gray',
    'Received':       'green',
    'Cancelled':      'red',
    'Active':      'green',
    'Sold':        'blue',
    'Closed':      'gray',
    'Cancelled':   'red',
    // User
    'Inactive':    'gray',
    // Opportunities
    'Available':   'green',
    'Pending':     'amber',
    'Committed':   'teal',
    // Donations
    'Received':    'green',
    // Tasks
    'Open':        'blue',
    'In Progress': 'amber',
    'Complete':    'green',
    // Financials (new)
    'Estimated':   'gray',
    'Recorded':    'teal',
    // Financials (legacy compat)
    'Confirmed':   'green',
    'Voided':      'red',
    // Messages
    'Replied':     'teal',
    // Events
    'Upcoming':    'blue',
    'Completed':   'gray',
  },

  render(status) {
    if (!status) return '<span class="badge badge-gray">—</span>';
    const color = this.colorMap[status] || 'gray';
    return `<span class="badge badge-${color}">${status}</span>`;
  },
};

// ─── LINKED FIELD COMPONENT ───────────────────────────────────────────────────
function createLinkedField({ container, tableName, searchFields, displayFn, onSelect, value, placeholder }) {
  let selectedId = value || null;
  let dropdownOpen = false;

  function getDisplayName(id) {
    if (!id) return '';
    const record = Store.getById(tableName, id);
    if (!record) return id;
    return displayFn ? displayFn(record) : (record.name || `${record.firstName || ''} ${record.lastName || ''}`.trim() || id);
  }

  container.innerHTML = `
    <div class="linked-field-wrap">
      <input type="text" class="input linked-field-input" placeholder="${placeholder || 'Search...'}" value="${getDisplayName(selectedId)}" autocomplete="off">
      <div class="linked-field-dropdown" id="${container.id || 'lf'}-dropdown"></div>
    </div>
  `;

  const input = container.querySelector('.linked-field-input');
  const dropdown = container.querySelector('.linked-field-dropdown');

  function renderDropdown(results) {
    if (!results.length) {
      dropdown.innerHTML = `<div class="linked-field-option" style="color:var(--text-muted)">No results</div>`;
    } else {
      dropdown.innerHTML = results.slice(0, 20).map(r => {
        const name = displayFn ? displayFn(r) : (r.name || `${r.firstName || ''} ${r.lastName || ''}`.trim() || r.id);
        const sub = r.email || r.location || r.company || '';
        return `<div class="linked-field-option" data-id="${r.id}">
          <span class="opt-id">${r.id}</span>
          <span class="opt-name">${name}</span>
          ${sub ? `<span class="opt-sub">${sub}</span>` : ''}
        </div>`;
      }).join('');
    }
    // "Clear" option
    dropdown.innerHTML += `<div class="linked-field-option" data-id="__clear__" style="color:var(--text-muted);border-top:var(--border-subtle);margin-top:4px">Clear selection</div>`;
    dropdown.classList.add('open');
    dropdownOpen = true;

    dropdown.querySelectorAll('.linked-field-option').forEach(opt => {
      opt.addEventListener('mousedown', e => {
        e.preventDefault();
        const id = opt.dataset.id;
        if (id === '__clear__') {
          selectedId = null;
          input.value = '';
        } else {
          selectedId = id;
          input.value = getDisplayName(id);
        }
        dropdown.classList.remove('open');
        dropdownOpen = false;
        if (onSelect) onSelect(selectedId);
      });
    });
  }

  input.addEventListener('focus', () => {
    const results = Store.getAll(tableName);
    renderDropdown(results);
  });

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    if (!q) {
      const all = Store.getAll(tableName);
      renderDropdown(all);
      return;
    }
    const filtered = Store.search(tableName, q, searchFields || ['name', 'firstName', 'lastName', 'email', 'title']);
    renderDropdown(filtered);
  });

  input.addEventListener('blur', () => {
    setTimeout(() => {
      dropdown.classList.remove('open');
      dropdownOpen = false;
      // Restore display name if deselected mid-edit
      input.value = getDisplayName(selectedId);
    }, 150);
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      dropdown.classList.remove('open');
      dropdownOpen = false;
      input.value = getDisplayName(selectedId);
    }
  });

  return {
    getValue: () => selectedId,
    setValue: (id) => {
      selectedId = id;
      input.value = getDisplayName(id);
    },
    clear: () => {
      selectedId = null;
      input.value = '';
    },
  };
}

// ─── GENERIC TABLE RENDERER ───────────────────────────────────────────────────
class CRMTable {
  constructor({ containerId, tableName, columns, searchFields, filterDefs = [], onRowClick, defaultSort, defaultSortDir = 'asc', preFilter = null }) {
    this.containerId = containerId;
    this.tableName = tableName;
    this.columns = columns;
    this.searchFields = searchFields;
    this.filterDefs = filterDefs;
    this.onRowClick = onRowClick;
    this.preFilter = preFilter; // optional fn(allItems) => filteredItems
    this.state = {
      search: '',
      filters: {},
      sort: defaultSort || null,
      sortDir: defaultSortDir,
      page: 1,
      perPage: 50,
    };
    this.container = null;
  }

  getContainer() {
    if (!this.container) this.container = document.getElementById(this.containerId);
    return this.container;
  }

  render() {
    const el = this.getContainer();
    if (!el) return;

    // Apply preFilter first if provided, then query on the filtered subset
    let queryOptions = {
      searchText: this.state.search,
      searchFields: this.searchFields,
      filters: this.state.filters,
      sortField: this.state.sort,
      sortDir: this.state.sortDir,
      page: this.state.page,
      perPage: this.state.perPage,
    };

    let items, total, page, totalPages;
    // Find if the active sort column has a custom sortFn
    const sortCol = this.columns.find(c => c.field === this.state.sort && c.sortFn);

    if (this.preFilter || sortCol) {
      // Manual path: get all, apply preFilter (if any), search, filter, custom sort, paginate
      const allItems = Store.getAll(this.tableName);
      let filtered = this.preFilter ? this.preFilter(allItems) : allItems;
      // Apply search
      if (this.state.search) {
        const q = this.state.search.toLowerCase();
        filtered = filtered.filter(r => this.searchFields.some(f => String(r[f]||'').toLowerCase().includes(q)));
      }
      // Apply filter dropdowns
      Object.entries(this.state.filters).forEach(([field, val]) => {
        if (val) filtered = filtered.filter(r => r[field] === val);
      });
      // Sort — prefer custom sortFn, then simple field sort
      if (this.state.sort) {
        const dir = this.state.sortDir;
        const dirMul = dir === 'asc' ? 1 : -1;
        if (sortCol && sortCol.sortFn) {
          filtered = [...filtered].sort((a, b) => sortCol.sortFn(a, b, dir));
        } else {
          filtered = [...filtered].sort((a, b) => {
            const av = a[this.state.sort] || ''; const bv = b[this.state.sort] || '';
            return av < bv ? -dirMul : av > bv ? dirMul : 0;
          });
        }
      }
      total = filtered.length;
      totalPages = Math.ceil(total / this.state.perPage) || 1;
      page = this.state.page;
      const start = (page - 1) * this.state.perPage;
      items = filtered.slice(start, start + this.state.perPage);

    } else {
      const result = Store.query(this.tableName, queryOptions);
      items = result.items; total = result.total; page = result.page; totalPages = result.totalPages;
    }

    el.innerHTML = `
      <div class="table-toolbar">
        <div class="search-wrap">
          <span class="search-icon">${Icons.search}</span>
          <input type="text" class="search-input" placeholder="Search..." value="${this.state.search}" id="${this.containerId}-search">
        </div>
        ${this.filterDefs.map(f => `
          <select class="select" style="width:auto;min-width:130px" id="${this.containerId}-filter-${f.field}">
            <option value="">${f.label}</option>
            ${f.options.map(o => `<option value="${o}" ${this.state.filters[f.field] === o ? 'selected' : ''}>${o}</option>`).join('')}
          </select>
        `).join('')}
        <div class="table-toolbar-right">
          <span style="font-size:var(--text-xs);color:var(--text-muted)">${total} record${total !== 1 ? 's' : ''}</span>
          <button class="btn btn-ghost btn-sm" id="${this.containerId}-export">${Icons.download} Export</button>
        </div>
      </div>
      <div class="table-container">
        <div class="table-wrap">
          ${items.length === 0 ? `
            <div class="table-empty">
              <div class="empty-icon">📋</div>
              <div class="empty-title">No records found</div>
              <div class="empty-sub">Try adjusting your search or filters</div>
            </div>
          ` : `
            <table class="crm-table" id="${this.containerId}-table">
              <thead>
                <tr>
                  ${this.columns.map(col => `
                    <th class="${col.sortable !== false ? 'sortable' : ''} ${this.state.sort === col.field ? (this.state.sortDir === 'asc' ? 'sorted-asc' : 'sorted-desc') : ''}"
                        ${col.sortable !== false ? `data-sort="${col.field}"` : ''}
                        style="${col.width ? `width:${col.width}` : ''}">
                      ${col.label}
                      ${col.sortable !== false ? `<span class="sort-icon">${this.state.sort === col.field ? (this.state.sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>` : ''}
                    </th>
                  `).join('')}
                </tr>
              </thead>
              <tbody>
                ${items.map(row => `
                  <tr data-id="${row.id}" class="table-row">
                    ${this.columns.map(col => `<td title="${this._getCellValue(row, col)}">${this._renderCell(row, col)}</td>`).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `}
        </div>
        <div class="table-footer">
          <span>Showing ${items.length} of ${total}</span>
          <div class="pagination">
            <button class="page-btn" id="${this.containerId}-prev" ${page <= 1 ? 'disabled' : ''}>‹</button>
            ${Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let p = i + 1;
              if (totalPages > 7) {
                if (page <= 4) p = i + 1;
                else if (page >= totalPages - 3) p = totalPages - 6 + i;
                else p = page - 3 + i;
              }
              return `<button class="page-btn ${p === page ? 'active' : ''}" data-page="${p}">${p}</button>`;
            }).join('')}
            <button class="page-btn" id="${this.containerId}-next" ${page >= totalPages ? 'disabled' : ''}>›</button>
          </div>
        </div>
      </div>
    `;

    // Event listeners
    const searchId = `${this.containerId}-search`;
    const searchEl = document.getElementById(searchId);
    if (searchEl) {
      searchEl.addEventListener('input', e => {
        const val = e.target.value;
        const pos = e.target.selectionStart;
        this.state.search = val;
        this.state.page = 1;
        this.render();
        // Re-find the fresh input (old reference is now detached) and restore focus + cursor
        const fresh = document.getElementById(searchId);
        if (fresh) {
          fresh.focus();
          try { fresh.setSelectionRange(pos, pos); } catch (_) {}
        }
      });
    }

    this.filterDefs.forEach(f => {
      const sel = document.getElementById(`${this.containerId}-filter-${f.field}`);
      if (sel) {
        sel.addEventListener('change', e => {
          this.state.filters[f.field] = e.target.value;
          this.state.page = 1;
          this.render();
        });
      }
    });

    const exportBtn = document.getElementById(`${this.containerId}-export`);
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        if (typeof Importer !== 'undefined') {
          Importer.smartExport(this.tableName);
        } else {
          Store.downloadCSV(this.tableName, `${this.tableName}-export.csv`);
        }
        Toast.success('CSV exported');
      });
    }

    el.querySelectorAll('th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const field = th.dataset.sort;
        if (this.state.sort === field) {
          this.state.sortDir = this.state.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          this.state.sort = field;
          this.state.sortDir = 'asc';
        }
        this.state.page = 1;
        this.render();
      });
    });

    el.querySelectorAll('.table-row').forEach(row => {
      row.addEventListener('click', () => {
        if (this.onRowClick) this.onRowClick(row.dataset.id);
      });
    });

    const prev = document.getElementById(`${this.containerId}-prev`);
    const next = document.getElementById(`${this.containerId}-next`);
    if (prev) prev.addEventListener('click', () => { this.state.page--; this.render(); });
    if (next) next.addEventListener('click', () => { this.state.page++; this.render(); });

    el.querySelectorAll('.page-btn[data-page]').forEach(btn => {
      btn.addEventListener('click', () => { this.state.page = parseInt(btn.dataset.page); this.render(); });
    });

    // Auto-init bulk select for this table
    if (typeof BulkSelect !== 'undefined') {
      const statusOpts = Store.STATUS[this.tableName] || [];
      BulkSelect.init(this.tableName, {
        statusOptions: statusOpts,
        onRefresh: () => this.render(),
      });
    }
  }

  _getCellValue(row, col) {
    if (col.valueGetter) return col.valueGetter(row) || '';
    const val = row[col.field];
    if (Array.isArray(val)) return val.join(', ');
    return val || '';
  }

  _renderCell(row, col) {
    if (col.render) return col.render(row);
    const val = this._getCellValue(row, col);
    if (col.field === 'id') return `<span style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--text-muted)">${val}</span>`;
    if (!val) return `<span style="color:var(--text-muted)">—</span>`;
    if (col.isStatus) return StatusBadge.render(val);
    if (Array.isArray(row[col.field])) {
      return row[col.field].slice(0, 3).map(v => `<span class="tag">${v}</span>`).join(' ');
    }
    return String(val);
  }

  refresh() {
    this.render();
  }
}

// ─── RECORD DRAWER ────────────────────────────────────────────────────────────
class RecordDrawer {
  constructor({ title = 'Record Details', tabs = ['Details', 'Activity'] } = {}) {
    this.tabs = tabs;
    this.activeTab = tabs[0];
    this._ensureDOM();
  }

  _ensureDOM() {
    if (document.getElementById('record-drawer')) return;

    const overlay = document.createElement('div');
    overlay.className = 'drawer-overlay';
    overlay.id = 'drawer-overlay';
    overlay.addEventListener('click', () => this.close());
    document.body.appendChild(overlay);

    const drawer = document.createElement('div');
    drawer.className = 'drawer';
    drawer.id = 'record-drawer';
    drawer.innerHTML = `
      <div class="drawer-header" id="drawer-header">
        <div class="drawer-title-area">
          <div class="drawer-record-id" id="drawer-record-id"></div>
          <div class="drawer-title" id="drawer-title"></div>
        </div>
        <div style="display:flex;gap:var(--space-2);align-items:center">
          <button class="btn btn-ghost btn-sm" id="drawer-edit-toggle">Edit</button>
          <button class="drawer-close" id="drawer-close">${Icons.close}</button>
        </div>
      </div>
      <div class="drawer-tabs" id="drawer-tabs"></div>
      <div class="drawer-body" id="drawer-body"></div>
      <div class="drawer-footer" id="drawer-footer"></div>
    `;
    document.body.appendChild(drawer);

    document.getElementById('drawer-close').addEventListener('click', () => this.close());
  }

  open({ recordId, title, subtitle, tabs, tabRenderer, onSave, onDelete }) {
    this._ensureDOM();
    // Allow open() to override tabs (since the drawer is a singleton)
    if (tabs && tabs.length) {
      this.tabs = tabs;
    }
    this.activeTab = this.tabs[0];
    this.editMode = false;
    this.onSave = onSave;
    this.onDelete = onDelete;
    this.tabRenderer = tabRenderer;
    this.currentRecordId = recordId;

    document.getElementById('drawer-record-id').textContent = recordId || '';
    document.getElementById('drawer-title').textContent = title || 'Record';

    // Tabs
    const tabsEl = document.getElementById('drawer-tabs');
    tabsEl.innerHTML = this.tabs.map(t =>
      `<div class="drawer-tab ${t === this.activeTab ? 'active' : ''}" data-tab="${t}">${t}</div>`
    ).join('');

    tabsEl.querySelectorAll('.drawer-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.activeTab = tab.dataset.tab;
        tabsEl.querySelectorAll('.drawer-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === this.activeTab));
        this._renderBody();
      });
    });

    // Edit toggle
    const editBtn = document.getElementById('drawer-edit-toggle');
    editBtn.textContent = 'Edit';
    editBtn.onclick = () => {
      this.editMode = !this.editMode;
      editBtn.textContent = this.editMode ? 'Cancel' : 'Edit';
      this._renderBody();
      this._renderFooter();
    };

    // Delete button in footer
    const footer = document.getElementById('drawer-footer');
    if (onDelete) {
      footer.innerHTML = `
        <button class="btn btn-danger btn-sm" id="drawer-delete">${Icons.trash} Delete Record</button>
        <div style="flex:1"></div>
        <button class="btn btn-primary" id="drawer-save" style="display:none">Save Changes</button>
      `;
      document.getElementById('drawer-delete').onclick = async () => {
        const ok = await Confirm.show('This will permanently delete this record.', 'Delete Record');
        if (ok && onDelete) { onDelete(); this.close(); }
      };
      document.getElementById('drawer-save').onclick = () => {
        if (onSave) { onSave(); this.editMode = false; editBtn.textContent = 'Edit'; this._renderBody(); this._renderFooter(); }
      };
    } else {
      footer.innerHTML = `<button class="btn btn-primary" id="drawer-save" style="display:none">Save Changes</button>`;
    }

    this._renderBody();
    this._renderFooter();

    document.getElementById('drawer-overlay').classList.add('open');
    document.getElementById('record-drawer').classList.add('open');
  }

  _renderBody() {
    const body = document.getElementById('drawer-body');
    if (this.tabRenderer) {
      this.tabRenderer(body, this.activeTab, this.editMode);
    }
  }

  _renderFooter() {
    const saveBtn = document.getElementById('drawer-save');
    if (saveBtn) saveBtn.style.display = this.editMode ? 'inline-flex' : 'none';
  }

  close() {
    document.getElementById('drawer-overlay')?.classList.remove('open');
    document.getElementById('record-drawer')?.classList.remove('open');
  }

  updateTitle(title, id) {
    document.getElementById('drawer-title').textContent = title;
    if (id) document.getElementById('drawer-record-id').textContent = id;
  }
}

// ─── SHARED HELPERS ───────────────────────────────────────────────────────────
function renderLinkedUserChip(userId, label) {
  if (!userId) return `<span style="color:var(--text-muted)">—</span>`;
  const user = Store.getById('users', userId);
  const name = user ? `${user.firstName} ${user.lastName}` : userId;
  return `<span class="linked-chip" data-navigate="users:${userId}">
    <span class="chip-id">${userId}</span>
    ${name}
    ${Icons.chevronRight}
  </span>`;
}

function renderLinkedCourseChip(courseId) {
  if (!courseId) return `<span style="color:var(--text-muted)">—</span>`;
  const course = Store.getById('courses', courseId);
  const name = course ? course.name : courseId;
  return `<span class="linked-chip" data-navigate="courses:${courseId}">
    <span class="chip-id">${courseId}</span>
    ${name}
    ${Icons.chevronRight}
  </span>`;
}

function renderLinkedChip(tableName, id, labelField = 'name') {
  if (!id) return `<span style="color:var(--text-muted)">—</span>`;
  const record = Store.getById(tableName, id);
  let label = id;
  if (record) {
    label = record[labelField] || record.title || record.name ||
      `${record.firstName || ''} ${record.lastName || ''}`.trim() || id;
  }
  return `<span class="linked-chip" data-navigate="${tableName}:${id}">
    <span class="chip-id">${id}</span>${label}${Icons.chevronRight}
  </span>`;
}

function formatCurrency(val) {
  if (!val && val !== 0) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
}

// Attach global chip navigation
document.addEventListener('click', e => {
  const chip = e.target.closest('[data-navigate]');
  if (!chip) return;
  const [table, id] = chip.dataset.navigate.split(':');
  Router.navigate(`${table}?open=${id}`);
});

// ─── ACTIVITY LOG RENDERER ────────────────────────────────────────────────────
function renderActivityLog(activityLog) {
  if (!activityLog || !activityLog.length) {
    return `<div class="empty-state"><p>No activity recorded yet</p></div>`;
  }
  const entries = [...activityLog].reverse();
  return `<div class="activity-log">
    ${entries.map(entry => `
      <div class="activity-entry">
        <div class="activity-dot ${entry.type || 'updated'}"></div>
        <div class="activity-content">
          <div class="activity-text">${entry.text || 'Record updated'}</div>
          <div class="activity-time">${Store.formatDateTime(entry.timestamp)} · ${entry.actor || 'System'}</div>
        </div>
      </div>
    `).join('')}
  </div>`;
}

// ─── BULK SELECT HELPER ────────────────────────────────────────────────────────
/**
 * BulkSelect.init(tableName, { statusOptions, onRefresh })
 * Injects checkboxes into every .table-row[data-id] in the DOM,
 * adds a Select-All header checkbox, and manages a sticky bulk action bar.
 */
const BulkSelect = (() => {
  let _selectedIds = new Set();
  let _tableName = '';
  let _statusOptions = [];
  let _onRefresh = null;
  let _bar = null;

  function init(tableName, { statusOptions = [], onRefresh = null } = {}) {
    _tableName = tableName;
    _statusOptions = statusOptions;
    _onRefresh = onRefresh;
    _selectedIds = new Set();
    _removeBar();

    const table = document.querySelector('.crm-table');
    if (!table) return;

    const headerRow = table.querySelector('thead tr');
    if (headerRow && !headerRow.querySelector('.bulk-th')) {
      const th = document.createElement('th');
      th.className = 'bulk-th';
      th.style.cssText = 'width:36px;padding:0 var(--space-2);';
      th.innerHTML = '<input type="checkbox" id="bulk-select-all" style="cursor:pointer;width:14px;height:14px">';
      headerRow.insertBefore(th, headerRow.firstChild);
    }

    table.querySelectorAll('tbody .table-row[data-id]').forEach(row => {
      if (row.querySelector('.bulk-td')) return;
      const td = document.createElement('td');
      td.className = 'bulk-td';
      td.style.cssText = 'width:36px;padding:0 var(--space-2);';
      const rowId = row.dataset.id;
      td.innerHTML = '<input type="checkbox" class="bulk-row-check" data-id="' + rowId + '" style="cursor:pointer;width:14px;height:14px">';
      td.onclick = e => e.stopPropagation();
      row.insertBefore(td, row.firstChild);
    });

    const selectAll = table.querySelector('#bulk-select-all');
    if (selectAll) {
      selectAll.addEventListener('change', e => {
        table.querySelectorAll('.bulk-row-check').forEach(cb => {
          cb.checked = e.target.checked;
          if (e.target.checked) _selectedIds.add(cb.dataset.id);
          else _selectedIds.delete(cb.dataset.id);
          cb.closest('tr') && cb.closest('tr').classList.toggle('bulk-selected', e.target.checked);
        });
        _updateBar();
      });
    }

    table.querySelectorAll('.bulk-row-check').forEach(cb => {
      cb.addEventListener('change', e => {
        if (e.target.checked) _selectedIds.add(e.target.dataset.id);
        else _selectedIds.delete(e.target.dataset.id);
        const tr = e.target.closest('tr');
        if (tr) tr.classList.toggle('bulk-selected', e.target.checked);
        _updateBar();
        const allChecks = table.querySelectorAll('.bulk-row-check');
        if (selectAll) selectAll.checked = [...allChecks].every(c => c.checked);
      });
    });
  }

  function _updateBar() {
    const count = _selectedIds.size;
    if (count === 0) { _removeBar(); return; }

    if (!_bar) {
      _bar = document.createElement('div');
      _bar.className = 'bulk-action-bar';
      const container = document.querySelector('.table-wrap') && document.querySelector('.table-wrap').parentNode
        || document.querySelector('.table-container')
        || document.querySelector('.page-content');
      if (container) container.appendChild(_bar);
    }

    let statusHtml = '';
    if (_statusOptions.length) {
      statusHtml = '<select class="select" id="bulk-status-sel" style="width:auto;min-width:140px;font-size:var(--text-xs)"><option value="">Bulk Set Status…</option>'
        + _statusOptions.map(s => '<option value="' + s + '">' + s + '</option>').join('') + '</select>'
        + '<button class="btn btn-secondary btn-sm" id="bulk-status-btn">Apply</button>';
    }

    _bar.innerHTML = '<div class="bulk-action-bar-count">☑ ' + count + ' row' + (count !== 1 ? 's' : '') + ' selected</div>'
      + statusHtml
      + '<button class="btn btn-ghost btn-sm" id="bulk-export-btn">⬇ Export Selected</button>'
      + '<button class="btn btn-ghost btn-sm" id="bulk-clear-btn" style="color:var(--text-muted)">✕ Clear</button>';

    _bar.querySelector('#bulk-export-btn') && _bar.querySelector('#bulk-export-btn').addEventListener('click', () => {
      const rows = [..._selectedIds].map(id => Store.getById(_tableName, id)).filter(Boolean);
      if (!rows.length) { Toast.info('Nothing to export'); return; }
      const schema = (typeof Importer !== 'undefined' && Importer.SCHEMAS[_tableName]);
      const fieldKeys = schema ? schema.fields.map(f => f.key) : Object.keys(rows[0]);
      const headers = fieldKeys.join(',');
      const csvRows = rows.map(r => fieldKeys.map(k => {
        const v = String(r[k] != null ? r[k] : '').replace(/"/g, '""');
        return (v.includes(',') || v.includes('"')) ? '"' + v + '"' : v;
      }).join(','));
      const csv = [headers].concat(csvRows).join('\n');
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url; a.download = _tableName + '-selected.csv'; a.click();
      URL.revokeObjectURL(url);
      Toast.success(rows.length + ' rows exported');
    });

    _bar.querySelector('#bulk-status-btn') && _bar.querySelector('#bulk-status-btn').addEventListener('click', () => {
      const sel = _bar.querySelector('#bulk-status-sel');
      if (!sel || !sel.value) { Toast.error('Select a status first'); return; }
      const newStatus = sel.value;
      [..._selectedIds].forEach(id => Store.update(_tableName, id, { status: newStatus }));
      Toast.success('Updated ' + _selectedIds.size + ' records to "' + newStatus + '"');
      _selectedIds.clear();
      _removeBar();
      if (_onRefresh) _onRefresh();
    });

    _bar.querySelector('#bulk-clear-btn') && _bar.querySelector('#bulk-clear-btn').addEventListener('click', () => {
      _selectedIds.clear();
      document.querySelectorAll('.bulk-row-check, #bulk-select-all').forEach(cb => { cb.checked = false; });
      document.querySelectorAll('.bulk-selected').forEach(tr => tr.classList.remove('bulk-selected'));
      _removeBar();
    });
  }

  function _removeBar() {
    if (_bar) { _bar.remove(); _bar = null; }
  }

  function getSelectedIds() { return [..._selectedIds]; }

  return { init, getSelectedIds };
})();

// ─── GLOBAL SEARCH ────────────────────────────────────────────────────────────
const GlobalSearch = (() => {
  const SEARCH_CONFIG = [
    { table: 'users',         label: 'Users',      fields: ['firstName','lastName','email','phone'], display: r => `${r.firstName||''} ${r.lastName||''}`.trim(), meta: r => r.email || '' },
    { table: 'auctions',      label: 'Auctions',   fields: ['shortName','title','itemNumber'], display: r => r.shortName || r.title || r.id, meta: r => r.status || '' },
    { table: 'opportunities', label: 'Special Opps', fields: ['shortName','title','id'], display: r => r.shortName || r.title || r.id, meta: r => r.status || '' },
    { table: 'donations',     label: 'Donations',  fields: ['description','title','id'], display: r => r.description || r.title || r.id, meta: r => r.type || '' },
    { table: 'courses',       label: 'Courses',    fields: ['name','location'], display: r => r.name, meta: r => r.location || '' },
    { table: 'tasks',         label: 'Tasks',      fields: ['title','description','id'], display: r => r.title || r.id, meta: r => r.status || '' },
    { table: 'events',        label: 'Events',     fields: ['title','location'], display: r => r.title, meta: r => r.date || '' },
    { table: 'messages',      label: 'Messages',   fields: ['fromName','subject','fromEmail'], display: r => r.subject || '—', meta: r => r.fromName || '' },
  ];

  let _debounce = null;
  let _activeIndex = -1;
  let _results = [];

  function init() {
    const topbar = document.getElementById('page-topbar');
    if (!topbar || topbar.querySelector('.global-search-wrap')) return;

    topbar.innerHTML = `
      <div class="global-search-wrap">
        <span class="global-search-icon">${Icons.search}</span>
        <input type="text" class="global-search-input" id="global-search-input" placeholder="Search users, auctions, tasks, events…" autocomplete="off">
        <div class="global-search-dropdown" id="global-search-dropdown"></div>
      </div>
    `;

    const input = document.getElementById('global-search-input');
    const dropdown = document.getElementById('global-search-dropdown');

    input.addEventListener('input', () => {
      clearTimeout(_debounce);
      _debounce = setTimeout(() => runSearch(input.value), 120);
    });

    input.addEventListener('keydown', e => {
      const rows = dropdown.querySelectorAll('.gs-result-row');
      if (e.key === 'ArrowDown') { e.preventDefault(); _activeIndex = Math.min(_activeIndex + 1, rows.length - 1); highlight(rows); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); _activeIndex = Math.max(_activeIndex - 1, 0); highlight(rows); }
      else if (e.key === 'Enter' && _activeIndex >= 0) { rows[_activeIndex]?.click(); }
      else if (e.key === 'Escape') { close(); input.blur(); }
    });

    document.addEventListener('click', e => {
      if (!e.target.closest('.global-search-wrap')) close();
    });
  }

  function highlight(rows) {
    rows.forEach((r, i) => r.classList.toggle('gs-active', i === _activeIndex));
    rows[_activeIndex]?.scrollIntoView({ block: 'nearest' });
  }

  function runSearch(query) {
    const dropdown = document.getElementById('global-search-dropdown');
    if (!dropdown) return;
    const q = query.trim().toLowerCase();
    if (!q) { close(); return; }

    _results = [];
    let html = '';

    SEARCH_CONFIG.forEach(cfg => {
      const hits = Store.search(cfg.table, q, cfg.fields).slice(0, 5);
      if (!hits.length) return;
      html += `<div class="gs-section-label">${cfg.label}</div>`;
      hits.forEach(r => {
        const idx = _results.length;
        _results.push({ table: cfg.table, id: r.id });
        html += `<div class="gs-result-row" data-idx="${idx}">
          <span class="gs-label">${cfg.display(r)}</span>
          <span class="gs-meta">${cfg.meta(r)}</span>
          <span class="gs-type">${cfg.label}</span>
        </div>`;
      });
    });

    if (!html) html = `<div class="gs-no-results">No results for "${query}"</div>`;
    dropdown.innerHTML = html;
    dropdown.classList.add('open');
    _activeIndex = -1;

    dropdown.querySelectorAll('.gs-result-row').forEach(row => {
      row.addEventListener('click', () => {
        const { table, id } = _results[parseInt(row.dataset.idx)];
        close();
        const input = document.getElementById('global-search-input');
        if (input) input.value = '';
        Router.navigate(`${table}?open=${id}`);
      });
    });
  }

  function close() {
    const dropdown = document.getElementById('global-search-dropdown');
    if (dropdown) { dropdown.classList.remove('open'); dropdown.innerHTML = ''; }
    _activeIndex = -1;
    _results = [];
  }

  return { init };
})();

// ─── RECORD FULL VIEW ─────────────────────────────────────────────────────────
// Replaces the sliding drawer with a full-width in-page record view.
// Usage: new RecordFullView().open({ ... }) — same API as RecordDrawer.open()
// Renders into #main; Back button restores the previous page.
class RecordFullView {
  constructor({ tabs = ['Details', 'Activity'] } = {}) {
    this.tabs = tabs;
    this.activeTab = tabs[0];
  }

  open({ recordId, title, subtitle, tabs, tabRenderer, quickBarRenderer, onSave, onDelete, onClose }) {
    const main = document.getElementById('main');
    if (!main) return;

    if (tabs && tabs.length) this.tabs = tabs;
    this.activeTab = this.tabs[0];
    this.editMode = false;
    this.tabRenderer = tabRenderer;
    this.quickBarRenderer = quickBarRenderer;
    this.onSave = onSave;
    this.onDelete = onDelete;
    this.onClose = onClose;
    this.recordId = recordId;
    this.title = title;

    main.innerHTML = `
      <div class="record-full-view" id="record-full-view">
        <div class="record-full-header">
          <button class="record-full-back" id="rfv-back">← Back</button>
          <div class="record-full-title-area">
            <div class="record-full-id" id="rfv-id">${recordId || ''}</div>
            <div class="record-full-title" id="rfv-title">${title || 'Record'}</div>
          </div>
          <div class="record-full-actions" id="rfv-actions">
            <button class="btn btn-ghost btn-sm" id="rfv-edit-btn">Edit</button>
            <button class="btn btn-primary" id="rfv-save-btn" style="display:none">Save Changes</button>
            <button class="btn btn-secondary btn-sm" id="rfv-cancel-edit" style="display:none">Cancel</button>
            ${onDelete ? `<button class="btn btn-danger btn-sm" id="rfv-delete-btn">${Icons.trash} Delete</button>` : ''}
          </div>
        </div>
        <div class="record-full-tabs" id="rfv-tabs"></div>
        <div class="record-full-quick-bar" id="rfv-quick-bar" style="display:none"></div>
        <div class="record-full-body" id="rfv-body"></div>
      </div>
    `;

    // Back button
    document.getElementById('rfv-back').addEventListener('click', () => {
      if (this.onClose) this.onClose();
      else history.back();
    });

    // Tabs
    this._renderTabs();

    // Edit button
    document.getElementById('rfv-edit-btn').addEventListener('click', () => {
      this.editMode = !this.editMode;
      const btn = document.getElementById('rfv-edit-btn');
      if (btn) btn.textContent = this.editMode ? '✕ Cancel Edit' : 'Edit';
      const saveBtn = document.getElementById('rfv-save-btn');
      const cancelBtn = document.getElementById('rfv-cancel-edit');
      if (saveBtn) saveBtn.style.display = this.editMode ? 'inline-flex' : 'none';
      if (cancelBtn) cancelBtn.style.display = this.editMode ? 'inline-flex' : 'none';
      this._renderBody();
    });

    // Cancel edit
    document.getElementById('rfv-cancel-edit')?.addEventListener('click', () => {
      this.editMode = false;
      const btn = document.getElementById('rfv-edit-btn');
      if (btn) btn.textContent = 'Edit';
      const saveBtn = document.getElementById('rfv-save-btn');
      const cancelBtn = document.getElementById('rfv-cancel-edit');
      if (saveBtn) saveBtn.style.display = 'none';
      if (cancelBtn) cancelBtn.style.display = 'none';
      this._renderBody();
    });

    // Save
    document.getElementById('rfv-save-btn')?.addEventListener('click', () => {
      if (this.onSave) {
        this.onSave();
        this.editMode = false;
        const btn = document.getElementById('rfv-edit-btn');
        if (btn) btn.textContent = 'Edit';
        const saveBtn = document.getElementById('rfv-save-btn');
        const cancelBtn = document.getElementById('rfv-cancel-edit');
        if (saveBtn) saveBtn.style.display = 'none';
        if (cancelBtn) cancelBtn.style.display = 'none';
        this._renderBody();
      }
    });

    // Delete
    if (onDelete) {
      document.getElementById('rfv-delete-btn')?.addEventListener('click', async () => {
        const ok = await Confirm.show('This will permanently delete this record.', 'Delete Record');
        if (ok && this.onDelete) { this.onDelete(); }
      });
    }

    // Quick bar
    if (quickBarRenderer) {
      const qb = document.getElementById('rfv-quick-bar');
      if (qb) { qb.style.display = 'flex'; quickBarRenderer(qb); }
    }

    this._renderBody();
  }

  _renderTabs() {
    const tabsEl = document.getElementById('rfv-tabs');
    if (!tabsEl) return;
    tabsEl.innerHTML = this.tabs.map(t =>
      `<div class="record-full-tab ${t === this.activeTab ? 'active' : ''}" data-tab="${t}">${t}</div>`
    ).join('');
    tabsEl.querySelectorAll('.record-full-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.activeTab = tab.dataset.tab;
        tabsEl.querySelectorAll('.record-full-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === this.activeTab));
        this._renderBody();
      });
    });
  }

  _renderBody() {
    const body = document.getElementById('rfv-body');
    if (body && this.tabRenderer) this.tabRenderer(body, this.activeTab, this.editMode);
  }

  updateTitle(title, id) {
    const t = document.getElementById('rfv-title');
    const i = document.getElementById('rfv-id');
    if (t) t.textContent = title;
    if (i && id) i.textContent = id;
    this.title = title;
  }

  // Compatibility shim — same API as RecordDrawer.close()
  close() {
    if (this.onClose) this.onClose();
    else history.back();
  }
}

// ─── SHARED PAGE HELPERS ──────────────────────────────────────────────────────
// renderNotesTab — saves notes on a record in any table
function renderNotesTab(body, record, tableName) {
  body.innerHTML = `
    <div class="drawer-section">
      <div class="drawer-section-title">Notes</div>
      <div class="notes-area">
        <textarea id="notes-textarea" placeholder="Add internal notes…">${record.notes || ''}</textarea>
      </div>
      <button class="btn btn-secondary btn-sm" id="save-notes-btn" style="margin-top:var(--space-3)">Save Notes</button>
    </div>
  `;
  body.querySelector('#save-notes-btn')?.addEventListener('click', () => {
    const notes = body.querySelector('#notes-textarea').value;
    Store.update(tableName, record.id, { notes });
    Toast.success('Notes saved');
  });
}

// renderRelatedSection — renders a labelled list of linked records
function renderRelatedSection(label, records, tableName, labelField) {
  if (!records || !records.length) return `
    <div class="drawer-section">
      <div class="drawer-section-title">${label}</div>
      <div style="color:var(--text-muted);font-size:var(--text-sm)">None linked</div>
    </div>`;

  return `
    <div class="drawer-section">
      <div class="drawer-section-title">${label} <span style="color:var(--text-muted);font-weight:normal">(${records.length})</span></div>
      <div class="related-records">
        ${records.map(r => {
          const name = r[labelField] || r.firstName ? `${r.firstName||''} ${r.lastName||''}`.trim() : r.name || r.title || r.id;
          return `<div class="related-record-row" data-navigate="${tableName}:${r.id}">
            <span class="related-record-id">${r.id}</span>
            <span class="related-record-name">${name}</span>
            ${Icons.chevronRight}
          </div>`;
        }).join('')}
      </div>
    </div>`;
}


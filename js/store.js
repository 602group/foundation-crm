/**
 * EPIC Foundation CRM — Core Data Store (v2 — Supabase-backed)
 * 
 * Architecture:
 *  - On app start, Store.init() fetches ALL data from the server into _cache (in-memory).
 *  - All read calls (getAll, getById, etc.) are synchronous reads from _cache.
 *  - All write calls (create, update, remove) write to the server AND update _cache atomically.
 *  - This preserves the synchronous rendering pattern across all page modules.
 */

const Store = (() => {
  'use strict';

  // ─── TABLE NAMES ────────────────────────────────────────────────────────────
  const TABLES = {
    users:           'users',
    auctions:        'auctions',
    opportunities:   'opportunities',
    courses:         'courses',
    donations:       'donations',
    tasks:           'tasks',
    financials:      'financials',
    receipts:        'receipts',
    messages:        'messages',
    events:          'events',
    admins:          'admins',
    qualifiedBuyers: 'qualified_buyers',
    waitlists:       'waitlists',
    lostDemand:      'lost_demand',
  };

  // ─── ID PREFIXES ─────────────────────────────────────────────────────────────
  const PREFIXES = {
    users:           'USER',
    auctions:        'AUCT',
    opportunities:   'OPP',
    courses:         'COURSE',
    donations:       'DON',
    tasks:           'TASK',
    financials:      'FIN',
    receipts:        'REC',
    messages:        'MSG',
    events:          'EVT',
    admins:          'ADMIN',
    qualifiedBuyers: 'QB',
    waitlists:       'WL',
    lostDemand:      'LD',
  };

  // ─── STATUS DEFINITIONS ──────────────────────────────────────────────────────
  const STATUS = {
    users:           ['Active', 'Inactive'],
    auctions:        ['New', 'Auction Pending', 'Auction Booked', 'Auction Live', 'Auction Closed', 'Waiting to reach out', 'Wait on buyer', 'Waiting on donor', 'Wait # days to book', 'Round Scheduled', 'Round Complete Follow Up', 'Round Complete'],
    opportunities:   ['New', 'Available', 'Reserved', 'Sold', 'Waiting to reach out', 'Wait on buyer', 'Waiting on donor', 'Wait # days to book', 'Round Scheduled', 'Round Complete Follow Up', 'Complete'],
    courses:         ['Active', 'Inactive'],
    donations:       ['New', 'Unassigned', 'Assigned', 'Used', 'Complete'],
    tasks:           ['Open', 'In Progress', 'Waiting', 'Complete', 'Cancelled'],
    financials:      ['Estimated', 'Pending', 'Recorded', 'Complete'],
    receipts:        ['Pending', 'Approved', 'Paid', 'Reimbursed', 'Disputed', 'Archived', 'Void'],
    messages:        ['Open', 'Replied', 'Closed'],
    events:          ['Upcoming', 'Active', 'Completed', 'Cancelled'],
    admins:          ['Active', 'Inactive', 'Suspended'],
    qualifiedBuyers: ['Active', 'Inactive'],
    waitlists:       ['Active', 'Contacted', 'Converted', 'Removed'],
    lostDemand:      ['New', 'Contacted', 'Waitlisted', 'Converted', 'Closed'],
  };

  // ─── CONSTANTS ───────────────────────────────────────────────────────────────
  const ADMIN_ROLES        = ['Super Admin', 'Admin', 'Limited Admin', 'View Only'];
  const USER_TYPES         = ['Member', 'Donor', 'Broker', 'Buyer', 'Admin Contact', 'Other', 'Public'];
  const TAG_OPTIONS        = ['VIP', 'High Value', 'Repeat Buyer', 'Donor Tier 1', 'Donor Tier 2', 'New Contact', 'Hot Lead', 'Prospect', 'Inactive'];
  const AUCTION_TYPES      = ['Round of Golf', 'Golf Trip', 'Experience', 'Dinner', 'Other'];
  const ROUND_TYPES        = ['4-Some', '2-Some', 'Threesome', 'Solo', 'Pro-Am', 'Corporate Day', 'Other'];
  const SCHEDULING_STATUS  = ['Not Started', 'Contacted', 'Coordinating', 'Confirmed', 'Completed', 'Cancelled'];
  const AUCTION_VISIBILITY = ['Public', 'Members Only', 'Private'];
  const AUCTION_CATEGORIES = ['Golf', 'Travel', 'Experience', 'Dinner & Wine', 'Sports', 'Other'];
  const OPPORTUNITY_TYPES  = ['Player X', 'John White', 'Direct Sale', 'Donated Round', 'Premium Experience', 'Private Club Access', 'Travel Opportunity', 'Other'];
  const BUYER_TIERS        = ['Platinum', 'Gold', 'Silver', 'Bronze', 'Prospect'];
  const INTEREST_LEVELS    = ['Very High', 'High', 'Medium', 'Low', 'Unknown'];
  const BUDGET_TIERS       = ['$10k+', '$5k–$10k', '$2k–$5k', 'Under $2k', 'Unknown'];
  const TRAVEL_OPTIONS     = ['Yes – Anywhere', 'Yes – Regional', 'Local Only', 'Unknown'];
  const DONATION_TYPES     = ['Auction Round', 'Special Opportunity', 'Event Sponsorship', 'Merchandise', 'Experience', 'Cash', 'Other'];
  const ASSIGNED_TO_TYPES  = ['Auction', 'Opportunity', 'Event', 'Unassigned'];
  const COURSE_TYPES       = ['Public', 'Private', 'Resort', 'Semi-Private'];
  const COURSE_TIERS       = ['Platinum', 'Gold', 'Silver'];
  const COURSE_REGIONS     = ['Northeast', 'Southeast', 'Midwest', 'Southwest', 'West', 'Pacific', 'International'];
  const TASK_TYPES         = ['Follow Up', 'Scheduling', 'Outreach', 'Internal Review', 'Donation Request', 'Buyer Contact', 'Donor Contact', 'Admin', 'Other'];
  const TASK_PRIORITIES    = ['Urgent', 'High', 'Medium', 'Low'];
  const FINANCIAL_RECORD_TYPES    = ['Auction', 'Special Opportunity', 'Donation', 'Event', 'Other'];
  const RECEIPT_CATEGORIES        = ['Travel', 'Lodging', 'Meals & Ent', 'Materials', 'Service/Labor', 'Marketing', 'Venue', 'Admin', 'Other'];
  const RECEIPT_SUBCATEGORIES     = { 'Travel': ['Flights', 'Car Rental', 'Rideshare', 'Gas', 'Parking', 'Other'], 'Lodging': ['Hotel', 'Airbnb', 'Other'], 'Meals & Ent': ['Client Dinner', 'Team Lunch', 'Event Catering', 'Entertainment', 'Other'], 'Materials': ['Printing', 'Signage', 'Swag/Gifts', 'Supplies', 'Other'], 'Service/Labor': ['Contractor', 'Staffing', 'Speaker Fee', 'Consulting', 'Other'], 'Marketing': ['Ads', 'Sponsorship', 'Promo', 'Other'], 'Venue': ['Rental Fee', 'AV Equipment', 'Cleaning', 'Other'], 'Admin': ['Software', 'Processing Fees', 'Insurance', 'Postage', 'Office', 'Other'], 'Other': ['Miscellaneous'] };
  const RECEIPT_PAYMENT_METHODS   = ['Credit Card', 'Bank Transfer', 'Cash', 'Check', 'Company Card', 'Personal Card', 'Other'];
  const RECEIPT_DEPARTMENTS       = ['Operations', 'Marketing', 'Sales', 'Admin', 'Leadership', 'Other'];

  // ─── IN-MEMORY CACHE ──────────────────────────────────────────────────────────
  const _cache = {};
  let   _initialized = false;
  let   _initPromise = null;

  // ─── SERVER API URL ───────────────────────────────────────────────────────────
  // Auto-detects local vs deployed environment
  function _apiBase() {
    if (typeof window === 'undefined') return '';
    const { protocol, hostname, port } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `${protocol}//${hostname}:${port || 3001}`;
    }
    return ''; // same origin on Vercel
  }

  async function _api(method, path, body) {
    const url = _apiBase() + path;
    const opts = {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  }

  // ─── INITIALIZATION ──────────────────────────────────────────────────────────
  /**
   * Call Store.init() once at app startup to warm the in-memory cache.
   * Returns a Promise that resolves when all data is loaded.
   */
  async function init() {
    if (_initialized) return;
    if (_initPromise) return _initPromise;

    _initPromise = (async () => {
      try {
        const data = await _api('GET', '/api/db-batch/all');
        // Map server table names back to internal camelCase keys
        Object.keys(TABLES).forEach(key => {
          const serverTable = TABLES[key];
          _cache[key] = (data[serverTable] || []).map(r => _fromServer(r, key));
        });
        _initialized = true;
        console.log('[Store] Cache warmed —', Object.entries(_cache).map(([k, v]) => `${k}:${v.length}`).join(', '));
      } catch (err) {
        console.error('[Store] init failed:', err.message);
        // Graceful fallback: empty arrays so app doesn't crash
        Object.keys(TABLES).forEach(key => { if (!_cache[key]) _cache[key] = []; });
        _initialized = true;
      }
    })();
    return _initPromise;
  }

  /** Refresh a single table from the server. */
  async function refreshTable(tableName) {
    const serverTable = TABLES[tableName];
    if (!serverTable) return;
    const rows = await _api('GET', `/api/db/${serverTable}`);
    _cache[tableName] = rows.map(r => _fromServer(r, tableName));
  }

  // ─── FIELD NAME MAPPING ───────────────────────────────────────────────────────
  // The DB uses snake_case; the frontend uses camelCase.
  // We convert on the way in and out to keep all page code working without changes.
  
  const FIELD_MAP = {
    // DB snake_case  → JS camelCase
    first_name:          'firstName',
    last_name:           'lastName',
    user_types:          'userTypes',
    activity_log:        'activityLog',
    created_at:          'createdAt',
    updated_at:          'updatedAt',
    created_by:          'createdBy',
    updated_by:          'updatedBy',
    password_hash:       'passwordHash',
    last_login:          'lastLogin',
    donor_id:            'donorId',
    buyer_id:            'buyerId',
    course_id:           'courseId',
    reserve_price:       'reservePrice',
    starting_bid:        'startingBid',
    final_price:         'finalPrice',
    sell_price:          'sellPrice',
    launch_date:         'launchDate',
    end_date:            'endDate',
    confirmed_play_date: 'confirmedPlayDate',
    scheduling_status:   'schedulingStatus',
    manual_status:       '_manualStatus',
    short_name:          'shortName',
    interested_user_id:  'interestedUserId',
    estimated_value:     'estimatedValue',
    assigned_to:         'assignedTo',
    assigned_to_id:      'assignedToId',
    task_type:           'taskType',
    due_date:            'dueDate',
    completed_date:      'completedDate',
    assigned_to_id:      'assignedToId',
    related_user_id:     'relatedUserId',
    auction_id:          'auctionId',
    opportunity_id:      'opportunityId',
    record_type:         'recordType',
    revenue_status:      'revenueStatus',
    linked_record_id:    'linkedRecordId',
    linked_record_type:  'linkedRecordType',
    estimated_revenue:   'estimatedRevenue',
    actual_revenue:      'actualRevenue',
    payment_method:      'paymentMethod',
    receipt_date:        'receiptDate',
    submitted_by:        'submittedBy',
    from_name:           'fromName',
    from_email:          'fromEmail',
    from_phone:          'fromPhone',
    linked_user_id:      'linkedUserId',
    replied_at:          'repliedAt',
    start_date:          'startDate',
    user_ids:            'userIds',
    interest_level:      'interestLevel',
    budget_tier:         'budgetTier',
    table_name:          'tableName',
    
    // Auctions Extra
    item_number:         'itemNumber',
    buy_now_price:       'buyNowPrice',
    givesmart_url:       'givesmartUrl',
    event_code:          'eventCode',
    item_token:          'itemToken',
    completion_notes:    'completionNotes',
    
    // Events Extra
    entry_fee:           'entryFee',
    sponsorship_revenue: 'sponsorshipRevenue',
    spots_registered:    'spotsRegistered',
  };

  const FIELD_MAP_REVERSE = Object.fromEntries(Object.entries(FIELD_MAP).map(([k, v]) => [v, k]));

  function _fromServer(row, _tableName) {
    if (!row) return row;
    const out = {};
    for (const [k, v] of Object.entries(row)) {
      out[FIELD_MAP[k] || k] = v;
    }
    // Sanitize JSONB/array fields to guarantee they are arrays
    const arrayFields = ['activityLog', 'userTypes', 'types', 'tags', 'userIds'];
    arrayFields.forEach(field => {
      if (out[field] !== undefined) {
        let val = out[field];
        if (typeof val === 'string') {
          try { val = JSON.parse(val); } catch { val = val ? [val] : []; }
        }
        out[field] = Array.isArray(val) ? val : (val ? [val] : []);
      }
    });
    return out;
  }

  function _toServer(obj) {
    if (!obj) return obj;
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      out[FIELD_MAP_REVERSE[k] || k] = v;
    }
    return out;
  }

  // ─── TIMESTAMP ───────────────────────────────────────────────────────────────
  function now() { return new Date().toISOString(); }

  function formatDate(isoString) {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatDateTime(isoString) {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  // ─── ACTIVITY LOG ─────────────────────────────────────────────────────────────
  function createActivity(type, text, actor = 'Admin') {
    return { type, text, actor, timestamp: now() };
  }

  // ─── AUDIT LOG (server-side) ─────────────────────────────────────────────────
  function logAudit(action, tableName, recordId) {
    // Fire-and-forget audit write to server
    _api('POST', '/api/db/audit_log', { id: Date.now().toString(36) + Math.random().toString(36).slice(2), action, table_name: tableName, record_id: recordId || '' }).catch(() => {});
  }

  function getAuditLog(limit = 100) {
    // Return from cache if available (loaded separately). Returns empty array by default.
    return [];
  }

  // ─── ID GENERATION ───────────────────────────────────────────────────────────
  // Synchronous: uses a counter from the cache, increments server in background.
  // For new records, we generate the ID locally then confirm later.
  const _localCounters = {};

  function generateId(tableName) {
    if (!_localCounters[tableName]) {
      // Seed from the max existing ID in cache
      const rows = _cache[tableName] || [];
      const prefix = PREFIXES[tableName] || 'REC';
      _localCounters[tableName] = rows.reduce((max, r) => {
        const n = parseInt((r.id || '').replace(prefix, ''), 10);
        return isNaN(n) ? max : Math.max(max, n);
      }, 0);
    }
    _localCounters[tableName]++;
    const prefix = PREFIXES[tableName] || 'REC';
    return `${prefix}${String(_localCounters[tableName]).padStart(4, '0')}`;
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────────────

  function create(tableName, data, actor = 'Admin') {
    // Auto-link messages to users
    if (tableName === 'messages' && !data.linkedUserId && (data.fromEmail || data.fromName || data.fromPhone)) {
      const first = (data.fromName || 'New').split(' ')[0];
      const last  = (data.fromName || 'Inquiry').split(' ').slice(1).join(' ');
      const match = findDuplicateUser(data.fromEmail, first, last, data.fromPhone);
      if (match?.match) {
        data.linkedUserId = match.match.id;
        data.activityLog = [...(data.activityLog || []), createActivity('linked', `Auto-linked to existing user ${match.match.id}`, 'System')];
      } else {
        const newUser = create('users', { firstName: first, lastName: last, email: data.fromEmail || '', phone: data.fromPhone || '', status: 'Active', userTypes: ['Other'], tags: ['New Contact'], notes: 'Profile automatically created from inbound message.' }, 'System');
        data.linkedUserId = newUser.id;
        data.activityLog = [...(data.activityLog || []), createActivity('created', `Auto-created user ${newUser.id}`, 'System')];
      }
    }

    const id = generateId(tableName);
    const ts = now();
    const record = {
      ...data,
      id,
      createdAt: ts,
      updatedAt: ts,
      createdBy: actor,
      updatedBy: actor,
      activityLog: [createActivity('created', 'Record created', actor), ...(data.activityLog || [])],
    };

    // Optimistic cache update
    if (!_cache[tableName]) _cache[tableName] = [];
    _cache[tableName].unshift(record);

    // Async server persist
    const serverPayload = _toServer(record);
    _api('POST', `/api/db/${TABLES[tableName]}`, serverPayload).then(saved => {
      // Update ID in cache if server assigned a different one (rare)
      const idx = (_cache[tableName] || []).findIndex(r => r.id === id);
      if (idx !== -1 && saved.id && saved.id !== id) {
        _cache[tableName][idx].id = saved.id;
      }
      logAudit('created', tableName, id);
    }).catch(err => console.error('[Store.create]', tableName, err.message));

    return record;
  }

  function getAll(tableName) {
    return _cache[tableName] || [];
  }

  function getById(tableName, id) {
    return (_cache[tableName] || []).find(r => r.id === id) || null;
  }

  function update(tableName, id, changes, actor = 'Admin') {
    const table = _cache[tableName] || [];
    const idx = table.findIndex(r => r.id === id);
    if (idx === -1) return null;

    const old = table[idx];
    const activityEntries = [];
    const skipFields = ['activityLog', 'updatedAt', 'updatedBy'];
    Object.keys(changes).forEach(key => {
      if (skipFields.includes(key)) return;
      if (JSON.stringify(old[key]) !== JSON.stringify(changes[key])) {
        const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
        activityEntries.push(createActivity('updated', `${label} updated`, actor));
      }
    });

    const updated = {
      ...old,
      ...changes,
      id, // never overwrite
      createdAt: old.createdAt,
      createdBy: old.createdBy,
      updatedAt: now(),
      updatedBy: actor,
      activityLog: [...(old.activityLog || []), ...activityEntries],
    };

    // Optimistic cache update
    _cache[tableName][idx] = updated;

    // Async server persist
    const serverPayload = _toServer({ ...changes, updated_at: updated.updatedAt, updated_by: actor, activity_log: updated.activityLog });
    _api('PATCH', `/api/db/${TABLES[tableName]}/${id}`, serverPayload).catch(err => {
      console.error('[Store.update]', tableName, id, err.message);
      // Revert on failure
      _cache[tableName][idx] = old;
    });

    return updated;
  }

  function remove(tableName, id, actor = 'Admin') {
    const table = _cache[tableName] || [];
    const idx = table.findIndex(r => r.id === id);
    if (idx === -1) return false;

    // Optimistic removal
    const removed = table.splice(idx, 1)[0];

    _api('DELETE', `/api/db/${TABLES[tableName]}/${id}`).then(() => {
      logAudit('deleted', tableName, id);
    }).catch(err => {
      console.error('[Store.remove]', tableName, id, err.message);
      // Revert on failure
      (_cache[tableName] || []).splice(idx, 0, removed);
    });

    return true;
  }

  // ─── SEARCH & FILTER ─────────────────────────────────────────────────────────
  function search(tableName, query, fields) {
    if (!query || !query.trim()) return _cache[tableName] || [];
    const q = query.trim().toLowerCase();
    return (_cache[tableName] || []).filter(record =>
      fields.some(field => {
        const val = record[field];
        if (!val) return false;
        if (Array.isArray(val)) return val.some(v => String(v).toLowerCase().includes(q));
        return String(val).toLowerCase().includes(q);
      })
    );
  }

  function filter(tableName, criteria) {
    return (_cache[tableName] || []).filter(record =>
      Object.entries(criteria).every(([key, val]) => {
        if (!val || val === 'all' || val === '') return true;
        const recVal = record[key];
        if (Array.isArray(recVal)) return recVal.includes(val);
        return String(recVal).toLowerCase() === String(val).toLowerCase();
      })
    );
  }

  function query(tableName, { searchText, searchFields, filters, sortField, sortDir = 'asc', page = 1, perPage = 50 }) {
    let results = _cache[tableName] || [];

    if (filters && Object.keys(filters).length) {
      results = results.filter(record =>
        Object.entries(filters).every(([key, val]) => {
          if (!val || val === 'all' || val === '') return true;
          const recVal = record[key];
          if (Array.isArray(recVal)) return recVal.includes(val);
          return String(recVal).toLowerCase() === String(val).toLowerCase();
        })
      );
    }

    if (searchText && searchText.trim() && searchFields) {
      const q = searchText.trim().toLowerCase();
      results = results.filter(record =>
        searchFields.some(field => {
          const val = record[field];
          if (!val) return false;
          if (Array.isArray(val)) return val.some(v => String(v).toLowerCase().includes(q));
          return String(val).toLowerCase().includes(q);
        })
      );
    }

    if (sortField) {
      results = [...results].sort((a, b) => {
        const av = String(a[sortField] || '').toLowerCase();
        const bv = String(b[sortField] || '').toLowerCase();
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    } else {
      results = [...results].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    const total = results.length;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const items = results.slice((page - 1) * perPage, page * perPage);
    return { items, total, page, totalPages, perPage };
  }

  // ─── RELATIONSHIP HELPERS ─────────────────────────────────────────────────────
  function addLink(tableName, recordId, linkField, linkedId, actor = 'Admin') {
    const record = getById(tableName, recordId);
    if (!record) return null;
    const existing = record[linkField] || [];
    if (existing.includes(linkedId)) return record;
    const updated = update(tableName, recordId, { [linkField]: [...existing, linkedId] }, actor);
    const idx = (_cache[tableName] || []).findIndex(r => r.id === recordId);
    if (idx !== -1) _cache[tableName][idx].activityLog.push(createActivity('linked', `Linked record ${linkedId}`, actor));
    return updated;
  }

  function removeLink(tableName, recordId, linkField, linkedId, actor = 'Admin') {
    const record = getById(tableName, recordId);
    if (!record) return null;
    return update(tableName, recordId, { [linkField]: (record[linkField] || []).filter(id => id !== linkedId) }, actor);
  }

  function getLinked(tableName, linkField, linkedValue) {
    return (_cache[tableName] || []).filter(r => {
      const val = r[linkField];
      if (Array.isArray(val)) return val.includes(linkedValue);
      return val === linkedValue;
    });
  }

  // ─── EXPORT / IMPORT ──────────────────────────────────────────────────────────
  function exportCSV(tableName) {
    const records = _cache[tableName] || [];
    if (!records.length) return '';
    const keys = Object.keys(records[0]).filter(k => k !== 'activityLog');
    const header = keys.join(',');
    const rows = records.map(r =>
      keys.map(k => {
        const val = r[k];
        if (Array.isArray(val)) return `"${val.join('; ')}"`;
        if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) return `"${val.replace(/"/g, '""')}"`;
        return val ?? '';
      }).join(',')
    );
    return [header, ...rows].join('\n');
  }

  function downloadCSV(tableName, filename) {
    const csv = exportCSV(tableName);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename || `${tableName}-export.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  function parseCSV(text) {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    return lines.slice(1).map(line => {
      const vals = [];
      let cur = '', inQuote = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') { inQuote = !inQuote; }
        else if (ch === ',' && !inQuote) { vals.push(cur.trim()); cur = ''; }
        else { cur += ch; }
      }
      vals.push(cur.trim());
      const obj = {};
      headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
      return obj;
    });
  }

  // ─── SETTINGS ─────────────────────────────────────────────────────────────────
  function getSettings() {
    const rows = _cache['settings'] || [];
    const out = {};
    rows.forEach(r => { try { out[r.key] = r.value; } catch {} });
    return out;
  }

  function saveSettings(settings) {
    Object.entries(settings).forEach(([key, value]) => {
      _api('POST', `/api/db/settings`, { key, value }).catch(() => {});
    });
  }

  // ─── AUCTION STATUS AUTOMATION ───────────────────────────────────────────────
  function computeAuctionStatus(record) {
    const today = new Date(); today.setHours(0,0,0,0);
    const toDate = s => { if (!s) return null; const d = new Date(s); d.setHours(0,0,0,0); return d; };
    const launchDate    = toDate(record.launchDate);
    const endDate       = toDate(record.endDate);
    const confirmedDate = toDate(record.confirmedPlayDate);
    if (record.status === 'Round Complete') return 'Round Complete';
    if (confirmedDate && today > confirmedDate) return 'Round Complete Follow Up';
    if (confirmedDate && today <= confirmedDate) return 'Round Scheduled';
    if (record.buyerId && !confirmedDate) return 'Waiting to reach out';
    if (endDate && today > endDate && !record.buyerId) return 'Auction Closed';
    if (launchDate && endDate && today >= launchDate && today <= endDate) return 'Auction Live';
    if (launchDate && today < launchDate) return 'Auction Booked';
    if (record.donorId && !launchDate) return 'Auction Pending';
    return 'New';
  }

  function refreshAllAuctionStatuses() {
    const auctions = _cache['auctions'] || [];
    auctions.forEach((a, i) => {
      if (a.status === 'Round Complete' || a._manualStatus) return;
      const computed = computeAuctionStatus(a);
      if (computed && computed !== a.status) {
        _cache['auctions'][i] = { ...a, status: computed, updatedAt: now() };
        _api('PATCH', `/api/db/auctions/${a.id}`, { status: computed, updated_at: now() }).catch(() => {});
      }
    });
  }

  // ─── USER-SPECIFIC HELPERS ────────────────────────────────────────────────────
  function getUserActivity(userId) {
    return {
      auctionsDonated:      (_cache['auctions'] || []).filter(a => a.donorId === userId),
      auctionsBought:       (_cache['auctions'] || []).filter(a => a.buyerId === userId),
      opportunitiesDonated: (_cache['opportunities'] || []).filter(o => o.donorId === userId),
      opportunitiesJoined:  (_cache['opportunities'] || []).filter(o => o.interestedUserId === userId),
      tasks:                (_cache['tasks'] || []).filter(t => t.assignedToId === userId || t.relatedUserId === userId),
      donations:            (_cache['donations'] || []).filter(d => d.donorId === userId),
      events:               (_cache['events'] || []).filter(e => (e.userIds || []).includes(userId)),
    };
  }

  function getUserFinancialSummary(userId) {
    const bought      = (_cache['auctions'] || []).filter(a => a.buyerId === userId && a.finalPrice);
    const donated     = (_cache['donations'] || []).filter(d => d.donorId === userId && d.value);
    const oppsDonated = (_cache['opportunities'] || []).filter(o => o.donorId === userId && o.value);
    return {
      totalSpent:   bought.reduce((s, a) => s + (Number(a.finalPrice) || 0), 0),
      totalDonated: donated.reduce((s, d) => s + (Number(d.value) || 0), 0) + oppsDonated.reduce((s, o) => s + (Number(o.value) || 0), 0),
      bought, donated, oppsDonated,
    };
  }

  function findDuplicateUser(email, firstName, lastName, phone) {
    const users = _cache['users'] || [];
    if (email) {
      const byEmail = users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
      if (byEmail) return { match: byEmail, reason: 'email' };
    }
    if (firstName && lastName && phone) {
      const fn = firstName.toLowerCase(), ln = lastName.toLowerCase(), ph = phone.replace(/\D/g, '');
      const byName = users.find(u => u.firstName && u.lastName && u.phone && u.firstName.toLowerCase() === fn && u.lastName.toLowerCase() === ln && u.phone.replace(/\D/g, '') === ph);
      if (byName) return { match: byName, reason: 'name+phone' };
    }
    return null;
  }

  // ─── STATS ────────────────────────────────────────────────────────────────────
  function getStats() {
    const today      = new Date().toISOString().split('T')[0];
    const tasks      = _cache['tasks'] || [];
    const auctions   = _cache['auctions'] || [];
    const opps       = _cache['opportunities'] || [];
    const users      = _cache['users'] || [];
    const fins       = _cache['financials'] || [];
    const donations  = _cache['donations'] || [];

    const tasksDueToday = tasks.filter(t => t.dueDate === today && t.status !== 'Complete' && t.status !== 'Cancelled').length;
    const tasksOverdue  = tasks.filter(t => t.dueDate && t.dueDate < today && t.status !== 'Complete' && t.status !== 'Cancelled').length;
    const auctSaleValue = auctions.filter(a => a.sellPrice).reduce((s, a) => s + (parseFloat(a.sellPrice) || 0), 0);
    const oppSaleValue  = opps.filter(o => o.sellPrice).reduce((s, o) => s + (parseFloat(o.sellPrice) || 0), 0);
    const totalFMV      = [...auctions, ...opps].reduce((s, r) => s + (parseFloat(r.fmv) || 0), 0);
    const finActualRevenue = fins.filter(f => f.revenueStatus === 'Recorded' || f.revenueStatus === 'Complete').reduce((s, f) => s + (parseFloat(f.actualRevenue) || 0), 0);
    const finEstRevenue    = fins.reduce((s, f) => s + (parseFloat(f.estimatedRevenue) || 0), 0);

    return {
      users: users.length, auctions: auctions.length, opportunities: opps.length,
      courses: (_cache['courses'] || []).length, donations: donations.length,
      activeDonations: donations.filter(d => d.status !== 'Complete').length,
      tasks: tasks.length, financials: fins.length,
      messages: (_cache['messages'] || []).length, events: (_cache['events'] || []).length,
      admins: (_cache['admins'] || []).length,
      openTasks: tasks.filter(t => t.status === 'Open' || t.status === 'In Progress').length,
      tasksDueToday, tasksOverdue,
      auctionNew: auctions.filter(a => a.status === 'New').length,
      auctionPending: auctions.filter(a => a.status === 'Auction Pending').length,
      auctionBooked: auctions.filter(a => a.status === 'Auction Booked').length,
      auctionLive: auctions.filter(a => a.status === 'Auction Live').length,
      auctionClosed: auctions.filter(a => a.status === 'Auction Closed').length,
      auctionRoundPending: auctions.filter(a => ['Waiting to reach out', 'Wait on buyer', 'Waiting on donor', 'Wait # days to book'].includes(a.status)).length,
      auctionRoundScheduled: auctions.filter(a => a.status === 'Round Scheduled').length,
      auctionRoundFollowUp: auctions.filter(a => a.status === 'Round Complete Follow Up').length,
      auctionRoundComplete: auctions.filter(a => a.status === 'Round Complete').length,
      activeAuctions: auctions.filter(a => a.status === 'Auction Live').length,
      oppsNew: opps.filter(o => o.status === 'New').length,
      oppsAvailable: opps.filter(o => o.status === 'Available').length,
      oppsReserved: opps.filter(o => o.status === 'Reserved').length,
      oppsSold: opps.filter(o => o.status === 'Sold').length,
      oppsRoundPending: opps.filter(o => ['Waiting to reach out', 'Wait on buyer', 'Waiting on donor', 'Wait # days to book'].includes(o.status)).length,
      oppsRoundScheduled: opps.filter(o => o.status === 'Round Scheduled').length,
      oppsRoundFollowUp: opps.filter(o => o.status === 'Round Complete Follow Up').length,
      oppsComplete: opps.filter(o => o.status === 'Complete').length,
      usersMembers: users.filter(u => (u.userTypes || u.types || []).includes('Member')).length,
      usersDonors: users.filter(u => (u.userTypes || u.types || []).includes('Donor')).length,
      usersBuyers: users.filter(u => (u.userTypes || u.types || []).includes('Buyer')).length,
      usersBrokers: users.filter(u => (u.userTypes || u.types || []).includes('Broker')).length,
      donationsUnassigned: donations.filter(d => d.status === 'Unassigned' || d.status === 'New').length,
      totalFMV: Math.round(totalFMV), totalSaleValue: Math.round(auctSaleValue + oppSaleValue),
      finActualRevenue: Math.round(finActualRevenue), finEstRevenue: Math.round(finEstRevenue),
      openMessages: (_cache['messages'] || []).filter(m => m.status === 'Open').length,
      upcomingEvents: (_cache['events'] || []).filter(e => e.status === 'Upcoming').length,
    };
  }

  function getRecentActivity(limit = 20) {
    const allActivity = [];
    Object.keys(TABLES).forEach(tableName => {
      if (['counters','settings'].includes(tableName)) return;
      (_cache[tableName] || []).forEach(record => {
        let logArray = record.activityLog;
        if (typeof logArray === 'string') {
          try { logArray = JSON.parse(logArray); } catch { logArray = []; }
        }
        (Array.isArray(logArray) ? logArray : []).forEach(entry => {
          allActivity.push({
            ...entry, tableName, recordId: record.id,
            recordLabel: (record.firstName ? `${record.firstName} ${record.lastName || ''}`.trim() : record.title || record.name || record.id),
          });
        });
      });
    });
    return allActivity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, limit);
  }

  // ─── PUBLIC API ───────────────────────────────────────────────────────────────
  return {
    // Init
    init,
    refreshTable,

    // Constants
    TABLES, PREFIXES, STATUS, USER_TYPES, TAG_OPTIONS,
    AUCTION_TYPES, ROUND_TYPES, SCHEDULING_STATUS, AUCTION_VISIBILITY, AUCTION_CATEGORIES,
    TASK_TYPES, TASK_PRIORITIES,
    OPPORTUNITY_TYPES, DONATION_TYPES, ASSIGNED_TO_TYPES, COURSE_TYPES, COURSE_TIERS, COURSE_REGIONS,
    FINANCIAL_RECORD_TYPES, RECEIPT_CATEGORIES, RECEIPT_SUBCATEGORIES, RECEIPT_PAYMENT_METHODS, RECEIPT_DEPARTMENTS,
    ADMIN_ROLES, BUYER_TIERS, INTEREST_LEVELS, BUDGET_TIERS, TRAVEL_OPTIONS,

    // Audit log
    logAudit, getAuditLog,

    // Core CRUD
    create, getAll, getById, update, remove,

    // Querying
    query, search, filter,

    // Relationships
    addLink, removeLink, getLinked,

    // Utilities
    now, formatDate, formatDateTime, generateId,

    // Import/Export
    exportCSV, downloadCSV, parseCSV,

    // Settings
    getSettings, saveSettings,

    // Dashboard
    getStats, getRecentActivity,

    // User-specific
    getUserActivity, getUserFinancialSummary, findDuplicateUser,

    // Auction automation
    computeAuctionStatus, refreshAllAuctionStatuses,

    // Internal helpers (for AI assistant compatibility)
    _getTable: (name) => _cache[name] || [],
    createActivity,
  };
})();

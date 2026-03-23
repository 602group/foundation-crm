/**
 * EPIC Foundation CRM — Core Data Store
 * Single source of truth for all data, persisted to localStorage.
 * Handles: ID generation, CRUD, relationships, activity logging, search/filter, export.
 */

const Store = (() => {
  'use strict';

  // ─── TABLE NAMES ────────────────────────────────────────────────────────────
  const TABLES = {
    users:           'crm_users',
    auctions:        'crm_auctions',
    opportunities:   'crm_opportunities',
    courses:         'crm_courses',
    donations:       'crm_donations',
    tasks:           'crm_tasks',
    financials:      'crm_financials',
    receipts:        'crm_receipts',
    messages:        'crm_messages',
    events:          'crm_events',
    admins:          'crm_admins',
    counters:        'crm_id_counters',
    settings:        'crm_settings',
    qualifiedBuyers: 'crm_qualified_buyers',
    waitlists:       'crm_waitlists',
    lostDemand:      'crm_lost_demand',
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

  // ─── ADMIN CONSTANTS ──────────────────────────────────────────────────────────
  const ADMIN_ROLES = ['Super Admin', 'Admin', 'Limited Admin', 'View Only'];

  // ─── USER TYPES ──────────────────────────────────────────────────────────────
  const USER_TYPES = ['Member', 'Donor', 'Broker', 'Buyer', 'Admin Contact', 'Other', 'Public'];

  // ─── USER TAGS ───────────────────────────────────────────────────────────────
  const TAG_OPTIONS = ['VIP', 'High Value', 'Repeat Buyer', 'Donor Tier 1', 'Donor Tier 2', 'New Contact', 'Hot Lead', 'Prospect', 'Inactive'];

  // ─── AUCTION CONSTANTS ───────────────────────────────────────────────────────
  const AUCTION_TYPES = ['Round of Golf', 'Golf Trip', 'Experience', 'Dinner', 'Other'];
  const ROUND_TYPES   = ['4-Some', '2-Some', 'Threesome', 'Solo', 'Pro-Am', 'Corporate Day', 'Other'];
  const SCHEDULING_STATUS = ['Not Started', 'Contacted', 'Coordinating', 'Confirmed', 'Completed', 'Cancelled'];
  const AUCTION_VISIBILITY = ['Public', 'Members Only', 'Private'];
  const AUCTION_CATEGORIES = ['Golf', 'Travel', 'Experience', 'Dinner & Wine', 'Sports', 'Other'];

  // ─── OPPORTUNITY CONSTANTS ─────────────────────────────────────────────────────
  const OPPORTUNITY_TYPES = ['Player X', 'John White', 'Direct Sale', 'Donated Round', 'Premium Experience', 'Private Club Access', 'Travel Opportunity', 'Other'];

  // ─── QUALIFIED BUYER CONSTANTS ────────────────────────────────────────────────
  const BUYER_TIERS      = ['Platinum', 'Gold', 'Silver', 'Bronze', 'Prospect'];
  const INTEREST_LEVELS  = ['Very High', 'High', 'Medium', 'Low', 'Unknown'];
  const BUDGET_TIERS     = ['$10k+', '$5k–$10k', '$2k–$5k', 'Under $2k', 'Unknown'];
  const TRAVEL_OPTIONS   = ['Yes – Anywhere', 'Yes – Regional', 'Local Only', 'Unknown'];

  // ─── DONATION CONSTANTS ──────────────────────────────────────────────────────
  const DONATION_TYPES = ['Auction Round', 'Special Opportunity', 'Event Sponsorship', 'Merchandise', 'Experience', 'Cash', 'Other'];
  const ASSIGNED_TO_TYPES = ['Auction', 'Opportunity', 'Event', 'Unassigned'];
  const COURSE_TYPES = ['Public', 'Private', 'Resort', 'Semi-Private'];
  const COURSE_TIERS = ['Platinum', 'Gold', 'Silver'];
  const COURSE_REGIONS = ['Northeast', 'Southeast', 'Midwest', 'Southwest', 'West', 'Pacific', 'International'];

  // ─── TASK CONSTANTS ────────────────────────────────────────────────────────
  const TASK_TYPES = ['Follow Up', 'Scheduling', 'Outreach', 'Internal Review', 'Donation Request', 'Buyer Contact', 'Donor Contact', 'Admin', 'Other'];
  const TASK_PRIORITIES = ['Urgent', 'High', 'Medium', 'Low'];

  // ─── FINANCIAL CONSTANTS ──────────────────────────────────────────────────────
  const FINANCIAL_RECORD_TYPES = ['Auction', 'Special Opportunity', 'Donation', 'Event', 'Other'];
  const RECEIPT_CATEGORIES = ['Travel', 'Lodging', 'Meals & Ent', 'Materials', 'Service/Labor', 'Marketing', 'Venue', 'Admin', 'Other'];
  const RECEIPT_SUBCATEGORIES = {
    'Travel': ['Flights', 'Car Rental', 'Rideshare', 'Gas', 'Parking', 'Other'],
    'Lodging': ['Hotel', 'Airbnb', 'Other'],
    'Meals & Ent': ['Client Dinner', 'Team Lunch', 'Event Catering', 'Entertainment', 'Other'],
    'Materials': ['Printing', 'Signage', 'Swag/Gifts', 'Supplies', 'Other'],
    'Service/Labor': ['Contractor', 'Staffing', 'Speaker Fee', 'Consulting', 'Other'],
    'Marketing': ['Ads', 'Sponsorship', 'Promo', 'Other'],
    'Venue': ['Rental Fee', 'AV Equipment', 'Cleaning', 'Other'],
    'Admin': ['Software', 'Processing Fees', 'Insurance', 'Postage', 'Office', 'Other'],
    'Other': ['Miscellaneous']
  };
  const RECEIPT_PAYMENT_METHODS = ['Credit Card', 'Bank Transfer', 'Cash', 'Check', 'Company Card', 'Personal Card', 'Other'];
  const RECEIPT_DEPARTMENTS = ['Operations', 'Marketing', 'Sales', 'Admin', 'Leadership', 'Other'];

  // ─── AUDIT LOG ───────────────────────────────────────────────────────────────
  const AUDIT_KEY = 'crm_audit_log';

  function logAudit(action, tableName, recordId, actorOverride) {
    let actor = actorOverride || 'System';
    try {
      const session = typeof Auth !== 'undefined' ? Auth.getSession() : null;
      if (session) actor = session.name;
    } catch {}
    const logs = getAuditLog(500);
    logs.unshift({
      id: Date.now() + Math.random().toString(36).slice(2),
      action,
      tableName,
      recordId: recordId || '',
      actor,
      timestamp: new Date().toISOString(),
    });
    try {
      localStorage.setItem(AUDIT_KEY, JSON.stringify(logs.slice(0, 500)));
    } catch {}
  }

  function getAuditLog(limit = 100) {
    try {
      return JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]').slice(0, limit);
    } catch { return []; }
  }

  function clearAuditLog() {
    localStorage.removeItem(AUDIT_KEY);
  }

  // ─── LOW-LEVEL STORAGE ───────────────────────────────────────────────────────
  function _getTable(tableName) {
    try {
      return JSON.parse(localStorage.getItem(TABLES[tableName]) || '[]');
    } catch {
      return [];
    }
  }

  function _setTable(tableName, data) {
    localStorage.setItem(TABLES[tableName], JSON.stringify(data));
  }

  function _getCounters() {
    try {
      return JSON.parse(localStorage.getItem(TABLES.counters) || '{}');
    } catch {
      return {};
    }
  }

  function _setCounters(counters) {
    localStorage.setItem(TABLES.counters, JSON.stringify(counters));
  }

  // ─── ID GENERATION ───────────────────────────────────────────────────────────
  function generateId(tableName) {
    const counters = _getCounters();
    const current = counters[tableName] || 0;
    const next = current + 1;
    counters[tableName] = next;
    _setCounters(counters);
    const prefix = PREFIXES[tableName] || 'REC';
    return `${prefix}${String(next).padStart(4, '0')}`;
  }

  // ─── TIMESTAMP ───────────────────────────────────────────────────────────────
  function now() {
    return new Date().toISOString();
  }

  function formatDate(isoString) {
    if (!isoString) return '—';
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatDateTime(isoString) {
    if (!isoString) return '—';
    const d = new Date(isoString);
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  // ─── ACTIVITY LOG ─────────────────────────────────────────────────────────────
  function createActivity(type, text, actor = 'Admin') {
    return { type, text, actor, timestamp: now() };
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────────────
  function create(tableName, data, actor = 'Admin') {
    // Auto-link or create users for incoming messages
    if (tableName === 'messages' && !data.linkedUserId && (data.fromEmail || data.fromName || data.fromPhone)) {
      const first = (data.fromName||'New').split(' ')[0];
      const last = (data.fromName||'Inquiry').split(' ').slice(1).join(' ');
      const match = findDuplicateUser(data.fromEmail, first, last, data.fromPhone);
      
      if (match && match.match) {
        data.linkedUserId = match.match.id;
        data.activityLog = [...(data.activityLog || []), createActivity('linked', `Auto-linked to existing user ${match.match.id}`, 'System')];
      } else {
        // Create new user profile
        const newUser = create('users', {
          firstName: first,
          lastName: last,
          email: data.fromEmail || '',
          phone: data.fromPhone || '',
          status: 'Active',
          userTypes: ['Other'],
          tags: ['New Contact'],
          notes: 'Profile automatically created from inbound message/inquiry.'
        }, 'System');
        data.linkedUserId = newUser.id;
        data.activityLog = [...(data.activityLog || []), createActivity('created', `Auto-created and linked new user profile ${newUser.id}`, 'System')];
      }
    }

    const table = _getTable(tableName);
    const id = generateId(tableName);
    const ts = now();
    const record = {
      ...data,
      id,
      createdAt: ts,
      updatedAt: ts,
      createdBy: actor,
      updatedBy: actor,
      activityLog: [
        createActivity('created', 'Record created', actor),
        ...(data.activityLog || []),
      ],
    };
    table.push(record);
    _setTable(tableName, table);
    logAudit('created', tableName, id);
    return record;
  }

  function getAll(tableName) {
    return _getTable(tableName);
  }

  function getById(tableName, id) {
    return _getTable(tableName).find(r => r.id === id) || null;
  }

  function update(tableName, id, changes, actor = 'Admin') {
    const table = _getTable(tableName);
    const idx = table.findIndex(r => r.id === id);
    if (idx === -1) return null;

    const old = table[idx];
    const activityEntries = [];

    // Detect meaningful field changes for activity log
    const skipFields = ['activityLog', 'updatedAt', 'updatedBy'];
    Object.keys(changes).forEach(key => {
      if (skipFields.includes(key)) return;
      const oldVal = JSON.stringify(old[key]);
      const newVal = JSON.stringify(changes[key]);
      if (oldVal !== newVal) {
        const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
        activityEntries.push(createActivity('updated', `${label} updated`, actor));
      }
    });

    table[idx] = {
      ...old,
      ...changes,
      id, // never overwrite
      createdAt: old.createdAt,
      createdBy: old.createdBy,
      updatedAt: now(),
      updatedBy: actor,
      activityLog: [...(old.activityLog || []), ...activityEntries],
    };
    _setTable(tableName, table);
    return table[idx];
  }

  function remove(tableName, id, actor = 'Admin') {
    const table = _getTable(tableName);
    const idx = table.findIndex(r => r.id === id);
    if (idx === -1) return false;
    table.splice(idx, 1);
    _setTable(tableName, table);
    logAudit('deleted', tableName, id);
    return true;
  }

  // ─── SEARCH & FILTER ─────────────────────────────────────────────────────────
  function search(tableName, query, fields) {
    if (!query || !query.trim()) return _getTable(tableName);
    const q = query.trim().toLowerCase();
    return _getTable(tableName).filter(record => {
      return fields.some(field => {
        const val = record[field];
        if (!val) return false;
        if (Array.isArray(val)) return val.some(v => String(v).toLowerCase().includes(q));
        return String(val).toLowerCase().includes(q);
      });
    });
  }

  function filter(tableName, criteria) {
    return _getTable(tableName).filter(record => {
      return Object.entries(criteria).every(([key, val]) => {
        if (!val || val === 'all' || val === '') return true;
        const recVal = record[key];
        if (Array.isArray(recVal)) return recVal.includes(val);
        return String(recVal).toLowerCase() === String(val).toLowerCase();
      });
    });
  }

  // Combined search + filter
  function query(tableName, { searchText, searchFields, filters, sortField, sortDir = 'asc', page = 1, perPage = 50 }) {
    let results = _getTable(tableName);

    // Apply filter
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

    // Apply search
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

    // Sort
    if (sortField) {
      results = [...results].sort((a, b) => {
        const av = String(a[sortField] || '').toLowerCase();
        const bv = String(b[sortField] || '').toLowerCase();
        const cmp = av.localeCompare(bv);
        return sortDir === 'asc' ? cmp : -cmp;
      });
    } else {
      // Default: newest first
      results = [...results].sort((a, b) => {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
    }

    // Paginate
    const total = results.length;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const start = (page - 1) * perPage;
    const items = results.slice(start, start + perPage);

    return { items, total, page, totalPages, perPage };
  }

  // ─── RELATIONSHIP HELPERS ─────────────────────────────────────────────────────
  function addLink(tableName, recordId, linkField, linkedId, actor = 'Admin') {
    const record = getById(tableName, recordId);
    if (!record) return null;
    const existing = record[linkField] || [];
    if (existing.includes(linkedId)) return record;
    const updated = update(tableName, recordId, { [linkField]: [...existing, linkedId] }, actor);
    // Add activity
    const table = _getTable(tableName);
    const idx = table.findIndex(r => r.id === recordId);
    if (idx !== -1) {
      table[idx].activityLog.push(createActivity('linked', `Linked record ${linkedId}`, actor));
      _setTable(tableName, table);
    }
    return updated;
  }

  function removeLink(tableName, recordId, linkField, linkedId, actor = 'Admin') {
    const record = getById(tableName, recordId);
    if (!record) return null;
    const existing = record[linkField] || [];
    return update(tableName, recordId, {
      [linkField]: existing.filter(id => id !== linkedId)
    }, actor);
  }

  // Get all records from tableB that are linked to recordA
  function getLinked(tableName, linkField, linkedValue) {
    return _getTable(tableName).filter(r => {
      const val = r[linkField];
      if (Array.isArray(val)) return val.includes(linkedValue);
      return val === linkedValue;
    });
  }

  // ─── EXPORT ──────────────────────────────────────────────────────────────────
  function exportCSV(tableName) {
    const records = _getTable(tableName);
    if (!records.length) return '';
    const keys = Object.keys(records[0]).filter(k => k !== 'activityLog');
    const header = keys.join(',');
    const rows = records.map(r =>
      keys.map(k => {
        const val = r[k];
        if (Array.isArray(val)) return `"${val.join('; ')}"`;
        if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
          return `"${val.replace(/"/g, '""')}"`;
        }
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
    a.href = url;
    a.download = filename || `${tableName}-export.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ─── IMPORT ──────────────────────────────────────────────────────────────────
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
    try {
      return JSON.parse(localStorage.getItem(TABLES.settings) || '{}');
    } catch { return {}; }
  }

  function saveSettings(settings) {
    localStorage.setItem(TABLES.settings, JSON.stringify(settings));
  }

  // ─── AUCTION STATUS AUTOMATION ───────────────────────────────────────────────

  // Pure function: compute the correct status based on dates + fields
  // Returns the computed status string, or null if no change needed
  function computeAuctionStatus(record) {
    const today = new Date();
    today.setHours(0,0,0,0);

    const toDate = s => { if (!s) return null; const d = new Date(s); d.setHours(0,0,0,0); return d; };

    const launchDate   = toDate(record.launchDate);
    const endDate      = toDate(record.endDate);
    const confirmedDate = toDate(record.confirmedPlayDate);

    // Round Complete — only set manually; never auto-downgrade
    if (record.status === 'Round Complete') return 'Round Complete';

    // Round Complete Follow Up: confirmed date is in the past
    if (confirmedDate && today > confirmedDate) return 'Round Complete Follow Up';

    // Round Scheduled: confirmed date set and in the future
    if (confirmedDate && today <= confirmedDate) return 'Round Scheduled';

    // Buyer assigned, no confirmed date yet -> default to 'Waiting to reach out'
    if (record.buyerId && !confirmedDate) return 'Waiting to reach out';

    // Auction Closed: past end date, no buyer
    if (endDate && today > endDate && !record.buyerId) return 'Auction Closed';

    // Auction Live: between launch and end
    if (launchDate && endDate && today >= launchDate && today <= endDate) return 'Auction Live';

    // Auction Booked: launch date set, not live yet
    if (launchDate && today < launchDate) return 'Auction Booked';

    // Auction Pending: donor set, no launch date
    if (record.donorId && !launchDate) return 'Auction Pending';

    // Default: New
    return 'New';
  }

  function refreshAllAuctionStatuses() {
    const auctions = _getTable('auctions');
    let changed = false;
    auctions.forEach((a, i) => {
      // Never auto-overwrite these statuses
      if (a.status === 'Round Complete') return;
      if (a._manualStatus) return; // manually pinned by user or conversion
      const computed = computeAuctionStatus(a);
      if (computed && computed !== a.status) {
        auctions[i] = { ...a, status: computed, updatedAt: now() };
        changed = true;
      }
    });
    if (changed) _setTable('auctions', auctions);
  }

  // ─── USER-SPECIFIC HELPERS ────────────────────────────────────────────────────

  // Aggregate all linked records for a user across all tables
  function getUserActivity(userId) {
    return {
      auctionsDonated:      _getTable('auctions').filter(a => a.donorId === userId),
      auctionsBought:       _getTable('auctions').filter(a => a.buyerId === userId),
      opportunitiesDonated: _getTable('opportunities').filter(o => o.donorId === userId),
      opportunitiesJoined:  _getTable('opportunities').filter(o => o.interestedUserId === userId),
      tasks:                _getTable('tasks').filter(t => t.assignedToId === userId || t.relatedUserId === userId),
      donations:            _getTable('donations').filter(d => d.donorId === userId),
      events:               _getTable('events').filter(e => (e.userIds || []).includes(userId)),
    };
  }

  // Sum financials for a user
  function getUserFinancialSummary(userId) {
    const bought     = _getTable('auctions').filter(a => a.buyerId === userId && a.finalPrice);
    const donated    = _getTable('donations').filter(d => d.donorId === userId && d.value);
    const oppsDonated = _getTable('opportunities').filter(o => o.donorId === userId && o.value);
    const totalSpent    = bought.reduce((s, a) => s + (Number(a.finalPrice) || 0), 0);
    const totalDonated  = donated.reduce((s, d) => s + (Number(d.value) || 0), 0)
                        + oppsDonated.reduce((s, o) => s + (Number(o.value) || 0), 0);
    return { totalSpent, totalDonated, bought, donated, oppsDonated };
  }

  // Detect duplicates before creating a user
  function findDuplicateUser(email, firstName, lastName, phone) {
    const users = _getTable('users');
    if (email) {
      const byEmail = users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
      if (byEmail) return { match: byEmail, reason: 'email' };
    }
    if (firstName && lastName && phone) {
      const fn = firstName.toLowerCase(); const ln = lastName.toLowerCase(); const ph = phone.replace(/\D/g, '');
      const byName = users.find(u =>
        u.firstName && u.lastName && u.phone &&
        u.firstName.toLowerCase() === fn &&
        u.lastName.toLowerCase() === ln &&
        u.phone.replace(/\D/g, '') === ph
      );
      if (byName) return { match: byName, reason: 'name+phone' };
    }
    return null;
  }

  // ─── STATS ────────────────────────────────────────────────────────────────────
  function getStats() {
    const today = new Date().toISOString().split('T')[0];
    const tasks      = _getTable('tasks');
    const auctions   = _getTable('auctions');
    const opps       = _getTable('opportunities');
    const users      = _getTable('users');
    const fins       = _getTable('financials');
    const donations  = _getTable('donations');

    const tasksDueToday = tasks.filter(t => t.dueDate === today && t.status !== 'Complete' && t.status !== 'Cancelled').length;
    const tasksOverdue  = tasks.filter(t => t.dueDate && t.dueDate < today && t.status !== 'Complete' && t.status !== 'Cancelled').length;

    // Revenue: sum from auctions (salePrice) and opportunities (sellPrice)
    const auctSaleValue = auctions.filter(a => a.sellPrice).reduce((s, a) => s + (parseFloat(a.sellPrice) || 0), 0);
    const oppSaleValue  = opps.filter(o => o.sellPrice).reduce((s, o) => s + (parseFloat(o.sellPrice) || 0), 0);
    const totalFMV      = [...auctions, ...opps].reduce((s, r) => s + (parseFloat(r.fmv) || 0), 0);
    const totalSaleValue = auctSaleValue + oppSaleValue;

    // Financial records revenue
    const finActualRevenue = fins.filter(f => f.revenueStatus === 'Recorded' || f.revenueStatus === 'Complete').reduce((s, f) => s + (parseFloat(f.actualRevenue) || 0), 0);
    const finEstRevenue    = fins.reduce((s, f) => s + (parseFloat(f.estimatedRevenue) || 0), 0);

    return {
      // Counts
      users:              users.length,
      auctions:           auctions.length,
      opportunities:      opps.length,
      courses:            _getTable('courses').length,
      donations:          donations.length,
      activeDonations:    donations.filter(d => d.status !== 'Complete').length,
      tasks:              tasks.length,
      financials:         fins.length,
      messages:           _getTable('messages').length,
      events:             _getTable('events').length,
      admins:             _getTable('admins').length,

      // Task breakdown
      openTasks:          tasks.filter(t => t.status === 'Open' || t.status === 'In Progress').length,
      tasksDueToday,
      tasksOverdue,

      // Auction pipeline
      auctionNew:              auctions.filter(a => a.status === 'New').length,
      auctionPending:          auctions.filter(a => a.status === 'Auction Pending').length,
      auctionBooked:           auctions.filter(a => a.status === 'Auction Booked').length,
      auctionLive:             auctions.filter(a => a.status === 'Auction Live').length,
      auctionClosed:           auctions.filter(a => a.status === 'Auction Closed').length,
      auctionRoundPending:     auctions.filter(a => ['Waiting to reach out', 'Wait on buyer', 'Waiting on donor', 'Wait # days to book'].includes(a.status)).length,
      auctionRoundScheduled:   auctions.filter(a => a.status === 'Round Scheduled').length,
      auctionRoundFollowUp:    auctions.filter(a => a.status === 'Round Complete Follow Up').length,
      auctionRoundComplete:    auctions.filter(a => a.status === 'Round Complete').length,
      activeAuctions:          auctions.filter(a => a.status === 'Auction Live').length,

      // Opportunity pipeline
      oppsNew:             opps.filter(o => o.status === 'New').length,
      oppsAvailable:       opps.filter(o => o.status === 'Available').length,
      oppsReserved:        opps.filter(o => o.status === 'Reserved').length,
      oppsSold:            opps.filter(o => o.status === 'Sold').length,
      oppsRoundPending:    opps.filter(o => ['Waiting to reach out', 'Wait on buyer', 'Waiting on donor', 'Wait # days to book'].includes(o.status)).length,
      oppsRoundScheduled:  opps.filter(o => o.status === 'Round Scheduled').length,
      oppsRoundFollowUp:   opps.filter(o => o.status === 'Round Complete Follow Up').length,
      oppsComplete:        opps.filter(o => o.status === 'Complete').length,

      // User breakdown
      usersMembers:   users.filter(u => (u.userTypes || []).includes('Member')).length,
      usersDonors:    users.filter(u => (u.userTypes || []).includes('Donor')).length,
      usersBuyers:    users.filter(u => (u.userTypes || []).includes('Buyer')).length,
      usersBrokers:   users.filter(u => (u.userTypes || []).includes('Broker')).length,

      // Donations
      donationsUnassigned: donations.filter(d => d.status === 'Unassigned' || d.status === 'New').length,

      // Revenue
      totalFMV:         Math.round(totalFMV),
      totalSaleValue:   Math.round(totalSaleValue),
      finActualRevenue: Math.round(finActualRevenue),
      finEstRevenue:    Math.round(finEstRevenue),

      // Events
      openMessages:   _getTable('messages').filter(m => m.status === 'Open').length,
      upcomingEvents: _getTable('events').filter(e => e.status === 'Upcoming').length,
    };
  }

  // Get recent activity across all tables (most recent N entries)
  function getRecentActivity(limit = 20) {
    const allActivity = [];
    Object.keys(TABLES).forEach(tableName => {
      if (['counters', 'settings'].includes(tableName)) return;
      _getTable(tableName).forEach(record => {
        (record.activityLog || []).forEach(entry => {
          allActivity.push({
            ...entry,
            tableName,
            recordId: record.id,
            recordLabel: record.name || record.title || record.firstName
              ? `${record.firstName || ''} ${record.lastName || record.title || record.name || ''}`.trim()
              : record.id,
          });
        });
      });
    });
    return allActivity
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }

  // ─── PUBLIC API ───────────────────────────────────────────────────────────────
  return {
    // Constants
    TABLES,
    PREFIXES,
    STATUS,
    USER_TYPES,
    TAG_OPTIONS,

    // Auction constants
    AUCTION_TYPES,
    ROUND_TYPES,
    SCHEDULING_STATUS,
    AUCTION_VISIBILITY,
    AUCTION_CATEGORIES,

    // Task constants
    TASK_TYPES,
    TASK_PRIORITIES,

    // Opportunity / Donation / Course constants
    OPPORTUNITY_TYPES,
    DONATION_TYPES,
    ASSIGNED_TO_TYPES,
    COURSE_TYPES,
    COURSE_TIERS,
    COURSE_REGIONS,
    FINANCIAL_RECORD_TYPES,
    RECEIPT_CATEGORIES,
    RECEIPT_SUBCATEGORIES,
    RECEIPT_PAYMENT_METHODS,
    RECEIPT_DEPARTMENTS,
    ADMIN_ROLES,

    // Qualified Buyer / Waitlist constants
    BUYER_TIERS,
    INTEREST_LEVELS,
    BUDGET_TIERS,
    TRAVEL_OPTIONS,

    // Audit log
    logAudit,
    getAuditLog,
    clearAuditLog,

    // Core CRUD
    create,
    getAll,
    getById,
    update,
    remove,

    // Querying
    query,
    search,
    filter,

    // Relationships
    addLink,
    removeLink,
    getLinked,

    // Utilities
    now,
    formatDate,
    formatDateTime,
    generateId,

    // Import/Export
    exportCSV,
    downloadCSV,
    parseCSV,

    // Settings
    getSettings,
    saveSettings,

    // Dashboard
    getStats,
    getRecentActivity,

    // User-specific
    getUserActivity,
    getUserFinancialSummary,
    findDuplicateUser,

    // Auction automation
    computeAuctionStatus,
    refreshAllAuctionStatuses,

    // Helpers for direct access
    _getTable,
    createActivity,
  };
})();

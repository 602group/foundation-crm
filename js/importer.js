/**
 * EPIC Foundation CRM — Importer Engine (Chunk 7)
 * Handles: file parsing (CSV + Excel), field schemas, status normalization,
 * date normalization, validation, duplicate detection, linked-record resolution,
 * import execution, and import history.
 */

const Importer = (() => {
  'use strict';

  const HISTORY_KEY = 'crm_import_history';

  // ─── FILE PARSING ─────────────────────────────────────────────────────────────

  /** Parse a CSV string into an array of row objects. Handles quoted fields. */
  function parseCSVString(text) {
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    const nonEmpty = lines.filter(l => l.trim());
    if (!nonEmpty.length) return { headers: [], rows: [] };

    function parseLine(line) {
      const vals = [];
      let cur = '', inQ = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQ && line[i+1] === '"') { cur += '"'; i++; }
          else inQ = !inQ;
        } else if (ch === ',' && !inQ) {
          vals.push(cur.trim()); cur = '';
        } else {
          cur += ch;
        }
      }
      vals.push(cur.trim());
      return vals;
    }

    const headers = parseLine(nonEmpty[0]).map(h => h.replace(/^"|"$/g, '').trim());
    const rows = nonEmpty.slice(1).filter(l => l.trim()).map(line => {
      const vals = parseLine(line);
      const obj = {};
      headers.forEach((h, i) => { obj[h] = (vals[i] || '').toString().trim(); });
      return obj;
    });
    return { headers, rows };
  }

  /** Read a File object → { headers, rows } */
  async function parseFile(file) {
    return new Promise((resolve, reject) => {
      const name = file.name.toLowerCase();
      const reader = new FileReader();

      if (name.endsWith('.csv')) {
        reader.onload = e => {
          try { resolve(parseCSVString(e.target.result)); }
          catch(err) { reject(err); }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
      } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
        reader.onload = e => {
          try {
            if (typeof XLSX === 'undefined') { reject(new Error('SheetJS not loaded')); return; }
            const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array', cellDates: true });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, dateNF: 'yyyy-mm-dd' });
            if (!data.length) { resolve({ headers: [], rows: [] }); return; }
            const headers = (data[0] || []).map(h => String(h || '').trim()).filter(Boolean);
            const rows = data.slice(1).filter(r => r.some(c => c != null && c !== '')).map(r => {
              const obj = {};
              headers.forEach((h, i) => { obj[h] = (r[i] != null ? String(r[i]).trim() : ''); });
              return obj;
            });
            resolve({ headers, rows });
          } catch(err) { reject(err); }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsArrayBuffer(file);
      } else {
        reject(new Error('Unsupported file type. Please use .csv, .xlsx, or .xls'));
      }
    });
  }

  // ─── FIELD SCHEMAS ────────────────────────────────────────────────────────────

  /**
   * Each entry: { key, label, required?, type: 'text'|'number'|'date'|'status'|'array', linked? }
   * linked: 'users'|'courses'|'auctions'|'opportunities'|'donations' — the row holds a NAME, not an ID
   */
  const SCHEMAS = {
    auctions: {
      idField: 'id',
      requiredFields: ['shortName'],
      fields: [
        { key: 'id',              label: 'Auction ID (for updates)' },
        { key: 'itemNumber',      label: 'Item Number' },
        { key: 'shortName',       label: 'Short Name',       required: true },
        { key: 'description',     label: 'Description' },
        { key: 'type',            label: 'Type' },
        { key: 'fmv',             label: 'FMV ($)',           type: 'number' },
        { key: 'startingBid',     label: 'Starting Bid ($)',  type: 'number' },
        { key: 'bidIncrement',    label: 'Bid Increment ($)', type: 'number' },
        { key: 'quantity',        label: 'Quantity',          type: 'number' },
        { key: 'sellPrice',       label: 'Sell / Sale Price ($)', type: 'number' },
        { key: 'buyNowPrice',     label: 'Buy Now Price ($)', type: 'number' },
        { key: 'launchDate',      label: 'Launch Date',       type: 'date' },
        { key: 'endDate',         label: 'End Date',          type: 'date' },
        { key: 'status',          label: 'Status',            type: 'status' },
        { key: 'givesmartUrl',    label: 'GiveSmart URL' },
        { key: 'itemToken',       label: 'Item Token' },
        { key: 'eventCode',       label: 'Event Code' },
        { key: 'courseName',      label: 'Course Name',       linked: 'courses',  linkedId: 'courseId' },
        { key: 'donorName',       label: 'Donated By (name)', linked: 'users',    linkedId: 'donorId', searchFields: ['firstName','lastName'] },
        { key: 'buyerName',       label: 'Buyer (name)',      linked: 'users',    linkedId: 'buyerId',  searchFields: ['firstName','lastName'] },
        { key: 'confirmedPlayDate', label: 'Confirmed Play Date', type: 'date' },
        { key: 'schedulingStatus',  label: 'Scheduling Status' },
        { key: 'notes',           label: 'Notes' },
      ],
    },

    users: {
      idField: 'id',
      requiredFields: ['firstName', 'lastName'],
      fields: [
        { key: 'id',          label: 'User ID (for updates)' },
        { key: 'firstName',   label: 'First Name',  required: true },
        { key: 'lastName',    label: 'Last Name',   required: true },
        { key: 'email',       label: 'Email' },
        { key: 'phone',       label: 'Phone' },
        { key: 'userTypes',   label: 'User Type(s)', type: 'array', hint: 'e.g. Member, Donor' },
        { key: 'city',        label: 'City' },
        { key: 'state',       label: 'State' },
        { key: 'status',      label: 'Status',       type: 'status' },
        { key: 'notes',       label: 'Notes' },
        { key: 'tags',        label: 'Tags',         type: 'array' },
      ],
    },

    opportunities: {
      idField: 'id',
      requiredFields: ['shortName'],
      fields: [
        { key: 'id',           label: 'Opp ID (for updates)' },
        { key: 'shortName',    label: 'Short Name',  required: true },
        { key: 'description',  label: 'Description' },
        { key: 'type',         label: 'Type' },
        { key: 'status',       label: 'Status',       type: 'status' },
        { key: 'fmv',          label: 'FMV ($)',       type: 'number' },
        { key: 'sellPrice',    label: 'Sell Price ($)',type: 'number' },
        { key: 'buyNowPrice',  label: 'Buy Now Price ($)', type: 'number' },
        { key: 'courseName',   label: 'Course Name',   linked: 'courses', linkedId: 'courseId' },
        { key: 'donorName',    label: 'Donor (name)',  linked: 'users',   linkedId: 'donorId', searchFields: ['firstName','lastName'] },
        { key: 'buyerName',    label: 'Buyer (name)',  linked: 'users',   linkedId: 'buyerId',  searchFields: ['firstName','lastName'] },
        { key: 'confirmedPlayDate', label: 'Confirmed Play Date', type: 'date' },
        { key: 'notes',        label: 'Notes' },
      ],
    },

    courses: {
      idField: 'id',
      requiredFields: ['name'],
      fields: [
        { key: 'id',       label: 'Course ID (for updates)' },
        { key: 'name',     label: 'Course Name',  required: true },
        { key: 'city',     label: 'City' },
        { key: 'state',    label: 'State' },
        { key: 'type',     label: 'Type' },
        { key: 'tier',     label: 'Tier' },
        { key: 'region',   label: 'Region' },
        { key: 'status',   label: 'Status', type: 'status' },
        { key: 'website',  label: 'Website' },
        { key: 'phone',    label: 'Phone' },
        { key: 'notes',    label: 'Notes' },
      ],
    },

    donations: {
      idField: 'id',
      requiredFields: ['description'],
      fields: [
        { key: 'id',          label: 'Donation ID (for updates)' },
        { key: 'description', label: 'Donation Name/Desc', required: true },
        { key: 'type',        label: 'Type' },
        { key: 'status',      label: 'Status', type: 'status' },
        { key: 'quantity',    label: 'Quantity', type: 'number' },
        { key: 'value',       label: 'Value ($)', type: 'number' },
        { key: 'dateDonated', label: 'Date Donated', type: 'date' },
        { key: 'donorName',   label: 'Donor (name)', linked: 'users', linkedId: 'donorId', searchFields: ['firstName','lastName'] },
        { key: 'courseName',  label: 'Course Name',  linked: 'courses', linkedId: 'courseId' },
        { key: 'notes',       label: 'Notes' },
      ],
    },

    tasks: {
      idField: 'id',
      requiredFields: ['title'],
      fields: [
        { key: 'id',          label: 'Task ID (for updates)' },
        { key: 'title',       label: 'Task Title', required: true },
        { key: 'description', label: 'Description' },
        { key: 'taskType',    label: 'Task Type' },
        { key: 'status',      label: 'Status', type: 'status' },
        { key: 'priority',    label: 'Priority' },
        { key: 'dueDate',     label: 'Due Date', type: 'date' },
        { key: 'notes',       label: 'Notes' },
      ],
    },

    financials: {
      idField: 'id',
      requiredFields: ['description'],
      fields: [
        { key: 'id',               label: 'Financial ID (for updates)' },
        { key: 'description',      label: 'Description', required: true },
        { key: 'recordType',       label: 'Record Type' },
        { key: 'revenueStatus',    label: 'Revenue Status', type: 'status' },
        { key: 'fmv',              label: 'FMV ($)',              type: 'number' },
        { key: 'salePrice',        label: 'Sale Price ($)',       type: 'number' },
        { key: 'estimatedRevenue', label: 'Est. Revenue ($)',     type: 'number' },
        { key: 'actualRevenue',    label: 'Actual Revenue ($)',   type: 'number' },
        { key: 'dateRecorded',     label: 'Date Recorded',        type: 'date' },
        { key: 'internalNotes',    label: 'Internal Notes' },
      ],
    },
  };

  // ─── STATUS NORMALIZATION ─────────────────────────────────────────────────────

  const STATUS_MAPS = {
    auctions: {
      'new': 'New', 'auction pending': 'Auction Pending', 'pending': 'Auction Pending',
      'auction booked': 'Auction Booked', 'booked': 'Auction Booked',
      'auction live': 'Auction Live', 'live': 'Auction Live', 'active': 'Auction Live',
      'auction closed': 'Auction Closed', 'closed': 'Auction Closed',
      'round pending': 'Waiting to reach out', 'scheduling': 'Waiting to reach out',
      'round scheduled': 'Round Scheduled', 'scheduled': 'Round Scheduled',
      'round complete follow up': 'Round Complete Follow Up', 'follow up': 'Round Complete Follow Up', 'followup': 'Round Complete Follow Up',
      'round complete': 'Round Complete', 'complete': 'Round Complete', 'completed': 'Round Complete',
    },
    opportunities: {
      'new': 'New', 'available': 'Available', 'reserved': 'Reserved', 'sold': 'Sold',
      'round pending': 'Waiting to reach out', 'round scheduled': 'Round Scheduled',
      'round complete follow up': 'Round Complete Follow Up', 'follow up': 'Round Complete Follow Up',
      'complete': 'Complete', 'completed': 'Complete',
    },
    users: { 'active': 'Active', 'inactive': 'Inactive' },
    courses: { 'active': 'Active', 'inactive': 'Inactive' },
    donations: {
      'new': 'New', 'unassigned': 'Unassigned', 'assigned': 'Assigned',
      'used': 'Used', 'complete': 'Complete', 'completed': 'Complete',
    },
    tasks: {
      'open': 'Open', 'in progress': 'In Progress', 'inprogress': 'In Progress',
      'waiting': 'Waiting', 'complete': 'Complete', 'completed': 'Complete', 'cancelled': 'Cancelled', 'canceled': 'Cancelled',
    },
    financials: {
      'estimated': 'Estimated', 'pending': 'Pending',
      'recorded': 'Recorded', 'complete': 'Complete', 'completed': 'Complete',
    },
  };

  function normalizeStatus(raw, tableName) {
    if (!raw) return null;
    const key = raw.toLowerCase().replace(/[-_\/]/g, ' ').trim();
    const map = STATUS_MAPS[tableName] || {};
    return map[key] || null;
  }

  // ─── DATE NORMALIZATION ───────────────────────────────────────────────────────

  function normalizeDate(raw) {
    if (!raw) return null;
    const s = String(raw).trim();
    if (!s) return null;

    // Already ISO: YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

    // MM/DD/YYYY or M/D/YYYY
    const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (mdy) {
      const y = mdy[3].length === 2 ? '20' + mdy[3] : mdy[3];
      return `${y}-${mdy[1].padStart(2,'0')}-${mdy[2].padStart(2,'0')}`;
    }

    // YYYY/MM/DD
    const ymd = s.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
    if (ymd) return `${ymd[1]}-${ymd[2]}-${ymd[3]}`;

    // Excel serial number (number-like)
    if (/^\d+$/.test(s) && Number(s) > 40000) {
      try {
        const d = new Date(Math.round((Number(s) - 25569) * 86400 * 1000));
        return d.toISOString().split('T')[0];
      } catch { return null; }
    }

    // Try native Date parsing
    try {
      const d = new Date(s);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    } catch { }

    return null;
  }

  // ─── AUTO-MATCH COLUMN HEADERS TO FIELDS ─────────────────────────────────────

  /** Returns best-guess mapping: { spreadsheetHeader → schema field key } */
  function autoMatch(headers, tableName) {
    const schema = SCHEMAS[tableName];
    if (!schema) return {};
    const mapping = {};
    const normalize = s => s.toLowerCase().replace(/[\s_\-\/\(\)]/g, '');

    headers.forEach(h => {
      const hN = normalize(h);
      // Try exact match on label or key
      const match = schema.fields.find(f =>
        normalize(f.label) === hN || normalize(f.key) === hN ||
        // common aliases
        (hN === 'shortname' && f.key === 'shortName') ||
        (hN === 'firstname' && f.key === 'firstName') ||
        (hN === 'lastname' && f.key === 'lastName') ||
        (hN === 'givesmarturl' && f.key === 'givesmartUrl') ||
        (hN === 'donatedby' && f.key === 'donorName') ||
        (hN === 'donor' && f.key === 'donorName') ||
        (hN === 'buyer' && f.key === 'buyerName') ||
        (hN === 'course' && f.key === 'courseName') ||
        (hN === 'coursename' && f.key === 'courseName') ||
        (hN === 'launchdate' && f.key === 'launchDate') ||
        (hN === 'enddate' && f.key === 'endDate') ||
        (hN === 'itemnumber' && f.key === 'itemNumber') ||
        (hN === 'itemtoken' && f.key === 'itemToken') ||
        (hN === 'fmv' && f.key === 'fmv') ||
        (hN === 'fairmarketvalue' && f.key === 'fmv') ||
        (hN === 'startingbid' && f.key === 'startingBid') ||
        (hN === 'duedate' && f.key === 'dueDate') ||
        (hN === 'tasktype' && f.key === 'taskType') ||
        (hN === 'usertype' && f.key === 'userTypes') ||
        (hN === 'usertypes' && f.key === 'userTypes') ||
        (hN === 'salesprice' && f.key === 'sellPrice') ||
        (hN === 'saleprice' && f.key === 'sellPrice') ||
        (hN === 'sellprice' && f.key === 'sellPrice')
      );
      if (match) mapping[h] = match.key;
    });
    return mapping;
  }

  // ─── DUPLICATE DETECTION ──────────────────────────────────────────────────────

  function detectDuplicate(row, mappedData, tableName) {
    const existing = Store._getTable(tableName);

    if (tableName === 'auctions') {
      const byId = mappedData.id ? existing.find(r => r.id === mappedData.id) : null;
      if (byId) return { match: byId, reason: 'Matching Auction ID', type: 'exact' };
      const byToken = mappedData.itemToken ? existing.find(r => r.itemToken && r.itemToken === mappedData.itemToken) : null;
      if (byToken) return { match: byToken, reason: 'Matching Item Token', type: 'exact' };
      const byNumber = mappedData.itemNumber ? existing.find(r => r.itemNumber && r.itemNumber === mappedData.itemNumber) : null;
      if (byNumber) return { match: byNumber, reason: 'Matching Item Number', type: 'exact' };
      const byUrl = mappedData.givesmartUrl ? existing.find(r => r.givesmartUrl && r.givesmartUrl === mappedData.givesmartUrl) : null;
      if (byUrl) return { match: byUrl, reason: 'Matching GiveSmart URL', type: 'exact' };
      if (mappedData.shortName && mappedData.launchDate) {
        const byName = existing.find(r => r.shortName && r.shortName.toLowerCase() === mappedData.shortName.toLowerCase() && r.launchDate === mappedData.launchDate);
        if (byName) return { match: byName, reason: 'Same short name + launch date', type: 'warn' };
      }
    }

    if (tableName === 'users') {
      const byId = mappedData.id ? existing.find(r => r.id === mappedData.id) : null;
      if (byId) return { match: byId, reason: 'Matching User ID', type: 'exact' };
      const byEmail = mappedData.email ? existing.find(r => r.email && r.email.toLowerCase() === mappedData.email.toLowerCase()) : null;
      if (byEmail) return { match: byEmail, reason: 'Matching email', type: 'exact' };
      if (mappedData.firstName && mappedData.lastName) {
        const fn = mappedData.firstName.toLowerCase(), ln = mappedData.lastName.toLowerCase();
        const byName = existing.find(r => r.firstName && r.lastName && r.firstName.toLowerCase() === fn && r.lastName.toLowerCase() === ln);
        if (byName) return { match: byName, reason: 'Same full name', type: 'warn' };
      }
    }

    if (tableName === 'courses') {
      const byId = mappedData.id ? existing.find(r => r.id === mappedData.id) : null;
      if (byId) return { match: byId, reason: 'Matching Course ID', type: 'exact' };
      if (mappedData.name) {
        const n = mappedData.name.toLowerCase();
        const byName = existing.find(r => r.name && r.name.toLowerCase() === n && (!mappedData.city || r.city === mappedData.city));
        if (byName) return { match: byName, reason: 'Same course name + city', type: 'exact' };
      }
    }

    if (tableName === 'opportunities') {
      const byId = mappedData.id ? existing.find(r => r.id === mappedData.id) : null;
      if (byId) return { match: byId, reason: 'Matching Opp ID', type: 'exact' };
      if (mappedData.shortName) {
        const sn = mappedData.shortName.toLowerCase();
        const byName = existing.find(r => r.shortName && r.shortName.toLowerCase() === sn);
        if (byName) return { match: byName, reason: 'Same short name', type: 'warn' };
      }
    }

    if (tableName === 'donations') {
      const byId = mappedData.id ? existing.find(r => r.id === mappedData.id) : null;
      if (byId) return { match: byId, reason: 'Matching Donation ID', type: 'exact' };
    }

    if (tableName === 'tasks') {
      const byId = mappedData.id ? existing.find(r => r.id === mappedData.id) : null;
      if (byId) return { match: byId, reason: 'Matching Task ID', type: 'exact' };
      if (mappedData.title && mappedData.dueDate) {
        const t = mappedData.title.toLowerCase();
        const byTitle = existing.find(r => r.title && r.title.toLowerCase() === t && r.dueDate === mappedData.dueDate);
        if (byTitle) return { match: byTitle, reason: 'Same title + due date', type: 'warn' };
      }
    }

    if (tableName === 'financials') {
      const byId = mappedData.id ? existing.find(r => r.id === mappedData.id) : null;
      if (byId) return { match: byId, reason: 'Matching Financial ID', type: 'exact' };
    }

    return null;
  }

  // ─── FUZZY MATCHING ENGINE ────────────────────────────────────────────────────

  /** Levenshtein distance between two strings */
  function levenshtein(a, b) {
    const m = a.length, n = b.length;
    if (!m) return n; if (!n) return m;
    const dp = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0));
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (a[i-1] === b[j-1]) dp[i][j] = dp[i-1][j-1];
        else dp[i][j] = 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
      }
    }
    return dp[m][n];
  }

  /** Returns 0–1 similarity score (1 = identical) */
  function fuzzyScore(a, b) {
    const s1 = a.toLowerCase().trim(), s2 = b.toLowerCase().trim();
    if (s1 === s2) return 1;
    const maxLen = Math.max(s1.length, s2.length);
    if (!maxLen) return 1;
    return 1 - levenshtein(s1, s2) / maxLen;
  }

  /** Find close matches for a name in a table. Returns [{id, displayName, score}] sorted desc */
  function findFuzzyMatches(name, tableName, threshold = 0.72) {
    if (!name || !name.trim()) return [];
    const all = Store._getTable(tableName);
    const results = [];
    all.forEach(r => {
      let displayName = '';
      let score = 0;
      if (tableName === 'users') {
        displayName = `${r.firstName || ''} ${r.lastName || ''}`.trim();
        // Score against full name
        score = fuzzyScore(name, displayName);
        // Also try just last name match
        if (score < threshold && r.lastName) {
          const lnScore = fuzzyScore(name.split(/\s+/).pop(), r.lastName);
          if (lnScore > score) score = lnScore;
        }
      } else if (tableName === 'courses') {
        displayName = r.name || '';
        score = fuzzyScore(name, displayName);
      }
      if (score >= threshold && displayName) {
        results.push({ id: r.id, displayName, score });
      }
    });
    return results.sort((a, b) => b.score - a.score).slice(0, 3);
  }

  // ─── LINKED RECORD RESOLVER ───────────────────────────────────────────────────

  /** Returns { id: string|null, closeMatches: [] } */
  function resolveLinked(name, tableName, searchFields) {
    if (!name) return { id: null, closeMatches: [] };
    const all = Store._getTable(tableName);
    const n = name.toLowerCase().trim();

    if (tableName === 'users' && searchFields && searchFields.includes('firstName')) {
      // Try full name match "First Last"
      const parts = n.split(/\s+/);
      if (parts.length >= 2) {
        const fn = parts[0], ln = parts.slice(1).join(' ');
        const byFull = all.find(u => u.firstName && u.lastName &&
          u.firstName.toLowerCase() === fn && u.lastName.toLowerCase() === ln);
        if (byFull) return { id: byFull.id, closeMatches: [] };
      }
      // Try last name only
      const byLast = all.find(u => u.lastName && u.lastName.toLowerCase() === n);
      if (byLast) return { id: byLast.id, closeMatches: [] };
      // No exact match — fuzzy
      return { id: null, closeMatches: findFuzzyMatches(name, 'users') };
    }

    if (tableName === 'courses') {
      const byName = all.find(c => c.name && c.name.toLowerCase() === n);
      if (byName) return { id: byName.id, closeMatches: [] };
      // No exact match — fuzzy
      return { id: null, closeMatches: findFuzzyMatches(name, 'courses') };
    }

    return { id: null, closeMatches: [] };
  }

  // ─── DATA TRANSFORMATION (apply mapping to a row) ─────────────────────────────

  function applyMapping(rawRow, mappings, tableName) {
    const schema = SCHEMAS[tableName];
    if (!schema) return { mapped: {}, errors: [], warnings: [] };

    const mapped = {};
    const errors = [];
    const warnings = [];

    // mappings: { spreadsheetHeader → schemaFieldKey | '__skip__' }
    Object.entries(mappings).forEach(([header, fieldKey]) => {
      if (!fieldKey || fieldKey === '__skip__') return;
      const rawVal = rawRow[header] || '';
      const fieldDef = schema.fields.find(f => f.key === fieldKey);
      if (!fieldDef) { mapped[fieldKey] = rawVal; return; }

      if (!rawVal && !rawVal.toString().trim()) { return; } // skip empties

      if (fieldDef.type === 'number') {
        const n = parseFloat(String(rawVal).replace(/[$,]/g, ''));
        if (!isNaN(n)) mapped[fieldKey] = n;
        else if (rawVal) warnings.push(`"${header}" value "${rawVal}" is not a valid number — skipped`);
      } else if (fieldDef.type === 'date') {
        const d = normalizeDate(rawVal);
        if (d) mapped[fieldKey] = d;
        else if (rawVal) warnings.push(`"${header}" value "${rawVal}" is not a recognized date format — skipped`);
      } else if (fieldDef.type === 'status') {
        const s = normalizeStatus(rawVal, tableName);
        if (s) mapped[fieldKey] = s;
        else { mapped[fieldKey] = rawVal; warnings.push(`Status "${rawVal}" not recognized — imported as-is`); }
      } else if (fieldDef.type === 'array') {
        mapped[fieldKey] = String(rawVal).split(/[,;|]/).map(v => v.trim()).filter(Boolean);
      } else {
        mapped[fieldKey] = rawVal;
      }
    });

    return { mapped, errors, warnings };
  }

  // ─── VALIDATION ───────────────────────────────────────────────────────────────

  function validate(rawRows, mappings, tableName) {
    const schema = SCHEMAS[tableName];
    if (!schema) return rawRows.map((r, i) => ({ ...r, _rowNum: i+2, _status: 'error', _errors: ['Unknown table'], _warnings: [], _duplicateInfo: null, _fuzzyMatches: {} }));

    // Required fields that are mapped
    const requiredMapped = (schema.requiredFields || []).filter(reqKey =>
      Object.values(mappings).includes(reqKey)
    );
    // Linked fields that are mapped
    const linkedFields = schema.fields.filter(f => f.linked && Object.values(mappings).includes(f.key));

    return rawRows.map((row, idx) => {
      const { mapped, errors, warnings } = applyMapping(row, mappings, tableName);
      const rowErrors = [...errors];
      const rowWarnings = [...warnings];
      const fuzzyMatches = {}; // { fieldKey: { inputValue, matches: [{id,displayName,score}] } }

      // Check required
      requiredMapped.forEach(reqKey => {
        const fieldDef = schema.fields.find(f => f.key === reqKey);
        if (!mapped[reqKey]) {
          rowErrors.push(`Missing required field: "${fieldDef?.label || reqKey}"`);
        }
      });

      // Check linked fields for exact/fuzzy matches
      linkedFields.forEach(f => {
        const nameVal = mapped[f.key];
        if (!nameVal) return;
        const { id, closeMatches } = resolveLinked(nameVal, f.linked, f.searchFields || ['name']);
        if (!id) {
          if (closeMatches.length > 0) {
            // Flag as fuzzy warning
            fuzzyMatches[f.key] = { inputValue: nameVal, linkedTable: f.linked, linkedId: f.linkedId, matches: closeMatches, label: f.label };
            rowWarnings.push(`"${nameVal}" not found in ${f.linked} — similar records exist (see review below)`);
          } else {
            rowWarnings.push(`"${nameVal}" not found in ${f.linked} — will create new record on import`);
          }
        }
      });

      // Duplicate detection
      const dupInfo = detectDuplicate(row, mapped, tableName);

      let status = 'ready';
      if (rowErrors.length) status = 'error';
      else if (dupInfo?.type === 'exact') status = 'duplicate';
      else if (rowWarnings.length || dupInfo?.type === 'warn' || Object.keys(fuzzyMatches).length) status = 'warning';

      return {
        _raw: row,
        _rowNum: idx + 2,
        _mapped: mapped,
        _status: status,
        _errors: rowErrors,
        _warnings: rowWarnings,
        _duplicateInfo: dupInfo || null,
        _fuzzyMatches: fuzzyMatches,      // populated when close-but-not-exact matches exist
        _linkedChoices: {},               // filled by wizard UI: { fieldKey: 'use:ID' | 'new' | 'skip' }
      };
    });
  }

  // ─── IMPORT EXECUTOR ─────────────────────────────────────────────────────────

  /**
   * action: 'create' | 'update' | 'both'
   * validatedRows: output from validate()
   */
  function execute(validatedRows, tableName, action) {
    const schema = SCHEMAS[tableName];
    let created = 0, updated = 0, skipped = 0, failed = 0;
    const failedRows = [];

    validatedRows.forEach(vRow => {
      try {
        if (vRow._status === 'error') { failed++; failedRows.push({ rowNum: vRow._rowNum, reason: vRow._errors.join('; ') }); return; }

        const mapped = { ...vRow._mapped };
        const dupInfo = vRow._duplicateInfo;
        const choices = vRow._linkedChoices || {};

        // Resolve linked fields — using user choices when available
        const schema_fields = schema.fields.filter(f => f.linked);
        schema_fields.forEach(f => {
          const nameVal = mapped[f.key];
          if (!nameVal) { delete mapped[f.key]; return; }

          const choice = choices[f.key]; // 'use:ID' | 'new' | 'skip' | undefined

          if (choice === 'skip') {
            delete mapped[f.key];
            return;
          }

          if (choice && choice.startsWith('use:')) {
            // User chose an existing record
            mapped[f.linkedId] = choice.slice(4);
            delete mapped[f.key];
            return;
          }

          // Re-resolve (exact match or auto-create on 'new')
          const { id, closeMatches } = resolveLinked(nameVal, f.linked, f.searchFields || ['name']);
          if (id) {
            mapped[f.linkedId] = id;
          } else if (choice === 'new' || closeMatches.length === 0) {
            // Auto-create the missing linked record
            let newRecord = null;
            if (f.linked === 'users') {
              const parts = nameVal.trim().split(/\s+/);
              const firstName = parts[0] || nameVal;
              const lastName = parts.slice(1).join(' ') || '';
              newRecord = Store.create('users', { firstName, lastName, status: 'Active', userTypes: ['Donor'] });
            } else if (f.linked === 'courses') {
              newRecord = Store.create('courses', { name: nameVal.trim(), status: 'Active' });
            }
            if (newRecord) mapped[f.linkedId] = newRecord.id;
          }
          // else: close matches exist but no choice made — leave blank
          delete mapped[f.key];
        });

        // Clean up id field — don't assign id as a data field
        const recordId = mapped.id;
        delete mapped.id;
        delete mapped.activityLog;
        delete mapped.createdAt;
        delete mapped.updatedAt;

        // Decide: create or update
        if (dupInfo?.type === 'exact') {
          // Exact duplicate found
          if (action === 'create') { skipped++; return; }
          // update or both — update the match
          const existingId = dupInfo.match.id;
          Store.update(tableName, existingId, mapped);
          updated++;
        } else {
          if (action === 'update') {
            // Update only, but this row has no ID/match → skip
            if (recordId) {
              const existing = Store.getById(tableName, recordId);
              if (existing) { Store.update(tableName, recordId, mapped); updated++; }
              else { skipped++; }
            } else { skipped++; }
            return;
          }
          // create or both — create new
          if (recordId) {
            // Explicit ID provided — try update first
            const existing = Store.getById(tableName, recordId);
            if (existing && (action === 'both')) { Store.update(tableName, recordId, mapped); updated++; return; }
          }
          Store.create(tableName, mapped);
          created++;
        }
      } catch(e) {
        failed++;
        failedRows.push({ rowNum: vRow._rowNum, reason: e.message || 'Unknown error' });
      }
    });

    return { created, updated, skipped, failed, failedRows };
  }

  // ─── IMPORT HISTORY ───────────────────────────────────────────────────────────

  function getHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
    catch { return []; }
  }

  function logHistory(entry) {
    const history = getHistory();
    history.unshift({ ...entry, id: Date.now().toString(36), timestamp: new Date().toISOString() });
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
  }

  function clearHistory() {
    localStorage.removeItem(HISTORY_KEY);
  }

  // ─── SMART EXPORT ─────────────────────────────────────────────────────────────

  /** Export a table with friendly column names and resolved linked record names */
  function smartExport(tableName) {
    const rows = Store._getTable(tableName);

    const resolveUser = id => {
      if (!id) return '';
      const u = Store.getById('users', id);
      return u ? `${u.firstName} ${u.lastName}` : id;
    };
    const resolveName = (table, id, field) => {
      if (!id) return '';
      const r = Store.getById(table, id);
      return r ? (r[field] || r.name || r.id) : id;
    };

    const EXPORT_DEFS = {
      auctions: {
        label: 'Auctions',
        cols: [
          { h: 'Auction ID',       f: r => r.id },
          { h: 'Item Number',      f: r => r.itemNumber || '' },
          { h: 'Short Name',       f: r => r.shortName || '' },
          { h: 'Status',          f: r => r.status || '' },
          { h: 'Type',            f: r => r.type || '' },
          { h: 'FMV',             f: r => r.fmv || '' },
          { h: 'Starting Bid',    f: r => r.startingBid || '' },
          { h: 'Sell Price',      f: r => r.sellPrice || '' },
          { h: 'Buy Now Price',   f: r => r.buyNowPrice || '' },
          { h: 'Launch Date',     f: r => r.launchDate || '' },
          { h: 'End Date',        f: r => r.endDate || '' },
          { h: 'GiveSmart URL',   f: r => r.givesmartUrl || '' },
          { h: 'Item Token',      f: r => r.itemToken || '' },
          { h: 'Donated By',      f: r => resolveUser(r.donorId) },
          { h: 'Buyer',           f: r => resolveUser(r.buyerId) },
          { h: 'Course',          f: r => resolveName('courses', r.courseId, 'name') },
          { h: 'Confirmed Play Date', f: r => r.confirmedPlayDate || '' },
          { h: 'Scheduling Status', f: r => r.schedulingStatus || '' },
          { h: 'Notes',           f: r => (r.notes || '').replace(/,/g, ';') },
        ],
      },
      users: {
        label: 'Users',
        cols: [
          { h: 'User ID',   f: r => r.id },
          { h: 'First Name', f: r => r.firstName || '' },
          { h: 'Last Name',  f: r => r.lastName || '' },
          { h: 'Email',      f: r => r.email || '' },
          { h: 'Phone',      f: r => r.phone || '' },
          { h: 'User Types', f: r => (r.userTypes || []).join('; ') },
          { h: 'City',       f: r => r.city || '' },
          { h: 'State',      f: r => r.state || '' },
          { h: 'Status',     f: r => r.status || '' },
          { h: 'Tags',       f: r => (r.tags || []).join('; ') },
          { h: 'Notes',      f: r => (r.notes || '').replace(/,/g, ';') },
        ],
      },
      opportunities: {
        label: 'Special Opportunities',
        cols: [
          { h: 'Opp ID',    f: r => r.id },
          { h: 'Short Name', f: r => r.shortName || '' },
          { h: 'Status',    f: r => r.status || '' },
          { h: 'Type',      f: r => r.type || '' },
          { h: 'FMV',       f: r => r.fmv || '' },
          { h: 'Sell Price', f: r => r.sellPrice || '' },
          { h: 'Donor',     f: r => resolveUser(r.donorId) },
          { h: 'Buyer',     f: r => resolveUser(r.buyerId) },
          { h: 'Course',    f: r => resolveName('courses', r.courseId, 'name') },
          { h: 'Confirmed Play Date', f: r => r.confirmedPlayDate || '' },
          { h: 'Notes',     f: r => (r.notes || '').replace(/,/g, ';') },
        ],
      },
      courses: {
        label: 'Courses & Clubs',
        cols: [
          { h: 'Course ID', f: r => r.id },
          { h: 'Name',      f: r => r.name || '' },
          { h: 'Type',      f: r => r.type || '' },
          { h: 'Tier',      f: r => r.tier || '' },
          { h: 'City',      f: r => r.city || '' },
          { h: 'State',     f: r => r.state || '' },
          { h: 'Region',    f: r => r.region || '' },
          { h: 'Status',    f: r => r.status || '' },
          { h: 'Website',   f: r => r.website || '' },
          { h: 'Phone',     f: r => r.phone || '' },
        ],
      },
      donations: {
        label: 'Donations',
        cols: [
          { h: 'Donation ID', f: r => r.id },
          { h: 'Description', f: r => r.description || '' },
          { h: 'Type',        f: r => r.type || '' },
          { h: 'Status',      f: r => r.status || '' },
          { h: 'Value',       f: r => r.value || '' },
          { h: 'Quantity',    f: r => r.quantity || '' },
          { h: 'Date Donated', f: r => r.dateDonated || '' },
          { h: 'Donor',       f: r => resolveUser(r.donorId) },
          { h: 'Course',      f: r => resolveName('courses', r.courseId, 'name') },
          { h: 'Notes',       f: r => (r.notes || '').replace(/,/g, ';') },
        ],
      },
      tasks: {
        label: 'Tasks',
        cols: [
          { h: 'Task ID',    f: r => r.id },
          { h: 'Title',      f: r => r.title || '' },
          { h: 'Status',     f: r => r.status || '' },
          { h: 'Priority',   f: r => r.priority || '' },
          { h: 'Task Type',  f: r => r.taskType || '' },
          { h: 'Due Date',   f: r => r.dueDate || '' },
          { h: 'Linked User', f: r => resolveUser(r.userId) },
          { h: 'Linked Auction', f: r => r.auctionId || '' },
          { h: 'Linked Opp', f: r => r.opportunityId || '' },
          { h: 'Notes',      f: r => (r.notes || '').replace(/,/g, ';') },
        ],
      },
      financials: {
        label: 'Financials',
        cols: [
          { h: 'Financial ID',   f: r => r.id },
          { h: 'Description',    f: r => r.description || '' },
          { h: 'Record Type',    f: r => r.recordType || '' },
          { h: 'Revenue Status', f: r => r.revenueStatus || '' },
          { h: 'FMV',            f: r => r.fmv || '' },
          { h: 'Sale Price',     f: r => r.salePrice || '' },
          { h: 'Est. Revenue',   f: r => r.estimatedRevenue || '' },
          { h: 'Actual Revenue', f: r => r.actualRevenue || '' },
          { h: 'Date Recorded',  f: r => r.dateRecorded || '' },
          { h: 'Linked Auction', f: r => r.linkedAuctionId || '' },
          { h: 'Internal Notes', f: r => (r.internalNotes || '').replace(/,/g, ';') },
        ],
      },
      messages: {
        label: 'Messages',
        cols: [
          { h: 'Message ID', f: r => r.id },
          { h: 'From Name',  f: r => r.fromName || '' },
          { h: 'From Email', f: r => r.fromEmail || '' },
          { h: 'Subject',    f: r => r.subject || '' },
          { h: 'Status',     f: r => r.status || '' },
          { h: 'Date',       f: r => r.createdAt ? r.createdAt.split('T')[0] : '' },
        ],
      },
      events: {
        label: 'Events',
        cols: [
          { h: 'Event ID',   f: r => r.id },
          { h: 'Name',       f: r => r.name || r.title || '' },
          { h: 'Status',     f: r => r.status || '' },
          { h: 'Date',       f: r => r.date || '' },
          { h: 'Location',   f: r => r.location || '' },
        ],
      },
    };

    const def = EXPORT_DEFS[tableName];
    if (!def) {
      // Fallback: raw CSV
      Store.downloadCSV(tableName, `${tableName}-export.csv`);
      return;
    }

    const headers = def.cols.map(c => c.h);
    const csvRows = rows.map(r => def.cols.map(c => {
      const v = String(c.f(r) || '').replace(/"/g, '""');
      return v.includes(',') || v.includes('"') || v.includes('\n') ? `"${v}"` : v;
    }));

    const csv = [headers.join(','), ...csvRows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${tableName}-export.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  // ─── PUBLIC API ───────────────────────────────────────────────────────────────
  return {
    SCHEMAS, STATUS_MAPS,
    parseFile,
    autoMatch,
    normalizeStatus,
    normalizeDate,
    validate,
    execute,
    smartExport,
    getHistory,
    logHistory,
    clearHistory,
    resolveLinked,
  };
})();

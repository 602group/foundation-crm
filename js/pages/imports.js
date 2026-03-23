/**
 * EPIC Foundation CRM — Import / Export Center (Chunk 7)
 * 5-step wizard: Upload → Map Columns → Validate → Confirm → Results
 * Tabs: Import Center | Export Center | Import History
 */

function renderImports(params = {}) {
  const main = document.getElementById('main');

  // ── State ─────────────────────────────────────────────────────────────────────
  let activeTab = params.tab || 'import';
  let parsedFile = null;        // { headers, rows }
  let targetTable = 'auctions';
  let importAction = 'create';
  let colMappings = {};         // { spreadsheetHeader → schemaFieldKey|'__skip__' }
  let validatedRows = [];
  let wizardStep = 1;

  const TABLE_LABELS = {
    auctions: 'Auctions', users: 'Users', opportunities: 'Special Opportunities',
    courses: 'Courses & Clubs', donations: 'Donations', tasks: 'Tasks', financials: 'Financials',
    messages: 'Messages', events: 'Events',
  };
  const IMPORT_TABLES = ['auctions','users','opportunities','courses','donations','tasks','financials'];

  // ── Shell ─────────────────────────────────────────────────────────────────────
  main.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <span class="page-title">Imports &amp; Exports</span>
        <span class="page-subtitle">Bulk data import with column mapping, validation &amp; duplicate detection</span>
      </div>
    </div>
    <div class="page-content">
      <div class="tab-bar" style="margin-bottom:var(--space-5)">
        <button class="tab-btn ${activeTab==='import'?'active':''}" id="tab-import">📥 Import Center</button>
        <button class="tab-btn ${activeTab==='export'?'active':''}" id="tab-export">📤 Export Center</button>
        <button class="tab-btn ${activeTab==='history'?'active':''}" id="tab-history">🕑 Import History</button>
      </div>
      <div id="tab-body"></div>
    </div>
  `;

  document.getElementById('tab-import').onclick  = () => { activeTab='import';  renderTab(); };
  document.getElementById('tab-export').onclick  = () => { activeTab='export';  renderTab(); };
  document.getElementById('tab-history').onclick = () => { activeTab='history'; renderTab(); };

  function renderTab() {
    ['import','export','history'].forEach(t => {
      const btn = document.getElementById(`tab-${t}`);
      if (btn) btn.classList.toggle('active', t === activeTab);
    });
    const body = document.getElementById('tab-body');
    if (activeTab === 'import')  renderImportTab(body);
    if (activeTab === 'export')  renderExportTab(body);
    if (activeTab === 'history') renderHistoryTab(body);
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // IMPORT TAB
  // ══════════════════════════════════════════════════════════════════════════════

  function renderImportTab(body) {
    body.innerHTML = `
      <div class="wizard-steps">
        ${['Upload','Map Columns','Validate','Confirm','Results'].map((s,i) => `
          <div class="wizard-step ${wizardStep===i+1?'active':wizardStep>i+1?'done':''}">
            <div class="wizard-step-num">${wizardStep>i+1?'✓':i+1}</div>
            <div class="wizard-step-label">${s}</div>
          </div>
          ${i<4?`<div class="wizard-step-connector ${wizardStep>i+1?'done':''}"></div>`:''}
        `).join('')}
      </div>
      <div id="wizard-body" style="margin-top:var(--space-5)"></div>
    `;
    renderStep();
  }

  function renderStep() {
    const body = document.getElementById('wizard-body'); if (!body) return;
    if (wizardStep === 1) renderStep1(body);
    else if (wizardStep === 2) renderStep2(body);
    else if (wizardStep === 3) renderStep3(body);
    else if (wizardStep === 4) renderStep4(body);
    else if (wizardStep === 5) renderStep5(body);
    // Re-render step indicators
    const steps = document.querySelectorAll('.wizard-step');
    const connectors = document.querySelectorAll('.wizard-step-connector');
    steps.forEach((s,i) => {
      s.classList.toggle('active', wizardStep===i+1);
      s.classList.toggle('done', wizardStep>i+1);
      s.querySelector('.wizard-step-num').textContent = wizardStep>i+1 ? '✓' : i+1;
    });
    connectors.forEach((c,i) => c.classList.toggle('done', wizardStep>i+1));
  }

  // ── Step 1: Upload ────────────────────────────────────────────────────────────
  function renderStep1(body) {
    body.innerHTML = `
      <div class="wizard-card">
        <div class="wizard-card-title">Step 1: Upload File & Select Target</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-5)">
          <div>
            <div class="form-group" style="margin-bottom:var(--space-4)">
              <label class="form-label">Target Table *</label>
              <select class="select" id="w-table">
                ${IMPORT_TABLES.map(t => `<option value="${t}" ${targetTable===t?'selected':''}>${TABLE_LABELS[t]}</option>`).join('')}
              </select>
            </div>
            <div class="form-group" style="margin-bottom:var(--space-4)">
              <label class="form-label">Import Action</label>
              <select class="select" id="w-action">
                <option value="create" ${importAction==='create'?'selected':''}>Create new records only</option>
                <option value="update" ${importAction==='update'?'selected':''}>Update existing records only</option>
                <option value="both"   ${importAction==='both'?'selected':''}>Create new + update existing</option>
              </select>
            </div>
            <div style="font-size:var(--text-xs);color:var(--text-muted);line-height:1.6;background:var(--bg-elevated);padding:var(--space-3);border-radius:var(--radius-md)">
              <strong>Update mode:</strong> matches rows by ID field or unique identifier. <br>
              <strong>Create mode:</strong> always creates new records, skips exact duplicates.
            </div>
          </div>
          <div>
            <label class="form-label">File Upload (.csv, .xlsx, .xls)</label>
            <div class="drop-zone" id="drop-zone">
              <div class="drop-zone-icon">📄</div>
              <div class="drop-zone-text">Drop file here or <span style="color:var(--accent)">click to browse</span></div>
              <div class="drop-zone-sub">Supports .csv, .xlsx, .xls — first row must be column headers</div>
              <input type="file" id="file-input" accept=".csv,.xlsx,.xls" style="display:none">
            </div>
            <div id="file-status" style="margin-top:var(--space-3)"></div>
          </div>
        </div>
        <div style="display:flex;gap:var(--space-3);margin-top:var(--space-5);justify-content:flex-end">
          <button class="btn btn-primary" id="next-step-1" disabled>Next: Map Columns →</button>
        </div>
      </div>
    `;

    document.getElementById('w-table').onchange = e => targetTable = e.target.value;
    document.getElementById('w-action').onchange = e => importAction = e.target.value;

    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const nextBtn = document.getElementById('next-step-1');
    const statusEl = document.getElementById('file-status');

    dropZone.onclick = () => fileInput.click();
    dropZone.ondragover = e => { e.preventDefault(); dropZone.classList.add('drag-over'); };
    dropZone.ondragleave = () => dropZone.classList.remove('drag-over');
    dropZone.ondrop = e => { e.preventDefault(); dropZone.classList.remove('drag-over'); handleFile(e.dataTransfer.files[0]); };
    fileInput.onchange = e => { if (e.target.files[0]) handleFile(e.target.files[0]); };

    async function handleFile(file) {
      statusEl.innerHTML = `<div style="color:var(--text-muted);font-size:var(--text-sm)">⏳ Reading file…</div>`;
      try {
        const result = await Importer.parseFile(file);
        if (!result.rows.length) { statusEl.innerHTML = `<div style="color:var(--status-red);font-size:var(--text-sm)">⚠ No data rows found in file.</div>`; return; }
        parsedFile = result;
        colMappings = Importer.autoMatch(result.headers, targetTable);
        statusEl.innerHTML = `
          <div style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3);background:var(--status-green-bg);border-radius:var(--radius-md);border:1px solid var(--status-green)20">
            <span style="font-size:1.2em">✅</span>
            <div>
              <div style="font-size:var(--text-sm);font-weight:var(--fw-semi);color:var(--status-green)">${file.name}</div>
              <div style="font-size:var(--text-xs);color:var(--text-muted)">${result.rows.length} rows · ${result.headers.length} columns detected</div>
            </div>
          </div>`;
        nextBtn.disabled = false;
      } catch(err) {
        statusEl.innerHTML = `<div style="color:var(--status-red);font-size:var(--text-sm)">❌ Error: ${err.message}</div>`;
      }
    }

    nextBtn.onclick = () => { wizardStep = 2; renderStep(); };
  }

  // ── Step 2: Map Columns ───────────────────────────────────────────────────────
  function renderStep2(body) {
    if (!parsedFile) { wizardStep = 1; renderStep(); return; }
    const schema = Importer.SCHEMAS[targetTable];
    const schemaFields = schema ? schema.fields : [];
    const sample = parsedFile.rows.slice(0, 3);

    body.innerHTML = `
      <div class="wizard-card">
        <div class="wizard-card-title">Step 2: Map Your Columns → System Fields</div>
        <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--space-4)">
          Auto-matched ${Object.keys(colMappings).length} of ${parsedFile.headers.length} columns. Review and adjust as needed.
          Fields marked <span style="color:var(--status-red)">*</span> are required.
        </div>
        <div class="col-map-table">
          <div class="col-map-header">
            <span>Your Column</span><span>Sample Values</span><span>Maps To System Field</span>
          </div>
          ${parsedFile.headers.map(h => {
            const sampleVals = sample.map(r => r[h]).filter(Boolean).slice(0,2).join(', ');
            const currentMap = colMappings[h] || '__skip__';
            const isRequired = schema?.requiredFields?.includes(currentMap);
            return `<div class="col-map-row" data-header="${h.replace(/"/g,'&quot;')}">
              <span class="col-map-source">${h}</span>
              <span class="col-map-sample">${sampleVals || '—'}</span>
              <select class="select col-map-select" data-col="${h.replace(/"/g,'&quot;')}" style="font-size:var(--text-xs)">
                <option value="__skip__">— Skip this column —</option>
                ${schemaFields.map(f => {
                  const req = schema?.requiredFields?.includes(f.key) ? ' *' : '';
                  return `<option value="${f.key}" ${currentMap===f.key?'selected':''}>${f.label}${req}</option>`;
                }).join('')}
              </select>
            </div>`;
          }).join('')}
        </div>
        <div id="map-warnings" style="margin-top:var(--space-3)"></div>
        <div style="display:flex;gap:var(--space-3);margin-top:var(--space-5);justify-content:space-between">
          <button class="btn btn-secondary" id="back-step-2">← Back</button>
          <button class="btn btn-primary" id="next-step-2">Next: Validate →</button>
        </div>
      </div>
    `;

    body.querySelectorAll('.col-map-select').forEach(sel => {
      sel.onchange = e => {
        colMappings[e.target.dataset.col] = e.target.value;
        checkRequiredMapped();
      };
    });
    checkRequiredMapped();

    function checkRequiredMapped() {
      const warn = document.getElementById('map-warnings'); if (!warn) return;
      const mappedFields = Object.values(colMappings).filter(v => v && v !== '__skip__');
      const missing = (schema?.requiredFields || []).filter(r => !mappedFields.includes(r));
      if (missing.length) {
        const labels = missing.map(k => schemaFields.find(f=>f.key===k)?.label || k);
        warn.innerHTML = `<div style="color:var(--status-amber);font-size:var(--text-xs);padding:var(--space-2) var(--space-3);background:var(--status-amber-bg);border-radius:var(--radius-md)">
          ⚠ Required fields not yet mapped: ${labels.join(', ')}
        </div>`;
      } else {
        warn.innerHTML = `<div style="color:var(--status-green);font-size:var(--text-xs)">✓ All required fields are mapped</div>`;
      }
    }

    document.getElementById('back-step-2').onclick = () => { wizardStep = 1; renderStep(); };
    document.getElementById('next-step-2').onclick = () => {
      validatedRows = Importer.validate(parsedFile.rows, colMappings, targetTable);
      wizardStep = 3; renderStep();
    };
  }

  // ── Step 3: Validate & Preview ────────────────────────────────────────────────
  function renderStep3(body) {
    const ready   = validatedRows.filter(r => r._status === 'ready').length;
    const warn    = validatedRows.filter(r => r._status === 'warning').length;
    const dupes   = validatedRows.filter(r => r._status === 'duplicate').length;
    const errors  = validatedRows.filter(r => r._status === 'error').length;
    const displayRows = validatedRows.slice(0, 40);
    // Get mapped field labels for preview columns
    const schema = Importer.SCHEMAS[targetTable];
    const mappedCols = Object.entries(colMappings).filter(([,v]) => v && v !== '__skip__').slice(0, 6);

    // Collect all fuzzy-match decisions needed across all rows
    const fuzzyRows = validatedRows.filter(r => r._fuzzyMatches && Object.keys(r._fuzzyMatches).length > 0);

    body.innerHTML = `
      <div class="wizard-card">
        <div class="wizard-card-title">Step 3: Validation Results</div>
        <div class="validation-summary">
          <div class="val-stat green"><span>${ready}</span><small>Ready</small></div>
          <div class="val-stat amber"><span>${warn}</span><small>Warnings</small></div>
          <div class="val-stat blue"><span>${dupes}</span><small>Duplicates</small></div>
          <div class="val-stat red"><span>${errors}</span><small>Errors</small></div>
        </div>
        <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--space-4)">
          Showing ${Math.min(40, validatedRows.length)} of ${validatedRows.length} rows.
          Rows with errors will be skipped during import.
          Duplicate rows will be skipped (create mode) or updated (update/both mode).
        </div>
        <div class="table-container" style="max-height:360px;overflow:auto">
          <table class="crm-table" style="font-size:11px">
            <thead><tr>
              <th style="width:40px">Row</th>
              <th style="width:80px">Status</th>
              ${mappedCols.map(([h]) => `<th style="max-width:120px">${h}</th>`).join('')}
              <th>Issues</th>
            </tr></thead>
            <tbody>
              ${displayRows.map(r => {
                const statusIcon = { ready:'✅', warning:'⚠️', duplicate:'🔵', error:'❌' }[r._status] || '?';
                const statusClass = { ready:'row-ok', warning:'row-warn', duplicate:'row-dupe', error:'row-error' }[r._status] || '';
                const issues = [...r._errors, ...r._warnings, r._duplicateInfo ? `Duplicate: ${r._duplicateInfo.reason} (${r._duplicateInfo.match?.id||'?'})` : ''].filter(Boolean);
                return `<tr class="val-row ${statusClass}">
                  <td style="color:var(--text-muted)">${r._rowNum}</td>
                  <td title="${r._status}">${statusIcon}</td>
                  ${mappedCols.map(([h]) => `<td style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${r._raw[h]||''}">${r._raw[h]||''}</td>`).join('')}
                  <td style="font-size:10px;color:${r._status==='error'?'var(--status-red)':r._status==='warning'?'var(--status-amber)':'var(--text-muted)'}">${issues.join(' • ') || ''}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>

        ${fuzzyRows.length > 0 ? `
          <div style="margin-top:var(--space-5)">
            <div style="font-size:var(--text-sm);font-weight:var(--fw-semi);color:var(--text-primary);margin-bottom:var(--space-2)">
              🔍 Did You Mean? — Review Unmatched Names
              <span style="font-size:var(--text-xs);color:var(--text-muted);font-weight:normal;margin-left:var(--space-2)">${fuzzyRows.length} row(s) need your decision</span>
            </div>
            <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--space-3)">
              These names weren't found exactly in the system. Choose an existing record, create a new one, or skip.
            </div>
            <div id="fuzzy-review-cards" style="display:flex;flex-direction:column;gap:var(--space-3)"></div>
          </div>
        ` : ''}

        <div style="display:flex;gap:var(--space-3);margin-top:var(--space-5);justify-content:space-between">
          <button class="btn btn-secondary" id="back-step-3">← Back</button>
          <button class="btn btn-primary" id="next-step-3" ${(ready+warn+dupes)===0?'disabled':''}>Confirm Import →</button>
        </div>
      </div>
    `;

    // Render Did You Mean cards
    if (fuzzyRows.length > 0) {
      const container = document.getElementById('fuzzy-review-cards');
      fuzzyRows.forEach(vRow => {
        Object.entries(vRow._fuzzyMatches).forEach(([fieldKey, fm]) => {
          const card = document.createElement('div');
          card.style.cssText = 'background:var(--bg-elevated);border:1px solid var(--status-amber);border-radius:var(--radius-md);padding:var(--space-4)';
          card.dataset.rowNum = vRow._rowNum;
          card.dataset.field = fieldKey;

          const choiceKey = `${vRow._rowNum}_${fieldKey}`;
          const currentChoice = vRow._linkedChoices?.[fieldKey];

          card.innerHTML = `
            <div style="display:flex;align-items:flex-start;gap:var(--space-4)">
              <span style="font-size:1.3em;flex-shrink:0">⚠️</span>
              <div style="flex:1;min-width:0">
                <div style="font-size:var(--text-sm);font-weight:var(--fw-medium);color:var(--text-primary);margin-bottom:var(--space-1)">
                  Row ${vRow._rowNum} · ${fm.label || fieldKey}:
                  <span style="color:var(--status-amber)">"${fm.inputValue}"</span>
                  not found in system
                </div>
                <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--space-3)">Did you mean one of these?</div>
                <div style="display:flex;flex-wrap:wrap;gap:var(--space-2)" id="choices-${choiceKey}">
                  ${fm.matches.map(m => `
                    <button class="fuzzy-choice-btn btn btn-sm ${currentChoice === 'use:'+m.id ? 'btn-primary' : 'btn-secondary'}"
                      data-choice="use:${m.id}" data-row="${vRow._rowNum}" data-field="${fieldKey}"
                      style="font-size:var(--text-xs)">
                      ✓ Use "${m.displayName}" <span style="opacity:0.6;margin-left:4px">${Math.round(m.score*100)}%</span>
                    </button>
                  `).join('')}
                  <button class="fuzzy-choice-btn btn btn-sm ${currentChoice === 'new' ? 'btn-accent' : 'btn-ghost'}"
                    data-choice="new" data-row="${vRow._rowNum}" data-field="${fieldKey}"
                    style="font-size:var(--text-xs);color:var(--status-green)">
                    + Create New
                  </button>
                  <button class="fuzzy-choice-btn btn btn-sm ${currentChoice === 'skip' ? 'btn-danger' : 'btn-ghost'}"
                    data-choice="skip" data-row="${vRow._rowNum}" data-field="${fieldKey}"
                    style="font-size:var(--text-xs);color:var(--text-muted)">
                    — Skip (leave blank)
                  </button>
                </div>
                ${currentChoice ? `<div style="font-size:10px;color:var(--status-green);margin-top:var(--space-2)">✓ Decision saved</div>` : ''}
              </div>
            </div>
          `;
          container.appendChild(card);
        });
      });

      // Wire choice buttons
      container.querySelectorAll('.fuzzy-choice-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const rowNum = parseInt(btn.dataset.row);
          const field = btn.dataset.field;
          const choice = btn.dataset.choice;
          const vRow = validatedRows.find(r => r._rowNum === rowNum);
          if (!vRow) return;
          vRow._linkedChoices[field] = choice;
          // Re-render step 3 to reflect the choice
          renderStep3(body);
        });
      });
    }

    document.getElementById('back-step-3').onclick = () => { wizardStep = 2; renderStep(); };
    document.getElementById('next-step-3').onclick = () => { wizardStep = 4; renderStep(); };
  }


  // ── Step 4: Confirm ───────────────────────────────────────────────────────────
  function renderStep4(body) {
    const ready   = validatedRows.filter(r => r._status === 'ready').length;
    const warn    = validatedRows.filter(r => r._status === 'warning').length;
    const dupes   = validatedRows.filter(r => r._status === 'duplicate').length;
    const errors  = validatedRows.filter(r => r._status === 'error').length;

    const willCreate = (importAction === 'create' || importAction === 'both') ? ready + warn : 0;
    const willUpdate = (importAction === 'update' || importAction === 'both') ? dupes : 0;
    const willSkip   = importAction === 'create' ? dupes : importAction === 'update' ? ready + warn : 0;

    body.innerHTML = `
      <div class="wizard-card">
        <div class="wizard-card-title">Step 4: Confirm Import</div>
        <div style="background:var(--bg-elevated);border-radius:var(--radius-lg);padding:var(--space-5);margin-bottom:var(--space-5)">
          <div style="font-size:var(--text-sm);font-weight:var(--fw-semi);color:var(--text-secondary);margin-bottom:var(--space-4)">
            Importing into: <strong style="color:var(--text-primary)">${TABLE_LABELS[targetTable]}</strong> &nbsp;|&nbsp;
            Mode: <strong style="color:var(--accent)">${importAction === 'both' ? 'Create + Update' : importAction === 'update' ? 'Update Only' : 'Create Only'}</strong>
          </div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:var(--space-4);text-align:center">
            <div style="background:var(--status-green-bg);padding:var(--space-4);border-radius:var(--radius-md)">
              <div style="font-size:2rem;font-weight:var(--fw-bold);color:var(--status-green)">${willCreate}</div>
              <div style="font-size:var(--text-xs);color:var(--text-muted)">Will Create</div>
            </div>
            <div style="background:var(--status-blue-bg);padding:var(--space-4);border-radius:var(--radius-md)">
              <div style="font-size:2rem;font-weight:var(--fw-bold);color:var(--status-blue)">${willUpdate}</div>
              <div style="font-size:var(--text-xs);color:var(--text-muted)">Will Update</div>
            </div>
            <div style="background:var(--bg-surface);padding:var(--space-4);border-radius:var(--radius-md)">
              <div style="font-size:2rem;font-weight:var(--fw-bold);color:var(--text-muted)">${willSkip}</div>
              <div style="font-size:var(--text-xs);color:var(--text-muted)">Will Skip</div>
            </div>
            <div style="background:var(--status-red-bg);padding:var(--space-4);border-radius:var(--radius-md)">
              <div style="font-size:2rem;font-weight:var(--fw-bold);color:var(--status-red)">${errors}</div>
              <div style="font-size:var(--text-xs);color:var(--text-muted)">Rows w/ Errors (skipped)</div>
            </div>
          </div>
        </div>
        <div style="font-size:var(--text-sm);color:var(--text-muted);margin-bottom:var(--space-5)">
          This action cannot be automatically undone. Records will be created or updated immediately in the internal database.
        </div>
        <div style="display:flex;gap:var(--space-3);justify-content:space-between">
          <button class="btn btn-secondary" id="back-step-4">← Back</button>
          <button class="btn btn-primary" id="run-import" style="min-width:160px">
            🚀 Run Import
          </button>
        </div>
      </div>
    `;
    document.getElementById('back-step-4').onclick = () => { wizardStep = 3; renderStep(); };
    document.getElementById('run-import').onclick = () => {
      const btn = document.getElementById('run-import');
      btn.disabled = true; btn.textContent = '⏳ Importing…';
      try {
        const result = Importer.execute(validatedRows, targetTable, importAction);
        // Log history
        Importer.logHistory({
          table: targetTable,
          tableLabel: TABLE_LABELS[targetTable],
          fileName: parsedFile._fileName || 'uploaded file',
          action: importAction,
          totalRows: validatedRows.length,
          created: result.created,
          updated: result.updated,
          skipped: result.skipped,
          failed:  result.failed,
        });
        // Store result for step 5
        window._lastImportResult = result;
        wizardStep = 5;
        renderStep();
        updateSidebarBadges?.();
      } catch(e) {
        btn.disabled = false; btn.textContent = '🚀 Run Import';
        Toast.error('Import failed: ' + e.message);
      }
    };
  }

  // ── Step 5: Results ───────────────────────────────────────────────────────────
  function renderStep5(body) {
    const result = window._lastImportResult || { created:0, updated:0, skipped:0, failed:0, failedRows:[] };
    body.innerHTML = `
      <div class="wizard-card">
        <div class="wizard-card-title">✅ Import Complete</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:var(--space-4);text-align:center;margin-bottom:var(--space-5)">
          <div style="background:var(--status-green-bg);padding:var(--space-4);border-radius:var(--radius-md)">
            <div style="font-size:2.5rem;font-weight:var(--fw-bold);color:var(--status-green)">${result.created}</div>
            <div style="font-size:var(--text-sm);color:var(--text-muted)">Created</div>
          </div>
          <div style="background:var(--status-blue-bg);padding:var(--space-4);border-radius:var(--radius-md)">
            <div style="font-size:2.5rem;font-weight:var(--fw-bold);color:var(--status-blue)">${result.updated}</div>
            <div style="font-size:var(--text-sm);color:var(--text-muted)">Updated</div>
          </div>
          <div style="background:var(--bg-surface);padding:var(--space-4);border-radius:var(--radius-md)">
            <div style="font-size:2.5rem;font-weight:var(--fw-bold);color:var(--text-muted)">${result.skipped}</div>
            <div style="font-size:var(--text-sm);color:var(--text-muted)">Skipped</div>
          </div>
          <div style="background:${result.failed?'var(--status-red-bg)':'var(--bg-surface)'};padding:var(--space-4);border-radius:var(--radius-md)">
            <div style="font-size:2.5rem;font-weight:var(--fw-bold);color:${result.failed?'var(--status-red)':'var(--text-muted)'}">${result.failed}</div>
            <div style="font-size:var(--text-sm);color:var(--text-muted)">Failed</div>
          </div>
        </div>
        ${result.failedRows?.length ? `
          <div style="margin-bottom:var(--space-4)">
            <div style="font-size:var(--text-sm);font-weight:var(--fw-semi);color:var(--status-red);margin-bottom:var(--space-2)">Failed Rows</div>
            <div style="fontsize:11px;max-height:200px;overflow:auto;background:var(--bg-elevated);border-radius:var(--radius-md);padding:var(--space-3)">
              ${result.failedRows.map(fr => `<div style="font-size:11px;color:var(--text-muted);padding:2px 0;border-bottom:1px solid var(--bg-border)">Row ${fr.rowNum}: ${fr.reason}</div>`).join('')}
            </div>
          </div>
        ` : ''}
        <div style="display:flex;gap:var(--space-3)">
          <button class="btn btn-secondary" id="import-again">Import Another File</button>
          <button class="btn btn-ghost" onclick="Router.navigate('${targetTable}')">Go to ${TABLE_LABELS[targetTable]} →</button>
        </div>
      </div>
    `;
    document.getElementById('import-again').onclick = () => {
      parsedFile = null; colMappings = {}; validatedRows = []; wizardStep = 1;
      renderStep();
    };
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // EXPORT TAB
  // ══════════════════════════════════════════════════════════════════════════════

  function renderExportTab(body) {
    const exports = [
      { table:'auctions',      label:'Auctions',              icon:'🏌️' },
      { table:'users',         label:'Users',                 icon:'👤' },
      { table:'opportunities', label:'Special Opportunities', icon:'⭐' },
      { table:'courses',       label:'Courses & Clubs',       icon:'📍' },
      { table:'donations',     label:'Donations',             icon:'🤝' },
      { table:'tasks',         label:'Tasks',                 icon:'✅' },
      { table:'financials',    label:'Financials',            icon:'💰' },
      { table:'messages',      label:'Messages',              icon:'💬' },
      { table:'events',        label:'Events',                icon:'📅' },
    ];

    body.innerHTML = `
      <div class="feed-card">
        <div class="feed-card-header">Export Data to Excel</div>
        <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--space-4)">
          Generate a single, multi-sheet Excel (.xlsx) workbook containing your selected data. The Financials sheet includes built-in SUM formulas for easy auditing.
        </div>
        <div style="background:var(--bg-elevated);border:1px solid var(--border-subtle);border-radius:var(--radius-md);padding:var(--space-5);text-align:center">
          <div style="font-size:3rem;margin-bottom:var(--space-3)">📊</div>
          <div style="font-size:var(--text-md);font-weight:var(--fw-semi);color:var(--text-primary);margin-bottom:var(--space-2)">Custom Excel Report</div>
          <div style="font-size:var(--text-sm);color:var(--text-muted);margin-bottom:var(--space-5);max-width:400px;margin-left:auto;margin-right:auto">
            Choose exactly which modules you want to export as sheets in your workbook.
          </div>
          <button class="btn btn-primary" id="btn-open-export-modal" style="font-size:var(--text-sm);padding:10px 24px">
            Configure Export
          </button>
        </div>
      </div>
    `;

    document.getElementById('btn-open-export-modal')?.addEventListener('click', () => {
      openExportModal(exports);
    });

    function openExportModal(tablesArray) {
      if (typeof ExcelJS === 'undefined') {
        Toast.error('Excel library error. Check connection.');
        return;
      }

      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay open';
      
      const checkBoxesHtml = tablesArray.map(item => `
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

        const btn = overlay.querySelector('#export-modal-submit');
        btn.innerHTML = '⏳ Generating...';
        btn.disabled = true;

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
          
          Store.logAudit('custom_export_excel', 'system', `exported ${selected.length} tables`);
          Toast.success('Excel workbook exported successfully!');
          close();
        } catch (e) {
          console.error('Excel Export Error:', e);
          Toast.error('Export failed: ' + e.message);
          btn.innerHTML = '📥 Generate Excel File';
          btn.disabled = false;
        }
      };
    }
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // HISTORY TAB
  // ══════════════════════════════════════════════════════════════════════════════

  function renderHistoryTab(body) {
    const history = Importer.getHistory();
    body.innerHTML = `
      <div class="feed-card">
        <div class="feed-card-header">
          Import History
          ${history.length ? `<button class="btn btn-ghost btn-sm" id="clear-history-btn" style="color:var(--status-red)">Clear History</button>` : ''}
        </div>
        ${history.length === 0
          ? `<div style="text-align:center;padding:var(--space-10);color:var(--text-muted)">No import history yet</div>`
          : `<div class="table-container"><table class="crm-table" style="font-size:var(--text-xs)">
              <thead><tr>
                <th>Date</th><th>Table</th><th>File</th><th>Mode</th>
                <th>Created</th><th>Updated</th><th>Skipped</th><th>Failed</th><th>Total</th>
              </tr></thead>
              <tbody>
                ${history.map(h => `<tr>
                  <td style="color:var(--text-muted)">${new Date(h.timestamp).toLocaleString()}</td>
                  <td><strong>${h.tableLabel||h.table}</strong></td>
                  <td style="color:var(--text-muted)">${h.fileName||'—'}</td>
                  <td>${h.action||'create'}</td>
                  <td style="color:var(--status-green)">${h.created||0}</td>
                  <td style="color:var(--status-blue)">${h.updated||0}</td>
                  <td style="color:var(--text-muted)">${h.skipped||0}</td>
                  <td style="color:${h.failed?'var(--status-red)':'var(--text-muted)'}">${h.failed||0}</td>
                  <td>${h.totalRows||0}</td>
                </tr>`).join('')}
              </tbody>
            </table></div>`}
      </div>
    `;
    document.getElementById('clear-history-btn')?.addEventListener('click', () => {
      Importer.clearHistory();
      renderHistoryTab(body);
      Toast.info('Import history cleared');
    });
  }

  // Kick off
  renderTab();
}

/**
 * Epic Foundation CRM — AI Assistant Page
 * Admin-only. Communicates with the local backend (server.js) which holds the OpenAI key.
 */

const AI_SERVER = 'http://localhost:3001';

function renderAssistant(params = {}) {
  const main = document.getElementById('main');
  const session = typeof Auth !== 'undefined' ? Auth.getSession() : null;

  // Admin-only guard
  if (!session) {
    main.innerHTML = `<div class="page-content" style="display:flex;align-items:center;justify-content:center;height:60vh">
      <div style="text-align:center;color:var(--text-muted)">🔒 Please log in to access the AI Assistant.</div>
    </div>`;
    return;
  }

  // State
  let chatHistory = [];           // [{role, content}]
  let attachedFile = null;        // { fileName, content, rowCount }
  let pendingActions = [];        // proposed writes awaiting approval
  let currentRecordContext = params.record || null; // launched from a specific record?
  let isLoading = false;

  // Load saved history
  try { chatHistory = JSON.parse(localStorage.getItem('crm_ai_history') || '[]'); } catch { chatHistory = []; }

  // ── Page Shell ──────────────────────────────────────────────────────────────
  main.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <span class="page-title">✦ AI Assistant</span>
        <span class="page-subtitle">Internal operations assistant — admin only</span>
      </div>
      <div class="page-header-right">
        <span id="ai-status-badge" class="badge" style="background:var(--bg-elevated);color:var(--text-muted);font-size:10px">⏳ Connecting…</span>
        <button class="btn btn-ghost btn-sm" id="ai-clear-btn">Clear Chat</button>
      </div>
    </div>
    <div class="ai-shell">
      <!-- Left: Chat -->
      <div class="ai-chat-col">
        <!-- Quick chips -->
        <div class="ai-chips" id="ai-chips">
          <button class="ai-chip" data-q="Summarize everything I need to do today">📋 Today's Summary</button>
          <button class="ai-chip" data-q="Which tasks are overdue?">⚠️ Overdue Tasks</button>
          <button class="ai-chip" data-q="Which auctions are still Waiting to reach out?">🏌️ Waiting to reach out</button>
          <button class="ai-chip" data-q="Find duplicate users or near-duplicate names in the system">🔍 Duplicates</button>
          <button class="ai-chip" data-q="Which donations have not been moved into auctions or opportunities?">📦 Unassigned Donations</button>
          <button class="ai-chip" data-q="Give me a full system overview — record counts and what needs attention">📊 System Overview</button>
        </div>

        <!-- Messages -->
        <div class="ai-messages" id="ai-messages">
          <div class="ai-msg ai-msg-assistant">
            <div class="ai-msg-bubble">
              <strong>Hi, I'm your Epic Foundation AI assistant.</strong><br>
              I can search your CRM, find duplicates, summarize records, draft emails, identify overdue work, and analyze uploaded files.<br><br>
              Ask me anything or use the quick chips above to get started.
              ${currentRecordContext ? `<br><br>📌 <em>I can see you're working with: <strong>${JSON.stringify(currentRecordContext).slice(0,80)}</strong></em>` : ''}
            </div>
          </div>
        </div>

        <!-- Pending actions -->
        <div id="ai-actions-area" style="display:none;padding:var(--space-3) var(--space-4);border-top:var(--border-subtle)"></div>

        <!-- Input -->
        <div class="ai-input-bar">
          <div class="ai-file-pill" id="ai-file-pill" style="display:none">
            <span id="ai-file-name">file.csv</span>
            <button id="ai-file-remove" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:12px;padding:0 2px">✕</button>
          </div>
          <textarea class="ai-textarea" id="ai-input" placeholder="Ask anything about your CRM…" rows="1"></textarea>
          <label class="ai-attach-btn" title="Attach file" for="ai-file-input">📎</label>
          <input type="file" id="ai-file-input" accept=".csv,.txt,.json" style="display:none">
          <button class="ai-send-btn" id="ai-send-btn" title="Send">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>
          </button>
        </div>
      </div>

      <!-- Right: Context panel -->
      <div class="ai-context-col" id="ai-context-col">
        <div class="ai-context-header">CRM Context</div>
        <div id="ai-context-body" class="ai-context-body"></div>
      </div>
    </div>
  `;

  // ── Check server health ─────────────────────────────────────────────────────
  const statusBadge = document.getElementById('ai-status-badge');
  fetch(`${AI_SERVER}/api/assistant/health`, { method: 'GET' })
    .then(r => r.json())
    .then(() => { statusBadge.textContent = '✓ Connected'; statusBadge.style.color = 'var(--status-green)'; })
    .catch(() => { statusBadge.textContent = '✗ Server offline — run npm run dev'; statusBadge.style.color = 'var(--status-red)'; });

  // ── Render existing history ─────────────────────────────────────────────────
  const msgEl = document.getElementById('ai-messages');
  chatHistory.forEach(turn => appendMessage(turn.role, turn.content, false));
  if (chatHistory.length > 0) msgEl.scrollTop = msgEl.scrollHeight;

  // ── Context panel ───────────────────────────────────────────────────────────
  renderContextPanel();

  // ── Wire inputs ─────────────────────────────────────────────────────────────
  const textarea = document.getElementById('ai-input');
  const sendBtn  = document.getElementById('ai-send-btn');
  const fileInput = document.getElementById('ai-file-input');
  const filePill  = document.getElementById('ai-file-pill');
  const fileName  = document.getElementById('ai-file-name');

  // Auto-resize textarea
  textarea.addEventListener('input', () => {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 160) + 'px';
  });

  textarea.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });

  sendBtn.addEventListener('click', sendMessage);

  document.getElementById('ai-clear-btn').addEventListener('click', () => {
    chatHistory = [];
    localStorage.removeItem('crm_ai_history');
    msgEl.innerHTML = '';
    appendMessage('assistant', 'Chat cleared. How can I help?', false);
  });

  // Quick chips
  document.querySelectorAll('.ai-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      textarea.value = chip.dataset.q;
      sendMessage();
    });
  });

  // File attach
  fileInput.addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const r = await fetch(`${AI_SERVER}/api/assistant/upload`, { method: 'POST', body: fd });
      if (!r.ok) { Toast.error('File upload failed'); return; }
      attachedFile = await r.json();
      fileName.textContent = `${attachedFile.fileName} (${attachedFile.rowCount} rows)`;
      filePill.style.display = 'flex';
      Toast.info(`File attached: ${attachedFile.fileName}`);
    } catch { Toast.error('Could not reach server — is it running?'); }
    fileInput.value = '';
  });

  document.getElementById('ai-file-remove').addEventListener('click', () => {
    attachedFile = null;
    filePill.style.display = 'none';
  });

  // ── Send message ────────────────────────────────────────────────────────────
  async function sendMessage() {
    const text = textarea.value.trim();
    if (!text || isLoading) return;

    isLoading = true;
    textarea.value = '';
    textarea.style.height = 'auto';
    sendBtn.disabled = true;
    sendBtn.style.opacity = '0.4';

    appendMessage('user', text, false);
    chatHistory.push({ role: 'user', content: text });

    // Show typing indicator
    const thinkId = 'think-' + Date.now();
    appendRaw(`<div class="ai-msg ai-msg-assistant" id="${thinkId}">
      <div class="ai-msg-bubble ai-typing"><span></span><span></span><span></span></div>
    </div>`);
    scrollToBottom();

    try {
      const context = buildContext();
      const body = {
        message: text,
        context,
        history: chatHistory.slice(-16).map(t => ({ role: t.role, content: t.content })),
        fileContent:     attachedFile?.content   || null,
        recordContext:   currentRecordContext     || null,
      };

      const response = await fetch(`${AI_SERVER}/api/assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      // Remove typing indicator
      document.getElementById(thinkId)?.remove();

      if (!response.ok) {
        const err = await response.json();
        appendMessage('assistant', `⚠️ ${err.error || 'Server error'}`, false);
        isLoading = false; sendBtn.disabled = false; sendBtn.style.opacity = '';
        return;
      }

      const data = await response.json();
      const reply = data.reply || 'Sorry, I could not generate a response.';

      // Clear attached file after use
      if (attachedFile) { attachedFile = null; filePill.style.display = 'none'; }

      // Append assistant reply
      appendMessage('assistant', reply, true, data.toolsUsed);
      chatHistory.push({ role: 'assistant', content: reply });

      // Save history (last 20 turns)
      const trimmed = chatHistory.slice(-20);
      chatHistory = trimmed;
      localStorage.setItem('crm_ai_history', JSON.stringify(trimmed));

      // Handle proposed actions
      if (data.proposedActions?.length > 0) {
        renderProposedActions(data.proposedActions);
      }

    } catch (err) {
      document.getElementById(thinkId)?.remove();
      appendMessage('assistant', '⚠️ Could not reach the AI server. Make sure `npm run dev` is running in the project folder.', false);
    }

    isLoading = false;
    sendBtn.disabled = false;
    sendBtn.style.opacity = '';
  }

  // ── Proposed actions panel ──────────────────────────────────────────────────
  function renderProposedActions(actions) {
    const area = document.getElementById('ai-actions-area');
    area.style.display = 'block';

    actions.forEach(action => {
      const card = document.createElement('div');
      card.className = 'ai-action-card';
      const type = action._action || 'action';
      const data = action.data || {};
      const label = type === 'create_task'
        ? `Create Task: "${data.title}" ${data.priority ? `[${data.priority}]` : ''} ${data.dueDate ? `· due ${data.dueDate}` : ''}`
        : type === 'add_note'
        ? `Add Note to ${data.table} ${data.id}: "${(data.content || '').slice(0, 60)}…"`
        : JSON.stringify(action).slice(0, 80);

      card.innerHTML = `
        <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:4px">Proposed Action</div>
        <div style="font-size:var(--text-sm);font-weight:var(--fw-medium);margin-bottom:var(--space-3)">${label}</div>
        <div style="display:flex;gap:var(--space-2)">
          <button class="btn btn-primary btn-sm ai-approve-btn">✓ Approve</button>
          <button class="btn btn-ghost btn-sm ai-reject-btn" style="color:var(--status-red)">✕ Reject</button>
        </div>
      `;

      card.querySelector('.ai-approve-btn').addEventListener('click', () => {
        executeApprovedAction(action);
        card.innerHTML = `<div style="color:var(--status-green);font-size:var(--text-sm)">✓ Action approved and executed.</div>`;
      });
      card.querySelector('.ai-reject-btn').addEventListener('click', () => {
        card.innerHTML = `<div style="color:var(--text-muted);font-size:var(--text-sm)">✕ Action rejected.</div>`;
      });

      area.appendChild(card);
    });
  }

  function executeApprovedAction(action) {
    const type = action._action;
    const data = action.data || {};
    const actor = session?.name || 'AI Assistant';

    if (type === 'create_task') {
      const rec = Store.create('tasks', {
        title: data.title,
        description: data.description || '',
        priority: data.priority || 'Medium',
        dueDate: data.dueDate || '',
        status: 'Open',
        taskType: 'AI Generated',
        userId: data.userId || null,
        auctionId: data.auctionId || null,
      }, actor);
      Store.logAudit('ai_created_task', 'tasks', rec.id);
      Toast.success(`Task created: ${rec.id}`);
    }

    if (type === 'add_note') {
      const existing = Store.getById(data.table, data.id);
      if (existing) {
        const currentNotes = existing.notes || '';
        Store.update(data.table, data.id, { notes: currentNotes ? `${currentNotes}\n\n${data.content}` : data.content }, actor);
        Store.logAudit('ai_added_note', data.table, data.id);
        Toast.success('Note added');
      } else {
        Toast.error(`Record not found: ${data.table} ${data.id}`);
      }
    }
  }

  // ── Context builder ─────────────────────────────────────────────────────────
  function buildContext() {
    const TABLES = ['users','auctions','opportunities','donations','courses','tasks','financials','messages','events'];
    const tables = {};

    TABLES.forEach(t => {
      const rows = Store._getTable ? Store._getTable(t) : (Store.getAll ? Store.getAll(t) : []);
      // Strip sensitive/bulky fields before sending
      tables[t] = rows.map(r => {
        const clean = { ...r };
        delete clean.activityLog;
        delete clean.passwordHash;
        return clean;
      });
    });

    return { tables };
  }

  // ── Context panel ───────────────────────────────────────────────────────────
  function renderContextPanel() {
    const body = document.getElementById('ai-context-body');
    const TABLES = ['users','auctions','opportunities','donations','courses','tasks','financials','messages','events'];
    const rows = TABLES.map(t => {
      const count = (Store._getTable ? Store._getTable(t) : Store.getAll(t) || []).length;
      return `<div class="ai-ctx-row">
        <span style="color:var(--text-muted);font-family:var(--font-mono);font-size:10px">${t}</span>
        <span style="color:var(--text-secondary);font-weight:var(--fw-medium)">${count}</span>
      </div>`;
    }).join('');

    body.innerHTML = `
      <div style="font-size:10px;color:var(--text-muted);margin-bottom:var(--space-3)">Sent with each message</div>
      ${rows}
      ${currentRecordContext ? `
        <div style="margin-top:var(--space-4);padding:var(--space-3);background:rgba(var(--accent-rgb,124,58,237),0.08);border-radius:var(--radius-md);border:1px solid rgba(var(--accent-rgb,124,58,237),0.2)">
          <div style="font-size:10px;color:var(--text-muted);margin-bottom:4px">Record Context</div>
          <div style="font-size:var(--text-xs);color:var(--text-secondary)">${currentRecordContext.table}: ${currentRecordContext.id}</div>
        </div>` : ''}
      <div style="margin-top:var(--space-4);padding-top:var(--space-3);border-top:var(--border-subtle)">
        <div style="font-size:10px;color:var(--text-muted);margin-bottom:var(--space-2)">Model</div>
        <div style="font-size:var(--text-xs);color:var(--text-secondary)">gpt-4o · Responses API</div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:var(--space-3);margin-bottom:var(--space-2)">Server</div>
        <div style="font-size:var(--text-xs);color:var(--text-secondary)">localhost:3001</div>
      </div>
    `;
  }

  // ── Message rendering ───────────────────────────────────────────────────────
  function appendMessage(role, content, animate = true, toolsUsed = []) {
    const el = document.createElement('div');
    el.className = `ai-msg ai-msg-${role}`;

    const html = role === 'assistant' ? formatAssistantMessage(content) : escapeHtml(content);
    const toolsHtml = toolsUsed?.length
      ? `<div class="ai-tools-used">🔧 ${toolsUsed.join(', ')}</div>`
      : '';

    el.innerHTML = `
      <div class="ai-msg-bubble ${animate ? 'ai-msg-animate' : ''}">
        ${html}
        ${toolsHtml}
      </div>
    `;
    msgEl.appendChild(el);
    scrollToBottom();
  }

  function appendRaw(html) {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    msgEl.appendChild(temp.firstChild);
  }

  function scrollToBottom() {
    setTimeout(() => { msgEl.scrollTop = msgEl.scrollHeight; }, 50);
  }

  function escapeHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function formatAssistantMessage(text) {
    // Markdown-lite: bold, code, bullet lists, line breaks
    return String(text)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code style="background:var(--bg-elevated);padding:1px 4px;border-radius:3px;font-family:var(--font-mono);font-size:0.9em">$1</code>')
      .replace(/^### (.+)$/gm, '<div style="font-weight:var(--fw-semi);font-size:var(--text-sm);color:var(--text-primary);margin-top:8px;margin-bottom:2px">$1</div>')
      .replace(/^## (.+)$/gm, '<div style="font-weight:var(--fw-bold);margin-top:10px;margin-bottom:4px">$1</div>')
      .replace(/^- (.+)$/gm, '<div style="padding-left:12px">• $1</div>')
      .replace(/^\d+\. (.+)$/gm, '<div style="padding-left:12px;color:var(--text-secondary)">$1</div>')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');
  }
}

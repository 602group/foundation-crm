/**
 * Epic Foundation CRM — AI Internal Operator
 * Persistent FAB Widget attached to the root layout.
 */

const AI_SERVER = window.location.hostname === 'localhost' ? 'http://localhost:3001' : '';

function initAIOperator() {
  const session = typeof Auth !== 'undefined' ? Auth.getSession() : null;

  // Admin-only guard
  if (!session) return;

  // Prevent double initialization
  if (document.getElementById('ai-fab-container')) return;

  // State
  let chatHistory = [];           // [{role, content}]
  let attachedFile = null;        // { fileName, content, rowCount }
  let isLoading = false;
  let isOpen = false;

  // Load saved history
  try { chatHistory = JSON.parse(localStorage.getItem('crm_ai_history') || '[]'); } catch { chatHistory = []; }

  // ── 1. Create Shell DOM Elements ─────────────────────────────────────────────
  const container = document.createElement('div');
  container.className = 'ai-fab-container';
  container.id = 'ai-fab-container';

  const fabBtn = document.createElement('button');
  fabBtn.className = 'ai-fab-btn';
  fabBtn.id = 'ai-fab-btn';
  fabBtn.title = 'AI Assistant';
  fabBtn.innerHTML = '✦';

  const widget = document.createElement('div');
  widget.className = 'ai-widget-window';
  widget.id = 'ai-widget-window';

  widget.innerHTML = `
    <!-- Header -->
    <div class="ai-widget-header" style="border-bottom:1px solid rgba(255,255,255,0.05);background:var(--bg-elevated);padding:16px">
      <div style="display:flex;flex-direction:column;gap:4px">
        <span style="font-weight:600;font-size:15px;color:var(--text-primary);display:flex;align-items:center;gap:6px;letter-spacing:0.3px">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="url(#ai-grad)"><defs><linearGradient id="ai-grad" x1="0" y1="0" x2="24" y2="24"><stop offset="0%" stop-color="#7c3aed"/><stop offset="100%" stop-color="#2563eb"/></linearGradient></defs><path d="M12 2l2.4 7.6H22l-6.2 4.5 2.4 7.6L12 17.2l-6.2 4.5 2.4-7.6L2 9.6h7.6L12 2z"/></svg>
          Internal Operator
        </span>
        <span id="ai-status-badge" style="font-size:11px;color:var(--text-muted);display:flex;align-items:center;gap:5px"><div class="pulse-dot" style="width:6px;height:6px;border-radius:50%;background:currentColor"></div>Connecting…</span>
      </div>
      <div style="display:flex;align-items:center;gap:6px">
        <button id="ai-clear-btn" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);color:var(--text-muted);cursor:pointer;font-size:11px;padding:4px 8px;border-radius:12px;transition:all 0.2s" onmouseover="this.style.background='rgba(255,255,255,0.08)';this.style.color='var(--text-primary)'" onmouseout="this.style.background='rgba(255,255,255,0.03)';this.style.color='var(--text-muted)'" title="Clear Chat">Clear</button>
        <button id="ai-close-btn" style="background:transparent;border:none;color:var(--text-muted);cursor:pointer;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;transition:background 0.2s" onmouseover="this.style.background='rgba(255,255,255,0.08)';this.style.color='var(--text-primary)'" onmouseout="this.style.background='transparent';this.style.color='var(--text-muted)'" title="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
    </div>

    <!-- Body -->
    <div class="ai-widget-body">
      <!-- Quick chips -->
      <div class="ai-chips" id="ai-chips" style="padding:10px 14px 0 14px;border-bottom:none;flex-wrap:nowrap;overflow-x:auto">
        <button class="ai-chip" data-q="What needs my attention today?">📋 Summary</button>
        <button class="ai-chip" data-q="Any overdue tasks?">⚠️ Tasks</button>
        <button class="ai-chip" data-q="Find duplicate users">🔍 Duplicates</button>
      </div>

      <!-- Messages -->
      <div class="ai-messages-scroll" id="ai-messages">
        <div class="ai-msg ai-msg-assistant">
          <div class="ai-msg-bubble">
            <strong>Hi, I'm your Epic Foundation Operator.</strong><br>
            I run locally and can query your CRM securely. I see the page you're currently viewing, so feel free to ask questions about the record on your screen!
          </div>
        </div>
      </div>

      <!-- Pending Actions -->
      <div id="ai-actions-area" style="display:none;padding:12px 16px;border-top:var(--border-subtle);background:rgba(var(--accent-rgb, 124, 58, 237), 0.05)"></div>
    </div>

    <!-- Input Area -->
    <div class="ai-input-wrapper">
      <div class="ai-file-pill" id="ai-file-pill" style="display:none;margin-bottom:8px">
        <span id="ai-file-name" style="font-size:11px">file.csv</span>
        <button id="ai-file-remove" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:10px">✕</button>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <label class="ai-attach-btn" title="Attach context" for="ai-file-input" style="cursor:pointer;opacity:0.6">📎</label>
        <input type="file" id="ai-file-input" accept=".csv,.txt,.json" style="display:none">
        
        <textarea class="input" id="ai-input" placeholder="Ask anything..." rows="1" style="min-height:36px;padding:8px;resize:none;flex:1"></textarea>
        
        <button class="btn btn-primary btn-icon" id="ai-send-btn" title="Send" style="flex-shrink:0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>
        </button>
      </div>
    </div>
  `;

  container.appendChild(widget);
  container.appendChild(fabBtn);
  document.body.appendChild(container);

  // ── 2. UI Hookups ────────────────────────────────────────────────────────────
  const msgEl = document.getElementById('ai-messages');
  const textarea = document.getElementById('ai-input');
  const sendBtn = document.getElementById('ai-send-btn');
  const statusBadge = document.getElementById('ai-status-badge');

  // Open/Close toggle
  fabBtn.addEventListener('click', () => {
    isOpen = !isOpen;
    if (isOpen) {
      widget.classList.add('open');
      fabBtn.style.transform = 'scale(0.9) rotate(90deg)';
      fabBtn.innerHTML = '✕';
      setTimeout(() => textarea.focus(), 100);
      scrollToBottom();
    } else {
      widget.classList.remove('open');
      fabBtn.style.transform = 'scale(1) rotate(0deg)';
      fabBtn.innerHTML = '✦';
    }
  });

  // Dedicated Close button inside header
  document.getElementById('ai-close-btn').addEventListener('click', () => {
    isOpen = false;
    widget.classList.remove('open');
    fabBtn.style.transform = 'scale(1) rotate(0deg)';
    fabBtn.innerHTML = '✦';
  });

  // Check server health
  fetch(`${AI_SERVER}/api/assistant/health`)
    .then(r => r.json())
    .then(() => { statusBadge.textContent = '✓ Securely Connected'; statusBadge.style.color = 'var(--status-green)'; })
    .catch(() => { statusBadge.textContent = '✗ Offline'; statusBadge.style.color = 'var(--status-red)'; });

  // Render existing history
  chatHistory.forEach(turn => appendMessage(turn.role, turn.content, false));
  if (chatHistory.length > 0) scrollToBottom();

  // Clear Chat
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

  // Auto-resize
  textarea.addEventListener('input', () => {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  });

  textarea.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });

  sendBtn.addEventListener('click', sendMessage);

  // File attach
  const fileInput = document.getElementById('ai-file-input');
  const filePill = document.getElementById('ai-file-pill');
  fileInput.addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const r = await fetch(`${AI_SERVER}/api/assistant/upload`, { method: 'POST', body: fd });
      if (!r.ok) { Toast.error('File upload failed'); return; }
      attachedFile = await r.json();
      document.getElementById('ai-file-name').textContent = `${attachedFile.fileName} (${attachedFile.rowCount} rows)`;
      filePill.style.display = 'flex';
      Toast.info(`File attached: ${attachedFile.fileName}`);
    } catch { Toast.error('Could not reach server'); }
    fileInput.value = '';
  });

  document.getElementById('ai-file-remove').addEventListener('click', () => {
    attachedFile = null;
    filePill.style.display = 'none';
  });

  // ── 3. Core Logic ────────────────────────────────────────────────────────────
  async function sendMessage() {
    const text = textarea.value.trim();
    if (!text || isLoading) return;

    isLoading = true;
    textarea.value = '';
    textarea.style.height = 'auto';
    sendBtn.disabled = true;
    sendBtn.style.opacity = '0.4';

    appendMessage('user', text, true);
    chatHistory.push({ role: 'user', content: text });

    // Show typing
    const thinkId = 'think-' + Date.now();
    appendRaw(`<div class="ai-msg ai-msg-assistant" id="${thinkId}">
      <div class="ai-msg-bubble"><span style="animation: pulse 1s infinite">Thinking...</span></div>
    </div>`);
    scrollToBottom();

    try {
      // **Requirement 2**: Context Awareness via Frontend
      const currentUrl = window.location.hash || '#dashboard';
      
      const sessionContext = buildContext();
      const body = {
        message: text,
        context: sessionContext,
        history: chatHistory.slice(-16).map(t => ({ role: t.role, content: t.content })),
        fileContent: attachedFile?.content || null,
        currentUrl: currentUrl // Injecting exact URL!
      };

      const response = await fetch(`${AI_SERVER}/api/assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      document.getElementById(thinkId)?.remove();

      if (!response.ok) {
        const err = await response.json();
        appendMessage('assistant', `⚠️ ${err.error || 'Server error'}`, false);
        isLoading = false; sendBtn.disabled = false; sendBtn.style.opacity = '';
        return;
      }

      const data = await response.json();
      const reply = data.reply || 'Sorry, I could not generate a response.';

      if (attachedFile) { attachedFile = null; filePill.style.display = 'none'; }

      appendMessage('assistant', reply, true, data.toolsUsed);
      chatHistory.push({ role: 'assistant', content: reply });

      const trimmed = chatHistory.slice(-20);
      chatHistory = trimmed;
      localStorage.setItem('crm_ai_history', JSON.stringify(trimmed));

      if (data.proposedActions?.length > 0) {
        renderProposedActions(data.proposedActions);
      }

    } catch (err) {
      document.getElementById(thinkId)?.remove();
      appendMessage('assistant', '⚠️ Could not reach the AI backend server.', false);
    }

    isLoading = false;
    sendBtn.disabled = false;
    sendBtn.style.opacity = '';
  }

  // ── 4. Helpers ───────────────────────────────────────────────────────────────
  function appendMessage(role, content, animate = true, toolsUsed = []) {
    const el = document.createElement('div');
    el.className = `ai-msg ai-msg-${role}`;

    const html = role === 'assistant' ? formatAssistantMessage(content) : escapeHtml(content);
    const toolsHtml = toolsUsed?.length
      ? `<div style="font-size:10px;color:var(--text-muted);margin-top:6px;border-top:1px solid rgba(0,0,0,0.1);padding-top:4px">🔧 ${toolsUsed.join(', ')}</div>`
      : '';

    el.innerHTML = `<div class="ai-msg-bubble">${html}${toolsHtml}</div>`;
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
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function formatAssistantMessage(text) {
    return String(text)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code style="background:rgba(0,0,0,0.05);padding:1px 4px;border-radius:3px;font-family:monospace;font-size:0.9em">$1</code>')
      .replace(/^### (.+)$/gm, '<div style="font-weight:600;margin-top:8px">$1</div>')
      .replace(/^- (.+)$/gm, '<div style="padding-left:12px">• $1</div>')
      .replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>');
  }

  function buildContext() {
    const TABLES = ['users','auctions','opportunities','donations','courses','tasks','financials','messages','events'];
    const tables = {};
    TABLES.forEach(t => {
      const rows = Store._getTable ? Store._getTable(t) : (Store.getAll ? Store.getAll(t) : []);
      tables[t] = rows.map(r => {
        const clean = { ...r };
        delete clean.activityLog;
        delete clean.passwordHash;
        return clean;
      });
    });
    return { tables };
  }

  function renderProposedActions(actions) {
    const area = document.getElementById('ai-actions-area');
    area.style.display = 'block';

    actions.forEach(action => {
      const card = document.createElement('div');
      card.style.cssText = 'background:var(--bg-surface);border:var(--border-subtle);border-radius:var(--radius-md);padding:10px;margin-bottom:8px;font-size:12px;box-shadow:var(--shadow-sm)';
      
      const type = action._action || 'action';
      const data = action.data || {};
      const label = type === 'create_task'
        ? `Create Task: "${data.title}"`
        : type === 'add_note'
        ? `Add Note to ${data.table} ${data.id}`
        : JSON.stringify(action).slice(0, 50);

      card.innerHTML = `
        <div style="font-weight:600;margin-bottom:6px">${label}</div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-primary btn-sm ai-approve-btn">✓ Approve</button>
          <button class="btn btn-ghost btn-sm ai-reject-btn" style="color:var(--status-red)">✕ Cancel</button>
        </div>
      `;

      card.querySelector('.ai-approve-btn').addEventListener('click', () => {
        executeApprovedAction(action);
        card.innerHTML = `<div style="color:var(--status-green)">✓ Approved</div>`;
      });
      card.querySelector('.ai-reject-btn').addEventListener('click', () => {
        card.innerHTML = `<div style="color:var(--text-muted)">✕ Rejected</div>`;
      });

      area.appendChild(card);
    });
  }

  function executeApprovedAction(action) {
    const type = action._action;
    const data = action.data || {};
    const actor = session?.name || 'AI Assistant';

    if (type === 'create_task') {
      Store.create('tasks', { title: data.title, description: data.description || '', priority: data.priority || 'Medium', status: 'Open', dueDate: data.dueDate || '' }, actor);
      Toast.success('Task created');
    } else if (type === 'add_note') {
      const existing = Store.getById(data.table, data.id);
      if (existing) {
        Store.update(data.table, data.id, { notes: (existing.notes ? existing.notes + '\n\n' : '') + data.content }, actor);
        Toast.success('Note added');
      }
    }
  }
}

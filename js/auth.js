/**
 * EPIC Foundation CRM — Auth Module (v2 — Server-backed sessions)
 * Login validates against Supabase via /api/auth/login.
 * Session state is stored in an HttpOnly cookie on the server.
 * The client queries /api/auth/session to check auth status on load.
 */

const Auth = (() => {
  'use strict';

  // ─── Section keys for sidebar nav ──────────────────────────────────────────
  const SECTIONS = ['dashboard','users','auctions','opportunities','courses',
    'donations','tasks','financials','messages','events','imports','admin'];

  // ─── Role defaults (used locally for display only) ──────────────────────────
  const ROLE_DEFAULTS = {
    'Super Admin': { _all: true },
    'Admin': {
      dashboard: 'view', users: 'view,create,edit,delete,export',
      auctions: 'view,create,edit,delete,export,import', opportunities: 'view,create,edit,delete,export,import',
      donations: 'view,create,edit,delete,export,import', courses: 'view,create,edit,delete,export,import',
      tasks: 'view,create,edit,delete,export', financials: 'view,create,edit,delete,export',
      messages: 'view,create,edit', events: 'view,create,edit,delete,export', imports: 'view,create', admin: '',
    },
    'Limited Admin': {
      dashboard: 'view', users: 'view,edit', auctions: 'view,edit,export', opportunities: 'view,edit',
      donations: 'view', courses: 'view', tasks: 'view,create,edit,delete', financials: '', messages: 'view',
      events: 'view', imports: '', admin: '',
    },
    'View Only': {
      dashboard: 'view', users: 'view', auctions: 'view,export', opportunities: 'view', donations: 'view',
      courses: 'view', tasks: 'view', financials: '', messages: 'view', events: 'view', imports: '', admin: '',
    },
  };

  // ─── In-memory session (populated from server on init) ──────────────────────
  let _session = null;

  // ─── API helper ────────────────────────────────────────────────────────────
  function _apiBase() {
    if (typeof window === 'undefined') return '';
    const { protocol, hostname, port } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') return `${protocol}//${hostname}:${port || 3001}`;
    return '';
  }

  async function _api(method, path, body) {
    const res = await fetch(_apiBase() + path, {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.json();
  }

  // ─── Check session from server (called at app init) ─────────────────────────
  async function checkSession() {
    try {
      const data = await _api('GET', '/api/auth/session');
      if (data.authenticated) {
        _session = data;
        return true;
      }
    } catch {}
    _session = null;
    return false;
  }

  function getSession() { return _session; }
  function isLoggedIn() { return !!_session; }

  // ─── Permission checker ─────────────────────────────────────────────────────
  function getPermission(section, action) {
    if (!_session) return false;
    const perms = _session.permissions || ROLE_DEFAULTS[_session.role] || {};
    if (perms._all) return true;
    const sectionPerms = perms[section] || '';
    if (!sectionPerms) return false;
    if (action === 'view') return sectionPerms.includes('view') || sectionPerms.includes('all');
    return sectionPerms.includes(action) || sectionPerms.includes('all');
  }

  // ─── Apply permission-aware sidebar ────────────────────────────────────────
  function applyPermissions() {
    if (!_session) return;
    SECTIONS.forEach(section => {
      const navItem = document.querySelector(`.nav-item[data-page="${section}"]`) || document.querySelector(`[data-page="${section}"]`);
      if (!navItem) return;
      navItem.style.display = getPermission(section, 'view') ? '' : 'none';
    });
    const userNameEl     = document.getElementById('sidebar-user-name');
    const userRoleEl     = document.getElementById('sidebar-user-role');
    const userInitialsEl = document.getElementById('sidebar-user-initials');
    if (userNameEl)     userNameEl.textContent  = _session.name;
    if (userRoleEl)     userRoleEl.textContent  = _session.role;
    if (userInitialsEl) {
      const parts = (_session.name || '').split(' ');
      userInitialsEl.textContent = ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase();
    }
  }

  // ─── Login screen ───────────────────────────────────────────────────────────
  function showLoginScreen(errorMsg = '') {
    document.body.innerHTML = `
      <div class="login-screen">
        <div class="login-card">
          <div class="login-logo">
            <div class="login-logo-mark">EF</div>
            <div class="login-logo-text">
              <div class="login-brand">Epic Foundation</div>
              <div class="login-sub">CRM · Operations Platform</div>
            </div>
          </div>
          <div class="login-form">
            <div class="form-group" style="margin-bottom:var(--space-4)">
              <label class="form-label">Email</label>
              <input class="input" type="email" id="login-email" placeholder="admin@epicfoundation.com" autocomplete="email">
            </div>
            <div class="form-group" style="margin-bottom:var(--space-2)">
              <label class="form-label">Password</label>
              <div style="position:relative">
                <input class="input" type="password" id="login-password" placeholder="Enter your password" autocomplete="current-password">
                <button id="toggle-pw" type="button" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:14px;color:var(--text-muted)" title="Show/hide password">👁</button>
              </div>
            </div>
            ${errorMsg ? `<div id="login-error" style="color:var(--status-red);font-size:var(--text-xs);margin-bottom:var(--space-3);padding:var(--space-2) var(--space-3);background:var(--status-red-bg);border-radius:var(--radius-md)">${errorMsg}</div>` : ''}
            <button class="btn btn-primary" id="login-btn" style="width:100%;margin-top:var(--space-4);padding:10px;font-size:var(--text-sm)">
              Sign In →
            </button>
            <div style="margin-top:var(--space-3);font-size:var(--text-xs);color:var(--text-muted);text-align:center">
              First login? Leave password blank or enter any password to set it.
            </div>
          </div>
          <div style="margin-top:var(--space-5);font-size:var(--text-xs);color:var(--text-muted);text-align:center">
            Internal use only · Epic Foundation
          </div>
        </div>
      </div>
    `;

    const toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);

    const emailEl  = document.getElementById('login-email');
    const pwEl     = document.getElementById('login-password');
    const loginBtn = document.getElementById('login-btn');
    const togglePw = document.getElementById('toggle-pw');

    if (togglePw) {
      togglePw.onclick = () => {
        pwEl.type = pwEl.type === 'password' ? 'text' : 'password';
        togglePw.textContent = pwEl.type === 'password' ? '👁' : '🙈';
      };
    }

    const doLogin = () => {
      loginBtn.disabled = true;
      loginBtn.textContent = 'Signing in…';
      attemptLogin(emailEl.value.trim(), pwEl.value).then(ok => {
        if (!ok) { loginBtn.disabled = false; loginBtn.textContent = 'Sign In →'; }
      });
    };

    loginBtn.addEventListener('click', doLogin);
    pwEl.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
    emailEl.addEventListener('keydown', e => { if (e.key === 'Enter') pwEl.focus(); });
    setTimeout(() => emailEl?.focus(), 100);
  }

  // ─── Login attempt ──────────────────────────────────────────────────────────
  async function attemptLogin(email, password) {
    if (!email) { showLoginScreen('Please enter your email address.'); return false; }
    try {
      const data = await _api('POST', '/api/auth/login', { email, password });
      if (data.error) { showLoginScreen(data.error); return false; }
      // Session cookie set by server — re-check and load app
      const ok = await checkSession();
      if (ok) {
        await Store.init();
        window.location.reload();
      } else {
        showLoginScreen('Login failed. Please try again.');
      }
      return ok;
    } catch (err) {
      showLoginScreen('Could not reach the server. Make sure it is running.');
      return false;
    }
  }

  // ─── Logout ─────────────────────────────────────────────────────────────────
  async function logout() {
    try { await _api('POST', '/api/auth/logout'); } catch {}
    _session = null;
    showLoginScreen();
  }

  // ─── Guard: called at app init ──────────────────────────────────────────────
  async function requireLogin() {
    const ok = await checkSession();
    if (!ok) {
      showLoginScreen();
      return false;
    }
    return true;
  }

  // ─── Password hash (kept for migration helpers only) ────────────────────────
  async function hashPassword(plain) {
    if (!plain) return null;
    const data = new TextEncoder().encode(plain);
    const buf  = await window.crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  return {
    checkSession, getSession, isLoggedIn,
    getPermission, applyPermissions,
    showLoginScreen, attemptLogin, logout, requireLogin,
    hashPassword,
    ROLE_DEFAULTS, SECTIONS,
    // Legacy compatibility shims
    setSession: () => {},
    clearSession: () => { _session = null; },
    verifyPassword: async () => true,
  };
})();

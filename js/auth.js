/**
 * EPIC Foundation CRM — Auth Module
 * localStorage-based session management + login gate
 * Passwords hashed with SHA-256 via SubtleCrypto
 */

const Auth = (() => {
  'use strict';

  const SESSION_KEY = 'crm_session';
  const MAX_SESSION_HOURS = 24;

  // ── Section keys that map to sidebar nav items ──────────────────────────────
  const SECTIONS = ['dashboard','users','auctions','opportunities','courses',
    'donations','tasks','financials','messages','events','imports','admin'];

  // ── Default role permission templates ───────────────────────────────────────
  // Used when an admin record has no custom permissions set
  const ROLE_DEFAULTS = {
    'Super Admin': { _all: true },
    'Admin': {
      dashboard: 'view',
      users: 'view,create,edit,delete,export',
      auctions: 'view,create,edit,delete,export,import',
      opportunities: 'view,create,edit,delete,export,import',
      donations: 'view,create,edit,delete,export,import',
      courses: 'view,create,edit,delete,export,import',
      tasks: 'view,create,edit,delete,export',
      financials: 'view,create,edit,delete,export',
      messages: 'view,create,edit',
      events: 'view,create,edit,delete,export',
      imports: 'view,create',
      admin: '',
    },
    'Limited Admin': {
      dashboard: 'view',
      users: 'view,edit',
      auctions: 'view,edit,export',
      opportunities: 'view,edit',
      donations: 'view',
      courses: 'view',
      tasks: 'view,create,edit,delete',
      financials: '',
      messages: 'view',
      events: 'view',
      imports: '',
      admin: '',
    },
    'View Only': {
      dashboard: 'view',
      users: 'view',
      auctions: 'view,export',
      opportunities: 'view',
      donations: 'view',
      courses: 'view',
      tasks: 'view',
      financials: '',
      messages: 'view',
      events: 'view',
      imports: '',
      admin: '',
    },
  };

  // ── Password hashing ────────────────────────────────────────────────────────
  async function hashPassword(plain) {
    if (!plain) return null;
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async function verifyPassword(plain, storedHash) {
    if (!storedHash) return true; // null hash = first-login bypass
    const hash = await hashPassword(plain);
    return hash === storedHash;
  }

  // ── Session management ──────────────────────────────────────────────────────
  function getSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw);
      // Check expiry
      const ageHours = (Date.now() - session.loginTime) / 3600000;
      if (ageHours > MAX_SESSION_HOURS) { clearSession(); return null; }
      return session;
    } catch { return null; }
  }

  function setSession(adminRecord) {
    const perms = adminRecord.permissions || ROLE_DEFAULTS[adminRecord.role] || {};
    const session = {
      adminId: adminRecord.id,
      name: adminRecord.name,
      email: adminRecord.email,
      role: adminRecord.role,
      permissions: perms,
      loginTime: Date.now(),
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  function isLoggedIn() {
    return !!getSession();
  }

  // ── Permission checker ──────────────────────────────────────────────────────
  function getPermission(section, action) {
    const session = getSession();
    if (!session) return false;
    const perms = session.permissions || {};
    if (perms._all) return true; // Super Admin
    const sectionPerms = perms[section] || '';
    if (!sectionPerms) return false;
    if (action === 'view') return sectionPerms.includes('view') || sectionPerms.includes('all');
    return sectionPerms.includes(action) || sectionPerms.includes('all');
  }

  // ── Apply permission-aware sidebar ─────────────────────────────────────────
  function applyPermissions() {
    const session = getSession();
    if (!session) return;

    // Hide/show nav items based on permissions
    SECTIONS.forEach(section => {
      const navItem = document.querySelector(`.nav-item[data-page="${section}"]`)
        || document.querySelector(`[data-page="${section}"]`);
      if (!navItem) return;

      const hasView = getPermission(section, 'view');
      navItem.style.display = hasView ? '' : 'none';
    });

    // Update user display in sidebar
    const userNameEl = document.getElementById('sidebar-user-name');
    const userRoleEl = document.getElementById('sidebar-user-role');
    const userInitialsEl = document.getElementById('sidebar-user-initials');
    if (userNameEl) userNameEl.textContent = session.name;
    if (userRoleEl) userRoleEl.textContent = session.role;
    if (userInitialsEl) {
      const parts = session.name.split(' ');
      userInitialsEl.textContent = (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
    }
  }

  // ── Login screen ────────────────────────────────────────────────────────────
  function showLoginScreen(errorMsg = '') {
    // Remove any existing app shell classes so the login occupies full screen
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
            <div id="login-first-time" style="display:none;margin-top:var(--space-3);font-size:var(--text-xs);color:var(--text-muted);text-align:center">
              First login? Leave password blank or enter any password to set it.
            </div>
          </div>
          <div style="margin-top:var(--space-5);font-size:var(--text-xs);color:var(--text-muted);text-align:center">
            Internal use only · Epic Foundation
          </div>
        </div>
      </div>
    `;

    // Toast container needed even on login screen
    const toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);

    const emailEl = document.getElementById('login-email');
    const pwEl = document.getElementById('login-password');
    const loginBtn = document.getElementById('login-btn');
    const togglePw = document.getElementById('toggle-pw');

    // Check if any admin has null password → show first-time hint
    if (typeof Store !== 'undefined') {
      const admins = Store.getAll('admins');
      if (admins.some(a => !a.passwordHash)) {
        document.getElementById('login-first-time').style.display = 'block';
      }
    }

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
        if (!ok) {
          loginBtn.disabled = false;
          loginBtn.textContent = 'Sign In →';
        }
      });
    };

    loginBtn.addEventListener('click', doLogin);
    pwEl.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
    emailEl.addEventListener('keydown', e => { if (e.key === 'Enter') pwEl.focus(); });

    // Auto-focus email
    setTimeout(() => emailEl?.focus(), 100);
  }

  // ── Login attempt logic ─────────────────────────────────────────────────────
  async function attemptLogin(email, password) {
    if (!email) { showLoginScreen('Please enter your email address.'); return false; }

    let admins = [];
    try { admins = Store.getAll('admins'); } catch { }

    const admin = admins.find(a => a.email?.toLowerCase() === email.toLowerCase());

    if (!admin) {
      showLoginScreen('No admin account found with that email address.');
      return false;
    }

    if (admin.status === 'Suspended' || admin.status === 'Inactive') {
      showLoginScreen('Your account is inactive or suspended. Contact a Super Admin.');
      return false;
    }

    const passwordOk = await verifyPassword(password, admin.passwordHash);

    if (!passwordOk) {
      showLoginScreen('Incorrect password. Please try again.');
      return false;
    }

    // First-login: set the password if it was null
    if (!admin.passwordHash && password) {
      const newHash = await hashPassword(password);
      Store.update('admins', admin.id, { passwordHash: newHash });
    }

    // Update last login
    Store.update('admins', admin.id, { lastLogin: new Date().toISOString() });

    // Set session
    setSession(admin);

    // Reload the app
    window.location.reload();
    return true;
  }

  // ── Logout ──────────────────────────────────────────────────────────────────
  function logout() {
    clearSession();
    showLoginScreen();
  }

  // ── Guard: call at app init ─────────────────────────────────────────────────
  function requireLogin() {
    if (!isLoggedIn()) {
      // Delay slightly to let Store initialize first
      setTimeout(() => showLoginScreen(), 0);
      return false;
    }
    return true;
  }

  return {
    hashPassword,
    verifyPassword,
    getSession,
    setSession,
    clearSession,
    isLoggedIn,
    getPermission,
    applyPermissions,
    showLoginScreen,
    attemptLogin,
    logout,
    requireLogin,
    ROLE_DEFAULTS,
    SECTIONS,
  };
})();

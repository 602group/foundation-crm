/**
 * EPIC Foundation CRM — Dashboard Page (Chunk 6 Rebuild)
 * Full command center: metrics, alerts, priorities, pipeline snapshots, revenue, activity.
 */

function renderDashboard() {
  const main = document.getElementById('main');
  const stats = Store.getStats();
  const today = new Date().toISOString().split('T')[0];
  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const fmt = n => (n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  // ── Alert collection ────────────────────────────────────────────────────────
  const alerts = [];
  if (stats.tasksOverdue > 0)        alerts.push({ icon: '⚠', color: 'var(--status-red)',   label: `${stats.tasksOverdue} overdue task${stats.tasksOverdue > 1 ? 's' : ''}`, route: 'tasks?view=overdue' });
  if (stats.tasksDueToday > 0)       alerts.push({ icon: '📅', color: 'var(--status-amber)', label: `${stats.tasksDueToday} task${stats.tasksDueToday > 1 ? 's' : ''} due today`, route: 'tasks?view=today' });
  if (stats.donationsUnassigned > 0) alerts.push({ icon: '💛', color: 'var(--status-amber)', label: `${stats.donationsUnassigned} unassigned donation${stats.donationsUnassigned > 1 ? 's' : ''}`, route: 'donations' });
  if (stats.auctionRoundFollowUp > 0) alerts.push({ icon: '🔄', color: 'var(--status-purple)', label: `${stats.auctionRoundFollowUp} auction${stats.auctionRoundFollowUp > 1 ? 's' : ''} need follow-up`, route: 'auctions' });
  if (stats.oppsRoundFollowUp > 0)   alerts.push({ icon: '🔄', color: 'var(--status-purple)', label: `${stats.oppsRoundFollowUp} opp${stats.oppsRoundFollowUp > 1 ? 's' : ''} need follow-up`, route: 'opportunities' });

  // ── Pipeline chips helper ────────────────────────────────────────────────────
  const pipeChip = (label, count, color, route) => count > 0
    ? `<div class="pipe-chip" onclick="Router.navigate('${route}')" style="border-color:${color}20;background:${color}10;cursor:pointer" title="Go to ${label}">
        <span class="pipe-chip-count" style="color:${color}">${count}</span>
        <span class="pipe-chip-label">${label}</span>
       </div>`
    : `<div class="pipe-chip" style="opacity:0.35">
        <span class="pipe-chip-count">0</span>
        <span class="pipe-chip-label">${label}</span>
       </div>`;

  // ── Today's priorities ───────────────────────────────────────────────────────
  const allTasks = Store.getAll('tasks');
  const todayTasks = allTasks.filter(t => (t.dueDate === today || (t.dueDate && t.dueDate < today)) && t.status !== 'Complete' && t.status !== 'Cancelled')
    .sort((a, b) => (a.dueDate || '9') < (b.dueDate || '9') ? -1 : 1)
    .slice(0, 8);

  // ── Recent activity ──────────────────────────────────────────────────────────
  const recent = Store.getRecentActivity(12);
  const tableLabels = { users: 'Users', auctions: 'Auctions', opportunities: 'Special Opps', courses: 'Courses', donations: 'Donations', tasks: 'Tasks', financials: 'Financials', messages: 'Messages', events: 'Events', admins: 'Admins' };

  main.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <span class="page-title">Dashboard</span>
        <span class="page-subtitle">${todayLabel}</span>
      </div>
      <div class="page-header-right">
        <button class="btn btn-ghost btn-sm" onclick="renderDashboard()">${Icons.refresh || '↻'} Refresh</button>
        <button class="btn btn-primary" id="dash-new-task-btn">${Icons.plus} New Task</button>
      </div>
    </div>
    <div class="page-content" id="dash-content">

      ${alerts.length ? `
      <!-- ── Alerts ── -->
      <div style="display:flex;gap:var(--space-2);flex-wrap:wrap;margin-bottom:var(--space-4)">
        ${alerts.map(a => `
          <div class="alert-chip" onclick="Router.navigate('${a.route}')" style="border-color:${a.color}30;background:${a.color}12;cursor:pointer">
            <span>${a.icon}</span>
            <span style="color:${a.color};font-size:var(--text-sm);font-weight:var(--fw-medium)">${a.label}</span>
          </div>
        `).join('')}
      </div>` : ''}

      <!-- ── Top Metrics ── -->
      <div class="stat-grid" style="margin-bottom:var(--space-5)">
        ${[
          { label: 'Total Users',       value: stats.users,         sub: `${stats.usersDonors} donors · ${stats.usersBuyers} buyers`,  icon: Icons.users,   color: 'var(--status-blue-bg)',   route: 'users' },
          { label: 'Live Auctions',     value: stats.auctionLive,   sub: `${stats.auctions} total auction records`,                     icon: Icons.auctions,color: 'var(--status-amber-bg)',  route: 'auctions' },
          { label: 'Rounds Pending',    value: stats.auctionRoundPending + stats.oppsRoundPending, sub: `${stats.auctionRoundScheduled + stats.oppsRoundScheduled} scheduled`, icon: Icons.calendar || '📅', color: 'var(--status-purple-bg)', route: 'auctions' },
          { label: 'Open Tasks',        value: stats.openTasks,     sub: `${stats.tasksOverdue} overdue · ${stats.tasksDueToday} today`, icon: Icons.tasks,   color: 'var(--status-red-bg)',    route: 'tasks' },
          { label: 'Special Opps',      value: stats.opportunities, sub: `${stats.oppsAvailable} available`,                            icon: Icons.opportunities, color: 'var(--status-teal-bg)', route: 'opportunities' },
          { label: 'Donations',         value: stats.donations,     sub: `${stats.donationsUnassigned} unassigned`,                     icon: Icons.donations, color: 'var(--status-green-bg)', route: 'donations' },
          { label: 'Courses & Clubs',   value: stats.courses,       sub: 'Registered venues',                                           icon: Icons.courses, color: 'var(--status-blue-bg)',   route: 'courses' },
          { label: 'Upcoming Events',   value: stats.upcomingEvents,sub: `${stats.events} total events`,                                icon: Icons.events,  color: 'var(--accent-faint)',     route: 'events' },
        ].map(s => `
          <div class="stat-card" style="cursor:pointer" onclick="Router.navigate('${s.route}')">
            <div class="stat-card-icon" style="background:${s.color}">${s.icon}</div>
            <div class="stat-card-label">${s.label}</div>
            <div class="stat-card-value">${s.value}</div>
            <div class="stat-card-sub">${s.sub}</div>
          </div>
        `).join('')}
      </div>

      <!-- ── Revenue Summary ── -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:var(--space-4);margin-bottom:var(--space-5)">
        ${[
          { label: 'Total FMV Tracked',    value: fmt(stats.totalFMV),         color: 'var(--text-primary)' },
          { label: 'Total Sale Value',      value: fmt(stats.totalSaleValue),   color: 'var(--status-green)' },
          { label: 'Est. Revenue (Fins)',   value: fmt(stats.finEstRevenue),    color: 'var(--status-amber)' },
          { label: 'Actual Revenue (Fins)', value: fmt(stats.finActualRevenue), color: 'var(--status-green)' },
        ].map(s => `
          <div class="stat-card" style="cursor:pointer" onclick="Router.navigate('financials')">
            <div class="stat-card-label">${s.label}</div>
            <div class="stat-card-value" style="font-size:var(--text-xl);color:${s.color}">${s.value}</div>
          </div>
        `).join('')}
      </div>

      <!-- ── Main Grid ── -->
      <div class="dashboard-grid">

        <!-- LEFT: Priorities + Pipelines -->
        <div style="display:flex;flex-direction:column;gap:var(--space-4)">

          <!-- Today's Priorities -->
          <div class="feed-card">
            <div class="feed-card-header">
              Today's Priorities
              <button class="btn btn-ghost btn-sm" onclick="Router.navigate('tasks?view=today')" style="font-size:var(--text-xs)">View all →</button>
            </div>
            ${todayTasks.length === 0
              ? `<div style="color:var(--text-muted);font-size:var(--text-sm);text-align:center;padding:var(--space-6)">✅ All clear — nothing due today!</div>`
              : `<div style="display:flex;flex-direction:column;gap:var(--space-1)">
                  ${todayTasks.map(t => {
                    const isOD = t.dueDate && t.dueDate < today;
                    return `<div style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-2) var(--space-3);border-radius:var(--radius-md);background:var(--bg-elevated);cursor:pointer" class="dash-task-row" data-tid="${t.id}">
                      <button class="dash-quick-complete" data-tid="${t.id}" style="width:20px;height:20px;border-radius:50%;border:2px solid ${isOD ? 'var(--status-red)' : 'var(--border-color)'};background:transparent;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:10px;color:var(--text-muted)">✓</button>
                      <span style="flex:1;font-size:var(--text-sm);font-weight:var(--fw-medium);color:${isOD ? 'var(--status-red)' : 'var(--text-primary)'};">${t.title}</span>
                      ${t.priority ? `<span class="badge badge-${t.priority === 'Urgent' ? 'red' : t.priority === 'High' ? 'amber' : t.priority === 'Medium' ? 'blue' : 'gray'}" style="font-size:10px">${t.priority}</span>` : ''}
                      <span style="font-size:var(--text-xs);color:${isOD ? 'var(--status-red)' : 'var(--text-muted)'}">${isOD ? '⚠ ' : ''}${t.dueDate||''}</span>
                    </div>`;
                  }).join('')}
                </div>`}
          </div>

          <!-- Auction Pipeline -->
          <div class="feed-card">
            <div class="feed-card-header">
              Auction Pipeline
              <button class="btn btn-ghost btn-sm" onclick="Router.navigate('auctions')" style="font-size:var(--text-xs)">View all →</button>
            </div>
            <div class="pipeline-track">
              ${pipeChip('New',          stats.auctionNew,          'var(--text-muted)',        'auctions')}
              ${pipeChip('Pending',      stats.auctionPending,      'var(--status-amber)',      'auctions')}
              ${pipeChip('Booked',       stats.auctionBooked,       'var(--status-blue)',       'auctions')}
              ${pipeChip('Live',         stats.auctionLive,         'var(--status-green)',      'auctions')}
              ${pipeChip('Closed',       stats.auctionClosed,       'var(--text-secondary)',    'auctions')}
              ${pipeChip('Rnd Pending',  stats.auctionRoundPending, 'var(--status-purple)',     'auctions')}
              ${pipeChip('Scheduled',    stats.auctionRoundScheduled,'var(--status-teal)',      'auctions')}
              ${pipeChip('Follow Up',    stats.auctionRoundFollowUp,'var(--status-red)',        'auctions')}
              ${pipeChip('Complete',     stats.auctionRoundComplete, 'var(--status-green)',     'auctions')}
            </div>
          </div>

          <!-- Special Opps Pipeline -->
          <div class="feed-card">
            <div class="feed-card-header">
              Special Opps Pipeline
              <button class="btn btn-ghost btn-sm" onclick="Router.navigate('opportunities')" style="font-size:var(--text-xs)">View all →</button>
            </div>
            <div class="pipeline-track">
              ${pipeChip('New',         stats.oppsNew,            'var(--text-muted)',      'opportunities')}
              ${pipeChip('Available',   stats.oppsAvailable,      'var(--status-green)',    'opportunities')}
              ${pipeChip('Reserved',    stats.oppsReserved,       'var(--status-blue)',     'opportunities')}
              ${pipeChip('Sold',        stats.oppsSold,           'var(--status-teal)',     'opportunities')}
              ${pipeChip('Rnd Pending', stats.oppsRoundPending,   'var(--status-purple)',   'opportunities')}
              ${pipeChip('Scheduled',   stats.oppsRoundScheduled, 'var(--status-teal)',     'opportunities')}
              ${pipeChip('Follow Up',   stats.oppsRoundFollowUp,  'var(--status-red)',      'opportunities')}
              ${pipeChip('Complete',    stats.oppsComplete,       'var(--status-green)',    'opportunities')}
            </div>
          </div>

        </div>

        <!-- RIGHT: Activity + Quick Nav -->
        <div style="display:flex;flex-direction:column;gap:var(--space-4)">

          <!-- Quick Actions -->
          <div class="feed-card">
            <div class="feed-card-header">Quick Actions</div>
            <div style="display:flex;flex-wrap:wrap;gap:var(--space-2)">
              <button class="btn btn-ghost btn-sm" id="dash-qa-task">+ Task</button>
              <button class="btn btn-ghost btn-sm" id="dash-qa-user">+ User</button>
              <button class="btn btn-ghost btn-sm" onclick="Router.navigate('auctions')">View Auctions</button>
              <button class="btn btn-ghost btn-sm" onclick="Router.navigate('opportunities')">View Opps</button>
              <button class="btn btn-ghost btn-sm" onclick="Router.navigate('tasks?view=overdue')">Overdue Tasks</button>
              <button class="btn btn-ghost btn-sm" onclick="Router.navigate('donations')">Donations</button>
              <button class="btn btn-ghost btn-sm" onclick="Router.navigate('financials')">Financials</button>
            </div>
          </div>

          <!-- Recent Activity -->
          <div class="feed-card" style="flex:1">
            <div class="feed-card-header">
              Recent Activity
              <span style="font-size:var(--text-xs);color:var(--text-muted)">${recent.length} events</span>
            </div>
            ${recent.length === 0
              ? `<div style="color:var(--text-muted);font-size:var(--text-sm);text-align:center;padding:var(--space-8)">No activity yet</div>`
              : `<div class="activity-log">
                  ${recent.map(entry => `
                    <div class="activity-entry">
                      <div class="activity-dot ${entry.type || 'updated'}"></div>
                      <div class="activity-content">
                        <div class="activity-text">
                          <strong>${tableLabels[entry.tableName] || entry.tableName}</strong> — ${entry.text}
                          <span style="color:var(--text-muted);font-family:var(--font-mono);font-size:10px;margin-left:6px">${entry.recordId}</span>
                        </div>
                        <div class="activity-time">${Store.formatDateTime(entry.timestamp)}</div>
                      </div>
                    </div>
                  `).join('')}
                </div>`}
          </div>

          <!-- Quick Nav -->
          <div class="feed-card">
            <div class="feed-card-header">Navigate</div>
            <div style="display:flex;flex-direction:column;gap:var(--space-1)">
              ${[
                { route: 'users',          label: 'Users',             count: stats.users,         icon: Icons.users },
                { route: 'auctions',       label: 'Auctions',          count: stats.auctions,      icon: Icons.auctions },
                { route: 'opportunities',  label: 'Special Opps',      count: stats.opportunities, icon: Icons.opportunities },
                { route: 'courses',        label: 'Courses & Clubs',   count: stats.courses,       icon: Icons.courses },
                { route: 'donations',      label: 'Donations',         count: stats.donations,     icon: Icons.donations },
                { route: 'tasks',          label: 'Tasks',             count: stats.tasks,         icon: Icons.tasks },
                { route: 'financials',     label: 'Financials',        count: stats.financials,    icon: Icons.financials },
                { route: 'messages',       label: 'Messages',          count: stats.messages,      icon: Icons.messages },
                { route: 'events',         label: 'Events',            count: stats.events,        icon: Icons.events },
              ].map(item => `
                <div onclick="Router.navigate('${item.route}')" style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-2) var(--space-3);border-radius:var(--radius-md);cursor:pointer;transition:background var(--transition-fast)" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background='transparent'">
                  <span style="color:var(--text-muted)">${item.icon}</span>
                  <span style="flex:1;font-size:var(--text-sm);color:var(--text-secondary)">${item.label}</span>
                  <span style="font-size:var(--text-xs);font-weight:var(--fw-semi);color:var(--text-muted);background:var(--bg-elevated);padding:1px 8px;border-radius:var(--radius-full)">${item.count}</span>
                </div>
              `).join('')}
            </div>
          </div>

        </div>
      </div>
    </div>
  `;

  // ── Event listeners ──────────────────────────────────────────────────────────
  document.getElementById('dash-new-task-btn')?.addEventListener('click', () => openTaskForm(null, null, null, null, renderDashboard));
  document.getElementById('dash-qa-task')?.addEventListener('click', () => openTaskForm(null, null, null, null, renderDashboard));
  document.getElementById('dash-qa-user')?.addEventListener('click', () => {
    Router.navigate('users');
    setTimeout(() => document.getElementById('new-user-btn')?.click(), 300);
  });

  // Today's priority task rows → open drawer
  document.querySelectorAll('.dash-task-row').forEach(row => row.addEventListener('click', e => {
    if (e.target.closest('.dash-quick-complete')) return;
    Router.navigate(`tasks?open=${row.dataset.tid}`);
  }));

  // Quick-complete on dashboard
  document.querySelectorAll('.dash-quick-complete').forEach(btn => btn.addEventListener('click', e => {
    e.stopPropagation();
    const tid = btn.dataset.tid;
    const tod = new Date().toISOString().split('T')[0];
    Store.update('tasks', tid, { status: 'Complete', completedDate: tod });
    Toast.success('Task marked complete');
    renderDashboard();
  }));
}

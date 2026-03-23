/**
 * EPIC Foundation CRM — Financials Page
 * Tracks Revenue, Receipts, and Reports.
 */

function renderFinancials(params = {}) {
  const main = document.getElementById('main');
  const fmt = n => (n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  
  let currentTab = params.tab || 'overview';
  let finSearch = '', finFilterType = '', finFilterStatus = '';
  let recSearch = '', recFilterCat = '', recFilterStatus = '';
  let repFilterScope = 'All', repFilterId = '';

  main.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <span class="page-title">Financial Command Center</span>
        <span class="page-subtitle">Track incoming revenue, outgoing receipts, events, and reports</span>
      </div>
      <div class="page-header-right" id="fin-header-actions"></div>
    </div>
    <div class="page-content" style="padding-top:0">
      <div class="sub-nav" style="border-bottom:var(--border-subtle);margin-bottom:var(--space-4);display:flex;gap:var(--space-4)">
        <button class="btn btn-ghost sub-tab-btn" data-tab="overview" style="border-radius:0">Overview Dashboard</button>
        <button class="btn btn-ghost sub-tab-btn" data-tab="revenue" style="border-radius:0">Revenue Log</button>
        <button class="btn btn-ghost sub-tab-btn" data-tab="receipts" style="border-radius:0">Receipts & Expenses</button>
        <button class="btn btn-ghost sub-tab-btn" data-tab="reports" style="border-radius:0">Report Builder</button>
      </div>
      <div id="fin-tab-content"></div>
    </div>
  `;

  main.querySelectorAll('.sub-tab-btn').forEach(btn => {
    if(btn.dataset.tab === currentTab) {
      btn.style.borderBottom = '2px solid var(--text-primary)';
      btn.classList.add('active');
    }
    btn.addEventListener('click', e => {
      currentTab = e.target.dataset.tab;
      renderFinancials({ tab: currentTab });
    });
  });

  const contentArea = document.getElementById('fin-tab-content');
  const actionArea  = document.getElementById('fin-header-actions');

  if (currentTab === 'overview') renderOverviewTab();
  else if (currentTab === 'revenue') renderRevenueTab();
  else if (currentTab === 'receipts') renderReceiptsTab();
  else if (currentTab === 'reports') renderReportsTab();

  // ── GLOBAL FINANCIALS HELPER (single source of truth) ─────────────────────
  function getGlobalFinancials() {
    const evts = Store.getAll('events');
    const revs = Store.getAll('financials');
    const recs = Store.getAll('receipts').filter(r => r.status !== 'Archived' && r.status !== 'Void');
    const aucts = Store.getAll('auctions');
    const opps  = Store.getAll('opportunities');
    const dons  = Store.getAll('donations');

    // Event revenue
    let eventTicketRev = 0, eventSponRev = 0, eventDeductions = 0;
    evts.forEach(e => {
      eventTicketRev  += (e.spotsRegistered || 0) * (e.entryFee || 0);
      eventSponRev    += e.sponsorshipRevenue || 0;
      eventDeductions += (e.discounts || 0) + (e.refunds || 0);
    });

    // Manual revenue log
    const manualRev = revs.reduce((s, r) => s + (parseFloat(r.actualRevenue) || 0), 0);

    // Auction sales — count sellPrice on any auction that has one (i.e. it closed and sold)
    const auctionRev = aucts.reduce((s, a) => s + (parseFloat(a.sellPrice) || 0), 0);

    // Special Opps sales
    const oppRev = opps.reduce((s, o) => s + (parseFloat(o.sellPrice) || 0), 0);

    // Cash donations only (not in-kind items that become auctions)
    const cashDonationRev = dons
      .filter(d => d.type === 'Cash' || d.type === 'Check' || d.type === 'Wire Transfer')
      .reduce((s, d) => s + (parseFloat(d.estimatedValue || d.value) || 0), 0);

    const grandActualRev = eventTicketRev + eventSponRev - eventDeductions + manualRev + auctionRev + oppRev + cashDonationRev;
    const totalExp = recs.reduce((s, r) => s + (parseFloat(r.totalAmount || r.amount) || 0), 0);
    const netProfit = grandActualRev - totalExp;
    const expenseRatio = grandActualRev > 0 ? ((totalExp / grandActualRev) * 100).toFixed(1) : 0;

    const remainOpportunity = evts.reduce((sum, e) => {
      const remains = Math.max(0, (e.capacity || 0) - (e.spotsRegistered || 0));
      return sum + remains * (e.entryFee || 0);
    }, 0);

    return { evts, revs, recs, aucts, opps, dons,
             eventTicketRev, eventSponRev, eventDeductions,
             manualRev, auctionRev, oppRev, cashDonationRev,
             grandActualRev, totalExp, netProfit, expenseRatio, remainOpportunity };
  }

  // ── OVERVIEW TAB (COMMAND CENTER) ──────────────────────────────────────────
  function renderOverviewTab() {
    actionArea.innerHTML = `
      <button class="btn btn-ghost btn-sm" id="fin-sources-btn" style="margin-right:8px">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        How are these calculated?
      </button>
      <button class="btn btn-secondary" onclick="Router.navigate('financials?tab=reports')">Generate Reports</button>
    `;

    const g = getGlobalFinancials();
    const { grandActualRev, totalExp, netProfit, expenseRatio, eventTicketRev, eventSponRev, eventDeductions,
            auctionRev, oppRev, cashDonationRev, manualRev, remainOpportunity, recs, evts, revs, aucts, opps, dons } = g;

    // Additional metrics
    const totalEstRev   = revs.reduce((s, r) => s + (parseFloat(r.estimatedRevenue) || 0), 0);
    const totalActRev   = revs.reduce((s, r) => s + (parseFloat(r.actualRevenue) || 0), 0);
    const totalFMV      = [...aucts, ...opps].reduce((s, r) => s + (parseFloat(r.fmv) || 0), 0);
    const totalSaleVal  = aucts.reduce((s, a) => s + (parseFloat(a.sellPrice) || 0), 0) +
                          opps.reduce((s, o)  => s + (parseFloat(o.sellPrice)  || 0), 0);
    const totalDonFMV   = dons.reduce((s, d) => s + (parseFloat(d.estimatedValue || d.value) || 0), 0);
    const allDonCash    = dons.filter(d => d.type === 'Cash' || d.type === 'Check' || d.type === 'Wire Transfer')
                              .reduce((s, d) => s + (parseFloat(d.estimatedValue || d.value) || 0), 0);
    const allDonInKind  = totalDonFMV - allDonCash;
    const uncollected   = totalEstRev - totalActRev;

    let activeEvents = evts.filter(e => e.status !== 'Completed' && e.status !== 'Cancelled').length;
    let compEvents   = evts.filter(e => e.status === 'Completed').length;
    let avgProfitEvt = (compEvents + activeEvents) > 0 ? (netProfit / (compEvents + activeEvents)) : 0;

    contentArea.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-4)">
        <div style="font-size:18px;font-weight:600">Global Financial Snapshot</div>
        <div style="font-size:12px;color:var(--text-muted)">Click any card to see the records behind it</div>
      </div>

      <!-- ROW 1: Core P&L -->
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);margin-bottom:var(--space-2)">Core P&L</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(210px, 1fr));gap:var(--space-3);margin-bottom:var(--space-5)">
        <div class="stat-card" onclick="showFinDrilldown('totalRev')" style="border:2px solid var(--status-green);background:var(--bg-body);cursor:pointer;transition:transform 0.15s,box-shadow 0.15s" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 20px rgba(0,0,0,0.2)'" onmouseout="this.style.transform='';this.style.boxShadow=''">
          <div class="stat-card-label">Total Realized Revenue</div>
          <div style="font-size:24px;color:var(--status-green);font-weight:700">${fmt(grandActualRev)}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px">All confirmed income combined ↗</div>
        </div>
        <div class="stat-card" onclick="showFinDrilldown('expenses')" style="border:2px solid var(--status-red);background:var(--bg-body);cursor:pointer;transition:transform 0.15s,box-shadow 0.15s" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 20px rgba(0,0,0,0.2)'" onmouseout="this.style.transform='';this.style.boxShadow=''">
          <div class="stat-card-label">Total Expenses YTD</div>
          <div style="font-size:24px;color:var(--status-red);font-weight:700">${fmt(totalExp)}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px">${recs.length} receipt records ↗</div>
        </div>
        <div class="stat-card" onclick="showFinDrilldown('netProfit')" style="border:2px solid var(--primary-color);background:var(--badge-blue-bg);cursor:pointer;transition:transform 0.15s,box-shadow 0.15s" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 20px rgba(0,0,0,0.2)'" onmouseout="this.style.transform='';this.style.boxShadow=''">
          <div class="stat-card-label" style="color:var(--primary-color)">Global Net Profit</div>
          <div style="font-size:24px;color:${netProfit<0?'var(--status-red)':'var(--primary-color)'};font-weight:700">${netProfit<0?'-':''}${fmt(Math.abs(netProfit))}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px">Revenue − Expenses ↗</div>
        </div>
        <div class="stat-card" onclick="showFinDrilldown('expenses')" style="cursor:pointer;transition:transform 0.15s,box-shadow 0.15s" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 20px rgba(0,0,0,0.2)'" onmouseout="this.style.transform='';this.style.boxShadow=''">
          <div class="stat-card-label">Expense Ratio</div>
          <div class="stat-card-value" style="color:${expenseRatio>80?'var(--status-red)':expenseRatio>50?'var(--status-amber)':'var(--status-green)'}">${expenseRatio}%</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px">Expenses as % of revenue ↗</div>
        </div>
      </div>

      <!-- ROW 2: Revenue Breakdown -->
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);margin-bottom:var(--space-2)">Revenue by Source</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(210px, 1fr));gap:var(--space-3);margin-bottom:var(--space-5)">
        <div class="stat-card" onclick="showFinDrilldown('ticketRev')" style="cursor:pointer;transition:transform 0.15s,box-shadow 0.15s" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 20px rgba(0,0,0,0.2)'" onmouseout="this.style.transform='';this.style.boxShadow=''">
          <div class="stat-card-label">Event Ticket Sales</div>
          <div class="stat-card-value" style="color:var(--status-green)">${fmt(eventTicketRev)}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px">${evts.reduce((s,e)=>s+(e.spotsRegistered||0),0)} tickets × entry fees ↗</div>
        </div>
        <div class="stat-card" onclick="showFinDrilldown('sponsorRev')" style="cursor:pointer;transition:transform 0.15s,box-shadow 0.15s" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 20px rgba(0,0,0,0.2)'" onmouseout="this.style.transform='';this.style.boxShadow=''">
          <div class="stat-card-label">Event Sponsorships</div>
          <div class="stat-card-value" style="color:var(--status-green)">${fmt(eventSponRev)}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px">Across ${evts.length} events ↗</div>
        </div>
        <div class="stat-card" onclick="showFinDrilldown('auctionRev')" style="cursor:pointer;transition:transform 0.15s,box-shadow 0.15s" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 20px rgba(0,0,0,0.2)'" onmouseout="this.style.transform='';this.style.boxShadow=''">
          <div class="stat-card-label">Auction Sales</div>
          <div class="stat-card-value" style="color:var(--status-green)">${fmt(auctionRev)}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px">${aucts.filter(a=>a.sellPrice).length} of ${aucts.length} items sold ↗</div>
        </div>
        <div class="stat-card" onclick="showFinDrilldown('oppRev')" style="cursor:pointer;transition:transform 0.15s,box-shadow 0.15s" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 20px rgba(0,0,0,0.2)'" onmouseout="this.style.transform='';this.style.boxShadow=''">
          <div class="stat-card-label">Special Opp Revenue</div>
          <div class="stat-card-value" style="color:var(--status-green)">${fmt(oppRev)}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px">${opps.filter(o=>o.sellPrice).length} closed opps ↗</div>
        </div>
        <div class="stat-card" onclick="showFinDrilldown('cashDon')" style="cursor:pointer;transition:transform 0.15s,box-shadow 0.15s" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 20px rgba(0,0,0,0.2)'" onmouseout="this.style.transform='';this.style.boxShadow=''">
          <div class="stat-card-label">Cash Donations</div>
          <div class="stat-card-value" style="color:var(--status-green)">${fmt(cashDonationRev)}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px">Cash / Check / Wire only ↗</div>
        </div>
        <div class="stat-card" onclick="showFinDrilldown('revLogConf')" style="cursor:pointer;transition:transform 0.15s,box-shadow 0.15s" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 20px rgba(0,0,0,0.2)'" onmouseout="this.style.transform='';this.style.boxShadow=''">
          <div class="stat-card-label">Revenue Log (Confirmed)</div>
          <div class="stat-card-value" style="color:var(--status-green)">${fmt(totalActRev)}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px">vs ${fmt(totalEstRev)} estimated ↗</div>
        </div>
        <div class="stat-card" onclick="showFinDrilldown('uncollected')" style="border:1px dashed var(--status-amber);cursor:pointer;transition:transform 0.15s,box-shadow 0.15s" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 20px rgba(0,0,0,0.2)'" onmouseout="this.style.transform='';this.style.boxShadow=''">
          <div class="stat-card-label" style="color:var(--status-amber)">Uncollected (Estimated)</div>
          <div class="stat-card-value" style="color:var(--status-amber)">${fmt(uncollected)}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px">Projected but not yet received ↗</div>
        </div>
        <div class="stat-card" onclick="showFinDrilldown('deductions')" style="border:1px dashed var(--border-color);cursor:pointer;transition:transform 0.15s,box-shadow 0.15s" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 20px rgba(0,0,0,0.2)'" onmouseout="this.style.transform='';this.style.boxShadow=''">
          <div class="stat-card-label">Event Discounts & Refunds</div>
          <div class="stat-card-value" style="color:var(--status-red)">-${fmt(eventDeductions)}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px">Deducted from event revenue ↗</div>
        </div>
      </div>

      <!-- ROW 3: Asset & Pipeline -->
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);margin-bottom:var(--space-2)">Assets & Pipeline</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(210px, 1fr));gap:var(--space-3);margin-bottom:var(--space-5)">
        <div class="stat-card" onclick="showFinDrilldown('fmv')" style="cursor:pointer;transition:transform 0.15s,box-shadow 0.15s" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 20px rgba(0,0,0,0.2)'" onmouseout="this.style.transform='';this.style.boxShadow=''">
          <div class="stat-card-label">Total FMV Tracked</div>
          <div class="stat-card-value" style="color:var(--text-primary)">${fmt(totalFMV)}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px">Fair Market Value of auctions + opps ↗</div>
        </div>
        <div class="stat-card" onclick="showFinDrilldown('saleVal')" style="cursor:pointer;transition:transform 0.15s,box-shadow 0.15s" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 20px rgba(0,0,0,0.2)'" onmouseout="this.style.transform='';this.style.boxShadow=''">
          <div class="stat-card-label">Total Sale Value Closed</div>
          <div class="stat-card-value" style="color:var(--text-primary)">${fmt(totalSaleVal)}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px">Auction + opp sell prices combined ↗</div>
        </div>
        <div class="stat-card" onclick="showFinDrilldown('inKind')" style="cursor:pointer;transition:transform 0.15s,box-shadow 0.15s" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 20px rgba(0,0,0,0.2)'" onmouseout="this.style.transform='';this.style.boxShadow=''">
          <div class="stat-card-label">In-Kind Donations (FMV)</div>
          <div class="stat-card-value" style="color:var(--text-primary)">${fmt(allDonInKind)}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px">Non-cash donated items ↗</div>
        </div>
        <div class="stat-card" onclick="showFinDrilldown('pipeline')" style="cursor:pointer;transition:transform 0.15s,box-shadow 0.15s" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 20px rgba(0,0,0,0.2)'" onmouseout="this.style.transform='';this.style.boxShadow=''">
          <div class="stat-card-label">Remaining Pipeline Opp.</div>
          <div class="stat-card-value" style="color:var(--text-primary)">${fmt(remainOpportunity)}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px">Unsold event ticket capacity ↗</div>
        </div>
        <div class="stat-card" onclick="showFinDrilldown('ticketRev')" style="cursor:pointer;transition:transform 0.15s,box-shadow 0.15s" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 20px rgba(0,0,0,0.2)'" onmouseout="this.style.transform='';this.style.boxShadow=''">
          <div class="stat-card-label">Avg Profit per Event</div>
          <div class="stat-card-value" style="color:var(--text-primary)">${fmt(avgProfitEvt)}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px">Net profit ÷ total events ↗</div>
        </div>
        <div class="stat-card" onclick="showFinDrilldown('pipeline')" style="cursor:pointer;transition:transform 0.15s,box-shadow 0.15s" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 20px rgba(0,0,0,0.2)'" onmouseout="this.style.transform='';this.style.boxShadow=''">
          <div class="stat-card-label">Active Events</div>
          <div class="stat-card-value" style="color:var(--text-primary)">${activeEvents}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px">${compEvents} completed ↗</div>
        </div>
      </div>

      <!-- Revenue Composition + Expense Categories -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-5)">
        <div class="panel">
          <div style="font-size:15px;font-weight:600;margin-bottom:var(--space-3);padding-bottom:var(--space-2);border-bottom:1px solid var(--border-color)">Revenue Composition</div>
          <div style="display:flex;justify-content:space-between;padding:8px 0"><span>Event Ticket Sales</span><span style="font-weight:600;color:var(--status-green)">${fmt(eventTicketRev)}</span></div>
          <div style="display:flex;justify-content:space-between;padding:8px 0"><span>Event Sponsorships</span><span style="font-weight:600;color:var(--status-green)">${fmt(eventSponRev)}</span></div>
          ${auctionRev > 0 ? `<div style="display:flex;justify-content:space-between;padding:8px 0"><span>Auction Sales</span><span style="font-weight:600;color:var(--status-green)">${fmt(auctionRev)}</span></div>` : ''}
          ${oppRev > 0 ? `<div style="display:flex;justify-content:space-between;padding:8px 0"><span>Special Opp Revenue</span><span style="font-weight:600;color:var(--status-green)">${fmt(oppRev)}</span></div>` : ''}
          ${cashDonationRev > 0 ? `<div style="display:flex;justify-content:space-between;padding:8px 0"><span>Cash Donations</span><span style="font-weight:600;color:var(--status-green)">${fmt(cashDonationRev)}</span></div>` : ''}
          <div style="display:flex;justify-content:space-between;padding:8px 0"><span>Revenue Log (Confirmed)</span><span style="font-weight:600;color:var(--status-green)">${fmt(totalActRev)}</span></div>
          <div style="display:flex;justify-content:space-between;padding:8px 0"><span>Event Discounts/Refunds</span><span style="font-weight:600;color:var(--status-red)">-${fmt(eventDeductions)}</span></div>
          <div style="display:flex;justify-content:space-between;padding:12px 0 0;margin-top:4px;border-top:1px solid var(--border-color);font-weight:bold;color:var(--status-green)"><span>Total Captured Revenue</span><span>${fmt(grandActualRev)}</span></div>
        </div>
        <div class="panel">
          <div style="font-size:15px;font-weight:600;margin-bottom:var(--space-3);padding-bottom:var(--space-2);border-bottom:1px solid var(--border-color)">Top Expense Categories</div>
          ${Object.entries(
              recs.reduce((acc, r) => { acc[r.category||'Uncategorized'] = (acc[r.category||'Uncategorized']||0) + (parseFloat(r.totalAmount||r.amount)||0); return acc; }, {})
          ).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([cat, amt]) => `
              <div style="display:flex;justify-content:space-between;padding:8px 0"><span>${cat}</span><span style="font-weight:600;color:var(--status-red)">${fmt(amt)}</span></div>
          `).join('') || '<div style="color:var(--text-muted);font-size:13px">No expenses logged yet</div>'}
          ${totalExp > 0 ? `<div style="display:flex;justify-content:space-between;padding:12px 0 0;margin-top:4px;border-top:1px solid var(--border-color);font-weight:bold;color:var(--status-red)"><span>Total Expenses</span><span>${fmt(totalExp)}</span></div>` : ''}
        </div>
      </div>
    `;

    // Wire the sources modal button
    document.getElementById('fin-sources-btn').onclick = () => showSourcesModal(g, totalFMV, totalSaleVal, totalEstRev, totalActRev, uncollected, allDonInKind, allDonCash);
  }

  function showSourcesModal(g, totalFMV, totalSaleVal, totalEstRev, totalActRev, uncollected, allDonInKind, allDonCash) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
    overlay.innerHTML = `
      <div style="background:var(--bg-surface);border-radius:var(--radius-lg);border:var(--border-subtle);max-width:680px;width:100%;max-height:88vh;overflow-y:auto;box-shadow:0 24px 80px rgba(0,0,0,0.5)">
        <div style="padding:var(--space-5) var(--space-6);border-bottom:var(--border-subtle);display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;background:var(--bg-surface);z-index:1">
          <div style="font-size:17px;font-weight:700">How Every Number is Calculated</div>
          <button id="src-close" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:22px;line-height:1">×</button>
        </div>
        <div style="padding:var(--space-5) var(--space-6)">

          <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);margin-bottom:var(--space-3)">✅ Confirmed Revenue Sources</div>
          ${srcRow('Total Realized Revenue', fmt(g.grandActualRev), 'Event Ticket Sales + Event Sponsorships − Discounts/Refunds + Auction sellPrice + Opp sellPrice + Cash Donations + Revenue Log (Confirmed actual revenue)',true)}
          ${srcRow('Event Ticket Sales', fmt(g.eventTicketRev), 'Each Event: (spotsRegistered × entryFee). Pulled from every event record.')}
          ${srcRow('Event Sponsorships', fmt(g.eventSponRev), 'Sum of sponsorshipRevenue field on every event record.')}
          ${srcRow('Auction Sales', fmt(g.auctionRev), 'Sum of sellPrice on all auction records that have a sell price entered. Enter a sellPrice on an auction when it closes.')}
          ${srcRow('Special Opp Revenue', fmt(g.oppRev), 'Sum of sellPrice on all Special Opp records.')}
          ${srcRow('Cash Donations', fmt(g.cashDonationRev), 'Sum of estimatedValue on Donation records where Type = Cash, Check, or Wire Transfer.')}
          ${srcRow('Revenue Log (Confirmed)', fmt(totalActRev), 'Sum of actualRevenue on all Revenue Log entries (the "Revenue Log" tab). These are manually entered confirmed revenue records.')}
          ${srcRow('Event Discounts & Refunds', '-'+fmt(g.eventDeductions), 'Subtracted: sum of discounts + refunds fields on all event records.')}

          <div style="height:1px;background:var(--border-color);margin:var(--space-4) 0"></div>
          <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);margin-bottom:var(--space-3)">⏳ Projected / Not Yet Received</div>
          ${srcRow('Revenue Log (Estimated)', fmt(totalEstRev), 'Sum of estimatedRevenue on ALL Revenue Log entries, regardless of whether they are confirmed. This is your projected/pipeline revenue from the Revenue Log tab.')}
          ${srcRow('Uncollected Gap', fmt(uncollected), 'Estimated Revenue − Confirmed Revenue from the Revenue Log. This is money expected but not yet marked as received.')}
          ${srcRow('Remaining Event Pipeline', fmt(g.remainOpportunity), 'For each event: (capacity − spotsRegistered) × entryFee. Revenue you would earn if events sold out.')}

          <div style="height:1px;background:var(--border-color);margin:var(--space-4) 0"></div>
          <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);margin-bottom:var(--space-3)">📦 Asset Tracking (Not Counted as Revenue)</div>
          ${srcRow('Total FMV Tracked', fmt(totalFMV), 'Sum of fmv (Fair Market Value) across all Auction and Special Opp records. This is the appraised value of assets, not actual sale revenue.')}
          ${srcRow('Total Sale Value Closed', fmt(totalSaleVal), 'Sum of sellPrice across all Auction + Special Opp records that have been sold. Same as Auction Sales + Opp Revenue combined.')}
          ${srcRow('In-Kind Donations (FMV)', fmt(allDonInKind), 'Estimated value of donations that are NOT cash/check/wire — things like rounds of golf, experiences, items donated in kind.')}
          ${srcRow('Cash Donations', fmt(allDonCash), 'Cash/Check/Wire Transfer donations — these ARE counted in Total Realized Revenue.')}

          <div style="height:1px;background:var(--border-color);margin:var(--space-4) 0"></div>
          <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);margin-bottom:var(--space-3)">💸 Expenses</div>
          ${srcRow('Total Expenses YTD', fmt(g.totalExp), 'Sum of totalAmount (or amount) across all Receipt records that are not Archived or Void. Logged on the Receipts & Expenses tab.')}
          ${srcRow('Net Profit', fmt(g.netProfit), 'Total Realized Revenue − Total Expenses YTD.')}
          ${srcRow('Expense Ratio', g.expenseRatio+'%', 'Total Expenses ÷ Total Realized Revenue × 100. Below 50% is healthy.')}
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('#src-close').onclick = () => overlay.remove();
    overlay.onclick = e => { if(e.target === overlay) overlay.remove(); };
  }

  function srcRow(label, value, explanation, highlight = false) {
    return `
      <div style="padding:10px 0;border-bottom:1px solid var(--border-color);${highlight?'background:var(--badge-blue-bg);margin:0 -8px;padding:10px 8px;border-radius:6px;':''}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">
          <span style="font-weight:600;font-size:14px;color:var(--text-primary)">${label}</span>
          <span style="font-weight:700;font-size:14px;color:${highlight?'var(--primary-color)':'var(--status-green)'};white-space:nowrap;margin-left:12px">${value}</span>
        </div>
        <div style="font-size:12px;color:var(--text-muted);line-height:1.5">${explanation}</div>
      </div>
    `;
  }

  // ── DRILLDOWN MODAL — shows exact records behind each metric ───────────────
  window.showFinDrilldown = function(key) {
    const g = getGlobalFinancials();
    const { evts, revs, recs, aucts, opps, dons } = g;
    let title = '', total = 0, rows = [];

    const dr = (cols, vals, amount, sub='') => ({ cols, vals, amount, sub });

    switch(key) {
      case 'totalRev':
        title = 'Total Realized Revenue — All Sources';
        rows = [
          ...evts.map(e => dr(['Event','Tickets','Fee/ea','Sponsorship','Discounts'],
            [e.name||e.id, e.spotsRegistered||0, fmt(e.entryFee||0), fmt(e.sponsorshipRevenue||0), '-'+fmt((e.discounts||0)+(e.refunds||0))],
            ((e.spotsRegistered||0)*(e.entryFee||0))+(e.sponsorshipRevenue||0)-((e.discounts||0)+(e.refunds||0)), 'event')),
          ...aucts.filter(a=>a.sellPrice).map(a => dr(['Auction Item','Buyer','FMV','Sell Price'],
            [a.title||a.shortName||a.id, a.buyerName||'—', fmt(a.fmv||0), fmt(a.sellPrice)], parseFloat(a.sellPrice), 'auction')),
          ...opps.filter(o=>o.sellPrice).map(o => dr(['Special Opp','Status','FMV','Sell Price'],
            [o.name||o.id, o.status||'—', fmt(o.fmv||0), fmt(o.sellPrice)], parseFloat(o.sellPrice), 'opp')),
          ...dons.filter(d=>d.type==='Cash'||d.type==='Check'||d.type==='Wire Transfer').map(d => dr(['Donation','Type','Donor','Amount'],
            [d.description||d.title||d.id, d.type, d.donorName||'—', fmt(d.estimatedValue||d.value||0)], parseFloat(d.estimatedValue||d.value||0), 'donation')),
          ...revs.map(r => dr(['Rev Log Entry','Type','Date','Confirmed'],
            [r.description||r.id, r.recordType||'—', r.dateRecorded||'—', fmt(r.actualRevenue||0)], parseFloat(r.actualRevenue||0), 'rev')),
        ];
        total = g.grandActualRev;
        break;
      case 'expenses':
        title = 'Total Expenses YTD — All Receipts';
        rows = recs.map(r => dr(['Receipt','Vendor','Category','Date','Status'],
          [r.title||r.id, r.vendor||'—', r.category||'—', r.date||'—', r.status||'—'],
          parseFloat(r.totalAmount||r.amount||0), 'receipt'));
        total = g.totalExp;
        break;
      case 'netProfit':
        title = 'Net Profit Breakdown';
        rows = [
          dr(['','','','Total'],['✅ Total Realized Revenue','','', fmt(g.grandActualRev)], g.grandActualRev, 'summary'),
          dr(['','','','Total'],['💸 Total Expenses (deducted)','','','-'+fmt(g.totalExp)], -g.totalExp, 'summary'),
          dr(['','','','Net'],['📊 Net Profit','','', fmt(g.netProfit)], g.netProfit, 'total'),
        ];
        total = g.netProfit;
        break;
      case 'ticketRev':
        title = 'Event Ticket Sales — Per Event';
        rows = evts.map(e => dr(['Event Name','Spots Sold','Capacity','Entry Fee','Ticket Revenue'],
          [e.name||e.id, e.spotsRegistered||0, e.capacity||'—', fmt(e.entryFee||0), fmt((e.spotsRegistered||0)*(e.entryFee||0))],
          (e.spotsRegistered||0)*(e.entryFee||0), 'event'));
        total = g.eventTicketRev;
        break;
      case 'sponsorRev':
        title = 'Event Sponsorship Revenue — Per Event';
        rows = evts.map(e => dr(['Event Name','Status','Sponsorship Revenue'],
          [e.name||e.id, e.status||'—', fmt(e.sponsorshipRevenue||0)],
          e.sponsorshipRevenue||0, 'event'));
        total = g.eventSponRev;
        break;
      case 'auctionRev':
        title = 'Auction Sales — Closed Items';
        rows = aucts.filter(a=>a.sellPrice).map(a => dr(['Item','Type','FMV','Reserve','Sell Price','vs FMV'],
          [a.title||a.shortName||a.id, a.type||'—', fmt(a.fmv||0), fmt(a.reservePrice||0), fmt(a.sellPrice), ((parseFloat(a.sellPrice)/parseFloat(a.fmv||1))*100).toFixed(0)+'%'],
          parseFloat(a.sellPrice), 'auction'));
        total = g.auctionRev;
        break;
      case 'oppRev':
        title = 'Special Opp Revenue — Closed';
        rows = opps.filter(o=>o.sellPrice).map(o => dr(['Opp Name','Status','FMV','Sell Price'],
          [o.name||o.id, o.status||'—', fmt(o.fmv||0), fmt(o.sellPrice)],
          parseFloat(o.sellPrice), 'opp'));
        total = g.oppRev;
        break;
      case 'cashDon':
        title = 'Cash / Check / Wire Donations';
        rows = dons.filter(d=>d.type==='Cash'||d.type==='Check'||d.type==='Wire Transfer').map(d => dr(['Description','Type','Donor','Date','Amount'],
          [d.description||d.title||d.id, d.type||'—', d.donorName||'—', d.dateDonated||'—', fmt(d.estimatedValue||d.value||0)],
          parseFloat(d.estimatedValue||d.value||0), 'donation'));
        total = g.cashDonationRev;
        break;
      case 'revLogConf':
        { const confirmed = revs.filter(r=>parseFloat(r.actualRevenue)>0);
          title = 'Revenue Log — Confirmed Entries';
          rows = confirmed.map(r => dr(['Description','Type','Linked To','Date','Confirmed Revenue'],
            [r.description||r.id, r.recordType||'—', r.linkedEventId||r.linkedAuctionId||'—', r.dateRecorded||'—', fmt(r.actualRevenue||0)],
            parseFloat(r.actualRevenue||0), 'rev'));
          total = revs.reduce((s,r)=>s+(parseFloat(r.actualRevenue)||0),0);
        } break;
      case 'revLogEst':
        title = 'Revenue Log — Estimated (All Entries)';
        rows = revs.map(r => dr(['Description','Type','Est. Revenue','Actual Revenue','Gap'],
          [r.description||r.id, r.recordType||'—', fmt(r.estimatedRevenue||0), fmt(r.actualRevenue||0), fmt((parseFloat(r.estimatedRevenue||0))-(parseFloat(r.actualRevenue||0)))],
          parseFloat(r.estimatedRevenue||0), 'rev'));
        total = revs.reduce((s,r)=>s+(parseFloat(r.estimatedRevenue)||0),0);
        break;
      case 'uncollected':
        title = 'Uncollected Revenue — Expected but Not Received';
        rows = revs.filter(r=>(parseFloat(r.estimatedRevenue)||0)>(parseFloat(r.actualRevenue)||0)).map(r => dr(['Description','Estimated','Confirmed','Gap'],
          [r.description||r.id, fmt(r.estimatedRevenue||0), fmt(r.actualRevenue||0), fmt((parseFloat(r.estimatedRevenue||0))-(parseFloat(r.actualRevenue||0)))],
          (parseFloat(r.estimatedRevenue||0))-(parseFloat(r.actualRevenue||0)), 'rev'));
        total = revs.reduce((s,r)=>s+(parseFloat(r.estimatedRevenue||0))-(parseFloat(r.actualRevenue||0)),0);
        break;
      case 'deductions':
        title = 'Event Discounts & Refunds';
        rows = evts.filter(e=>(e.discounts||0)+(e.refunds||0)>0).map(e => dr(['Event','Discounts','Refunds','Total Deducted'],
          [e.name||e.id, fmt(e.discounts||0), fmt(e.refunds||0), fmt((e.discounts||0)+(e.refunds||0))],
          (e.discounts||0)+(e.refunds||0), 'event'));
        total = g.eventDeductions;
        break;
      case 'fmv':
        title = 'Total FMV — Auctions + Special Opps';
        rows = [
          ...aucts.map(a => dr(['Auction Item','Type','FMV','Sell Price','Status'],
            [a.title||a.shortName||a.id, a.type||'—', fmt(a.fmv||0), a.sellPrice?fmt(a.sellPrice):'Not sold', a.status||'—'],
            parseFloat(a.fmv||0), 'auction')),
          ...opps.map(o => dr(['Special Opp','Status','FMV','Sell Price'],
            [o.name||o.id, o.status||'—', fmt(o.fmv||0), o.sellPrice?fmt(o.sellPrice):'Not sold'],
            parseFloat(o.fmv||0), 'opp')),
        ];
        total = [...aucts,...opps].reduce((s,r)=>s+(parseFloat(r.fmv)||0),0);
        break;
      case 'saleVal':
        title = 'Total Sale Value Closed — Auctions + Opps';
        rows = [
          ...aucts.filter(a=>a.sellPrice).map(a => dr(['Auction Item','FMV','Sell Price','% of FMV'],
            [a.title||a.shortName||a.id, fmt(a.fmv||0), fmt(a.sellPrice), ((parseFloat(a.sellPrice)/parseFloat(a.fmv||1))*100).toFixed(0)+'%'],
            parseFloat(a.sellPrice), 'auction')),
          ...opps.filter(o=>o.sellPrice).map(o => dr(['Special Opp','FMV','Sell Price'],
            [o.name||o.id, fmt(o.fmv||0), fmt(o.sellPrice)],
            parseFloat(o.sellPrice), 'opp')),
        ];
        total = g.auctionRev + g.oppRev;
        break;
      case 'inKind':
        title = 'In-Kind Donations (Non-Cash FMV)';
        rows = dons.filter(d=>d.type!=='Cash'&&d.type!=='Check'&&d.type!=='Wire Transfer').map(d => dr(['Description','Type','Donor','Assigned To','Est. Value'],
          [d.description||d.title||d.id, d.type||'—', d.donorName||'—', d.assignedToRecord||'Unassigned', fmt(d.estimatedValue||d.value||0)],
          parseFloat(d.estimatedValue||d.value||0), 'donation'));
        total = dons.filter(d=>d.type!=='Cash'&&d.type!=='Check'&&d.type!=='Wire Transfer').reduce((s,d)=>s+(parseFloat(d.estimatedValue||d.value)||0),0);
        break;
      case 'pipeline':
        title = 'Remaining Pipeline — Unsold Event Capacity';
        rows = evts.map(e => {
          const rem = Math.max(0,(e.capacity||0)-(e.spotsRegistered||0));
          return dr(['Event','Capacity','Sold','Remaining','Entry Fee','Pipeline Value'],
            [e.name||e.id, e.capacity||0, e.spotsRegistered||0, rem, fmt(e.entryFee||0), fmt(rem*(e.entryFee||0))],
            rem*(e.entryFee||0), 'event');
        });
        total = g.remainOpportunity;
        break;
      default:
        return;
    }

    const typeColors = { auction:'badge-amber', opp:'badge-amber', donation:'badge-green', event:'badge-blue', rev:'badge-blue', receipt:'badge-gray', summary:'badge-gray', total:'badge-blue' };
    const typeLabels = { auction:'Auction', opp:'Special Opp', donation:'Donation', event:'Event', rev:'Revenue Log', receipt:'Receipt', summary:'', total:'' };

    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.72);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
    overlay.innerHTML = `
      <div style="background:var(--bg-surface);border-radius:var(--radius-lg);border:var(--border-subtle);max-width:820px;width:100%;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 24px 80px rgba(0,0,0,0.5)">
        <div style="padding:20px 24px;border-bottom:var(--border-subtle);display:flex;justify-content:space-between;align-items:center;flex-shrink:0">
          <div>
            <div style="font-size:16px;font-weight:700">${title}</div>
            <div style="font-size:13px;color:var(--text-muted);margin-top:3px">Total: <span style="color:${total<0?'var(--status-red)':'var(--status-green)'};font-weight:700">${total<0?'-':''}${fmt(Math.abs(total))}</span> from ${rows.length} record${rows.length!==1?'s':''}</div>
          </div>
          <button id="dd-close" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:24px;line-height:1">×</button>
        </div>
        <div style="overflow-y:auto;flex:1">
          ${rows.length === 0 ? `<div style="padding:40px;text-align:center;color:var(--text-muted);font-size:14px">No records found for this metric yet.</div>` : `
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead>
              <tr style="border-bottom:1px solid var(--border-color);background:var(--bg-body)">
                <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted)">Type</th>
                ${rows[0].cols.map(c=>`<th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted)">${c}</th>`).join('')}
                <th style="padding:10px 16px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted)">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map((r,i)=>`
                <tr style="border-bottom:1px solid var(--border-color);${i%2===0?'background:var(--bg-body)':''}">
                  <td style="padding:10px 16px"><span class="badge ${typeColors[r.sub]||'badge-gray'}" style="font-size:10px">${typeLabels[r.sub]||r.sub}</span></td>
                  ${r.vals.map(v=>`<td style="padding:10px 12px;color:var(--text-primary)">${v}</td>`).join('')}
                  <td style="padding:10px 16px;text-align:right;font-weight:600;color:${r.amount<0?'var(--status-red)':'var(--status-green)'}">${r.amount<0?'-':''}${fmt(Math.abs(r.amount))}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr style="border-top:2px solid var(--border-color);background:var(--bg-body)">
                <td colspan="${rows[0].cols.length+1}" style="padding:12px 16px;font-weight:700;font-size:14px">Total</td>
                <td style="padding:12px 16px;text-align:right;font-weight:700;font-size:15px;color:${total<0?'var(--status-red)':'var(--status-green)'}">${total<0?'-':''}${fmt(Math.abs(total))}</td>
              </tr>
            </tfoot>
          </table>`}
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('#dd-close').onclick = () => overlay.remove();
    overlay.onclick = e => { if(e.target===overlay) overlay.remove(); };
  };

  // ── REVENUE TAB ────────────────────────────────────────────────────────────
  function renderRevenueTab() {
    actionArea.innerHTML = `
      <button class="btn btn-ghost btn-sm" id="export-fin-btn">${Icons.download} Export</button>
      <button class="btn btn-primary" id="new-fin-btn">${Icons.plus} Log Revenue</button>
    `;
    contentArea.innerHTML = `
      <div id="fin-summary-bar" style="display:grid;grid-template-columns:repeat(4,1fr);gap:var(--space-4);margin-bottom:var(--space-5)"></div>
      <div id="fin-table-wrap"></div>
    `;

    function buildTable() {
      const wrap = document.getElementById('fin-table-wrap'); if (!wrap) return;
      let rows = Store.getAll('financials');
      if (finSearch) rows = rows.filter(f => `${f.id} ${f.description||''}`.toLowerCase().includes(finSearch.toLowerCase()));
      if (finFilterType) rows = rows.filter(f => f.recordType === finFilterType);
      if (finFilterStatus) rows = rows.filter(f => f.revenueStatus === finFilterStatus);
      rows = [...rows].sort((a,b) => (b.dateRecorded||b.createdAt||'') < (a.dateRecorded||a.createdAt||'') ? -1 : 1);

      wrap.innerHTML = `
        <div class="table-toolbar">
          <input type="text" class="input" id="fin-search" placeholder="Search..." value="${finSearch}" style="width:200px">
          <select class="select" id="fin-filter-type"><option value="">All Types</option>${Store.FINANCIAL_RECORD_TYPES.map(t=>`<option ${finFilterType===t?'selected':''}>${t}</option>`).join('')}</select>
          <select class="select" id="fin-filter-status"><option value="">All Statuses</option>${Store.STATUS.financials.map(t=>`<option ${finFilterStatus===t?'selected':''}>${t}</option>`).join('')}</select>
        </div>
        <div class="table-container"><table class="crm-table"><thead><tr>
          <th>ID</th><th>Description</th><th>Type</th><th>Linked To</th><th>Est. Rev</th><th>Actual Rev</th><th>Status</th><th>Date</th>
        </tr></thead><tbody>
          ${rows.map(row => {
            const tc = { Auction:'badge-amber', Donation:'badge-green', Event:'badge-blue' }[row.recordType]||'badge-gray';
            return `<tr class="table-row" data-id="${row.id}">
              <td>${row.id}</td>
              <td style="font-weight:600">${row.description||'—'}</td>
              <td><span class="badge ${tc}">${row.recordType||'—'}</span></td>
              <td>${getLinksHtml(row)}</td>
              <td>${fmt(row.estimatedRevenue)}</td>
              <td style="color:var(--status-green);font-weight:600">${fmt(row.actualRevenue)}</td>
              <td>${StatusBadge.render(row.revenueStatus||'Estimated')}</td>
              <td>${row.dateRecorded||'—'}</td>
            </tr>`;
          }).join('')}
        </tbody></table></div>
      `;
      wrap.querySelector('#fin-search')?.addEventListener('input', e=>{finSearch=e.target.value;buildTable();});
      wrap.querySelector('#fin-filter-type')?.addEventListener('change', e=>{finFilterType=e.target.value;buildTable();});
      wrap.querySelector('#fin-filter-status')?.addEventListener('change', e=>{finFilterStatus=e.target.value;buildTable();});
      wrap.querySelectorAll('.table-row').forEach(tr => tr.addEventListener('click', () => openFinDrawer(tr.dataset.id, () => renderFinancials({tab:'revenue'}))));
    }

    function refreshSummary() {
      const all = Store.getAll('financials');
      document.getElementById('fin-summary-bar').innerHTML = [
        { l:'FMV', v:fmt(all.reduce((s,f)=>s+(f.fmv||0),0)), c:'var(--text-primary)' },
        { l:'Sale Value', v:fmt(all.reduce((s,f)=>s+(f.salePrice||0),0)), c:'var(--status-green)' },
        { l:'Est Rev', v:fmt(all.reduce((s,f)=>s+(f.estimatedRevenue||0),0)), c:'var(--status-amber)' },
        { l:'Actual Rev', v:fmt(all.filter(f=>['Recorded','Complete'].includes(f.revenueStatus)).reduce((s,f)=>s+(f.actualRevenue||0),0)), c:'var(--status-green)' },
      ].map(s => `<div class="stat-card"><div class="stat-card-label">${s.l}</div><div class="stat-card-value" style="color:${s.c}">${s.v}</div></div>`).join('');
    }
    refreshSummary(); buildTable();
    document.getElementById('new-fin-btn').onclick = () => openFinForm(null, () => renderFinancials({tab:'revenue'}));
    document.getElementById('export-fin-btn').onclick = () => Store.downloadCSV('financials','revenue.csv');
  }

  // ── RECEIPTS TAB ───────────────────────────────────────────────────────────
  function renderReceiptsTab() {
    actionArea.innerHTML = `
      <button class="btn btn-ghost btn-sm" id="export-rec-btn">${Icons.download} Export All</button>
      <button class="btn btn-primary" id="new-rec-btn">${Icons.plus} Log Receipt</button>
    `;
    contentArea.innerHTML = `
      <div id="rec-summary-bar" style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-4);margin-bottom:var(--space-5)"></div>
      <div id="rec-bulk-bar" style="display:none;gap:var(--space-3);margin-bottom:var(--space-4);padding:var(--space-3);background:var(--bg-elevated);border-radius:var(--radius-md);border:1px solid var(--border-color);align-items:center">
        <span style="font-weight:600;font-size:14px;color:var(--primary-color)" id="rec-bulk-count">0 Selected</span>
        <div style="width:1px;height:20px;background:var(--border-color);margin:0 var(--space-2)"></div>
        <button class="btn btn-sm btn-ghost" id="bulk-app">Mark Approved</button>
        <button class="btn btn-sm btn-ghost" id="bulk-arch">Archive</button>
        <button class="btn btn-sm btn-ghost" id="bulk-exp">Export Selected</button>
      </div>
      <div id="rec-table-wrap"></div>
    `;

    function buildTable() {
      const wrap = document.getElementById('rec-table-wrap'); if (!wrap) return;
      let rows = Store.getAll('receipts');
      
      if (recSearch) rows = rows.filter(f => `${f.title||''} ${f.vendor||''}`.toLowerCase().includes(recSearch.toLowerCase()));
      if (recFilterCat) rows = rows.filter(f => f.category === recFilterCat);
      if (recFilterStatus) rows = rows.filter(f => f.status === recFilterStatus);
      
      rows = [...rows].sort((a,b) => (b.date||b.createdAt||'') < (a.date||a.createdAt||'') ? -1 : 1);

      wrap.innerHTML = `
        <div class="table-toolbar" style="margin-top:0">
          <input type="text" class="input" id="rec-search" placeholder="Search title or vendor..." value="${recSearch}" style="width:200px">
          <select class="select" id="rec-filter-cat"><option value="">All Categories</option>${Store.RECEIPT_CATEGORIES.map(t=>`<option ${recFilterCat===t?'selected':''}>${t}</option>`).join('')}</select>
          <select class="select" id="rec-filter-status"><option value="">All Statuses</option>${Store.STATUS.receipts.map(t=>`<option ${recFilterStatus===t?'selected':''}>${t}</option>`).join('')}</select>
        </div>
        <div class="table-container"><table class="crm-table"><thead><tr>
          <th style="width:40px"><input type="checkbox" id="rec-all-chk"></th>
          <th>Date</th><th>Title / Vendor</th><th>Category</th><th>Total Amount</th><th>Linked To</th><th>Files</th><th>Status</th>
        </tr></thead><tbody>
          ${rows.map(row => {
            const files = [];
            if(row.fileUrl) files.push('<span class="tag badge-blue" style="font-size:10px">Cloud</span>');
            if(row.internalFile) files.push('<span class="tag badge-purple" style="font-size:10px">File</span>');
            const miss = (!row.title || !row.totalAmount || !row.vendor) ? '<span title="Missing fields" style="color:var(--status-red)">⚠️</span> ' : '';
            return `<tr class="table-row rec-row" data-id="${row.id}">
              <td onclick="event.stopPropagation()"><input type="checkbox" class="rec-chk" value="${row.id}"></td>
              <td>${row.date||'—'}</td>
              <td><div style="font-weight:600">${miss}${row.title||'—'}</div><div style="font-size:11px;color:var(--text-muted)">${row.vendor||'—'}</div></td>
              <td>${row.category?`<span class="tag">${row.category}</span>`:'—'}</td>
              <td style="color:var(--status-red);font-weight:600">${fmt(row.totalAmount || row.amount)}</td>
              <td>${getLinksHtml(row) || '<span style="color:var(--text-muted)">Admin/Overhead</span>'}</td>
              <td>${files.join(' ') || '<span style="color:var(--text-muted)">—</span>'}</td>
              <td>${StatusBadge.render(row.status||'Pending')}</td>
            </tr>`;
          }).join('')}
        </tbody></table></div>
      `;
      wrap.querySelector('#rec-search')?.addEventListener('input', e=>{recSearch=e.target.value;buildTable();});
      wrap.querySelector('#rec-filter-cat')?.addEventListener('change', e=>{recFilterCat=e.target.value;buildTable();});
      wrap.querySelector('#rec-filter-status')?.addEventListener('change', e=>{recFilterStatus=e.target.value;buildTable();});
      wrap.querySelectorAll('.rec-row').forEach(tr => tr.addEventListener('click', () => openReceiptDrawer(tr.dataset.id, () => renderFinancials({tab:'receipts'}))));

      const bulkBar = document.getElementById('rec-bulk-bar');
      const countEl = document.getElementById('rec-bulk-count');
      const chks = Array.from(wrap.querySelectorAll('.rec-chk'));
      const mkbl = () => {
        const sel = chks.filter(c=>c.checked).map(c=>c.value);
        if(sel.length>0) { bulkBar.style.display='flex'; countEl.innerText=sel.length+' Selected'; }
        else { bulkBar.style.display='none'; }
      };
      chks.forEach(c => c.addEventListener('change', mkbl));
      wrap.querySelector('#rec-all-chk')?.addEventListener('change', e => { chks.forEach(c => c.checked = e.target.checked); mkbl(); });
      
      document.getElementById('bulk-app').onclick = ()=>{ chks.forEach(c=>{if(c.checked)Store.update('receipts',c.value,{status:'Approved'});}); Toast.success('Approved!'); buildTable(); };
      document.getElementById('bulk-arch').onclick = ()=>{ chks.forEach(c=>{if(c.checked)Store.update('receipts',c.value,{status:'Archived'});}); Toast.success('Archived!'); buildTable(); };
      document.getElementById('bulk-exp').onclick = ()=>{ const sel = chks.filter(c=>c.checked).map(c=>c.value); Toast.success('Exporting ' + sel.length); };
    }

    function refreshSummary() {
      const all = Store.getAll('receipts').filter(r => r.status !== 'Void' && r.status !== 'Archived');
      document.getElementById('rec-summary-bar').innerHTML = [
        { l:'Tracked Subtotals', v:fmt(all.reduce((s,r)=>s+(r.amount||0),0)), c:'var(--text-primary)' },
        { l:'Approved/Paid Gross', v:fmt(all.filter(r=>['Paid','Reimbursed','Approved'].includes(r.status)).reduce((s,r)=>s+(r.totalAmount||r.amount||0),0)), c:'var(--status-red)' },
        { l:'Pending Recs', v:all.filter(r=>r.status==='Pending').length, c:'var(--status-amber)' },
      ].map(s => `<div class="stat-card"><div class="stat-card-label">${s.l}</div><div class="stat-card-value" style="color:${s.c}">${s.v}</div></div>`).join('');
    }
    refreshSummary(); buildTable();
    document.getElementById('new-rec-btn').onclick = () => openReceiptForm(null, () => renderFinancials({tab:'receipts'}));
    document.getElementById('export-rec-btn').onclick = () => Store.downloadCSV('receipts','receipts.csv');
  }

  // ── REPORT BUILDER TAB ─────────────────────────────────────────────────────
  function renderReportsTab() {
    let repType = 'Financial Summary';
    try {
    actionArea.innerHTML = `<button class="btn btn-ghost btn-sm" id="rep-export-csv" style="margin-right:8px">${Icons.download} Export CSV</button><button class="btn btn-primary" id="rep-print">${Icons.download} Print / PDF</button>`;
    
    function buildReportData() {
        const evts = Store.getAll('events');
        const revs = Store.getAll('financials');
        const recs = Store.getAll('receipts').filter(r => r.status !== 'Void' && r.status !== 'Archived');
        
        let headers = [], rows = [];
        
        if (repType === 'Financial Summary') {
            headers = ['Category', 'Gross Income', 'Gross Expenses', 'Net Position'];
            const g = getGlobalFinancials();
            
            let expMap = {};
            g.recs.forEach(r => expMap[r.category||'Uncategorized'] = (expMap[r.category||'Uncategorized']||0) + (parseFloat(r.totalAmount||r.amount)||0));
            
            rows.push({ cells: ['Event Ticket Sales',    fmt(g.eventTicketRev),    '$0',              fmt(g.eventTicketRev)] });
            rows.push({ cells: ['Event Sponsorships',    fmt(g.eventSponRev),      '$0',              fmt(g.eventSponRev)] });
            rows.push({ cells: ['Event Discounts/Refunds', '-'+fmt(g.eventDeductions), '$0',         '-'+fmt(g.eventDeductions)] });
            if (g.auctionRev)     rows.push({ cells: ['Auction Sales',         fmt(g.auctionRev),     '$0', fmt(g.auctionRev)] });
            if (g.oppRev)         rows.push({ cells: ['Special Opp Revenue',   fmt(g.oppRev),         '$0', fmt(g.oppRev)] });
            if (g.cashDonationRev)rows.push({ cells: ['Cash Donations',        fmt(g.cashDonationRev),'$0', fmt(g.cashDonationRev)] });
            if (g.manualRev)      rows.push({ cells: ['Manual Tracked Rev',    fmt(g.manualRev),      '$0', fmt(g.manualRev)] });
            
            Object.keys(expMap).sort().forEach(k => rows.push({ cells: [k, '$0', fmt(expMap[k]), '-'+fmt(expMap[k])] }));
            
            rows.push({ cells: ['TOTAL', fmt(g.grandActualRev), fmt(g.totalExp), fmt(g.netProfit)] });
            
        } else if (repType === 'Event Profitability') {
            headers = ['Event Name', 'Tickets Registered', 'Capacity', 'Ticket Rev', 'Sponsorship Rev', 'Expenses', 'Net Profit'];
            evts.forEach(e => {
                let trecs = recs.filter(r => r.linkedEventId === e.id);
                let exp = trecs.reduce((s,r) => s + (parseFloat(r.totalAmount||r.amount)||0), 0);
                let tRev = (e.spotsRegistered||0) * (e.entryFee||0);
                let sRev = e.sponsorshipRevenue || 0;
                let net = (tRev + sRev - (e.discounts||0) - (e.refunds||0)) - exp;
                rows.push({ cells: [e.name||e.id, String(e.spotsRegistered||0), String(e.capacity||'—'), fmt(tRev), fmt(sRev), fmt(exp), fmt(net)], recordId: e.id, recordType: 'event' });
            });
            
        } else if (repType === 'Expense Detail') {
            headers = ['Date', 'Vendor', 'Category', 'Payment Method', 'Department', 'Amount'];
            recs.sort((a,b)=>new Date(b.date||0)-new Date(a.date||0)).forEach(r => {
                rows.push({ cells: [r.date||'', r.vendor||'', r.category||'', r.paymentMethod||'', r.department||'', fmt(r.totalAmount||r.amount)], recordId: r.id, recordType: 'receipt' });
            });
            
        } else if (repType === 'Revenue Projection') {
            headers = ['Event', 'Currently Sold', 'Remaining Capacity', 'Price', 'Realized Rev', 'Pipeline Rev (Est)'];
            evts.forEach(e => {
                let reg = e.spotsRegistered||0, cap = e.capacity||0, fee = e.entryFee||0;
                let remain = Math.max(0, cap - reg);
                rows.push({ cells: [e.name, String(reg), String(remain), fmt(fee), fmt(reg*fee), fmt(remain*fee)], recordId: e.id, recordType: 'event' });
            });
            
        } else if (repType === 'Receipt & Audit Trail') {
            headers = ['ID', 'Date', 'Type', 'Title', 'Purchaser', 'Status', 'Total'];
            recs.forEach(r => {
                let pur = r.purchaserId ? Store.getById('users', r.purchaserId) : null;
                rows.push({ cells: [r.id, r.date||'', 'Expense', r.title||'', pur?pur.firstName+' '+pur.lastName:'Admin', r.status, fmt(r.totalAmount||r.amount)], recordId: r.id, recordType: 'receipt' });
            });
        }
        
        return { headers, rows };
    }

    function refreshReport() {
        const data = buildReportData();
        
        contentArea.innerHTML = `
          <div style="background:var(--bg-elevated);padding:var(--space-5);border-radius:var(--radius-lg);border:var(--border-subtle);margin-bottom:var(--space-4)">
            <div style="display:flex;gap:var(--space-4);align-items:flex-end">
              <div class="form-group" style="margin:0;width:300px">
                <label class="form-label">Report Template</label>
                <select class="select" id="rep-type">
                  <option ${repType==='Financial Summary'?'selected':''}>Financial Summary</option>
                  <option ${repType==='Event Profitability'?'selected':''}>Event Profitability</option>
                  <option ${repType==='Expense Detail'?'selected':''}>Expense Detail</option>
                  <option ${repType==='Revenue Projection'?'selected':''}>Revenue Projection</option>
                  <option ${repType==='Receipt & Audit Trail'?'selected':''}>Receipt & Audit Trail</option>
                </select>
              </div>
            </div>
          </div>
          <div class="table-container" id="report-print-zone">
            <div style="padding:var(--space-4);text-align:center;border-bottom:1px solid var(--border-color);display:none" class="print-header">
                <h2>${repType}</h2><p>Generated on ${new Date().toLocaleDateString()}</p>
            </div>
            <table class="crm-table">
              <thead><tr style="background:var(--bg-body)">${data.headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead>
              <tbody>${data.rows.length?data.rows.map(r=>{
                let action = '';
                if(r.recordType === 'event') action = `onclick="Router.navigate('events?open=${r.recordId}')"`;
                else if(r.recordType === 'receipt') action = `onclick="if(window.openReceiptDrawer) window.openReceiptDrawer('${r.recordId}')"`;
                return `<tr ${action} ${action ? 'style="cursor:pointer" class="hoverable"' : ''}>${r.cells.map(c=>`<td>${c}</td>`).join('')}</tr>`;
              }).join(''):'<tr><td colspan="10" style="text-align:center;padding:var(--space-4);color:var(--text-muted)">No data found for this report.</td></tr>'}</tbody>
            </table>
          </div>
        `;
        
        contentArea.querySelector('#rep-type').addEventListener('change', e => { repType = e.target.value; refreshReport(); });
    }
    
    refreshReport();
    
    document.getElementById('rep-export-csv').onclick = () => {
        const data = buildReportData();
        const csvContent = [data.headers.join(',')]
            .concat(data.rows.map(r => r.cells.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')))
            .join('\\n');
        const vBlob = new Blob([csvContent], {type: 'text/csv'});
        const vUrl = window.URL.createObjectURL(vBlob);
        const a = document.createElement('a'); a.style.display = 'none'; a.href = vUrl;
        a.download = `${repType.replace(/\\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(vUrl);
    };
    
    document.getElementById('rep-print').onclick = () => {
        const pz = document.getElementById('report-print-zone');
        const pw = window.open('', '', 'width=800,height=600');
        pw.document.write('<html><head><title>Print Report</title>');
        pw.document.write('<style>body{font-family:sans-serif;padding:20px} table{width:100%;border-collapse:collapse;margin-top:20px} th,td{border:1px solid #ddd;padding:8px;text-align:left} th{background:#f4f4f4} .print-header{display:block!important;margin-bottom:20px}</style>');
        pw.document.write('</head><body>' + pz.innerHTML + '</body></html>');
        pw.document.close();
        pw.focus(); pw.print(); pw.close();
    };
    } catch(err) {
      console.error(err);
      if(window.Toast) Toast.error(err.message);
      contentArea.innerHTML = `<div style="color:red;padding:20px">Error: ${err.message}<br/>${err.stack}</div>`;
    }
  }

  function getLinksHtml(row) {
    const a = row.linkedAuctionId ? Store.getById('auctions', row.linkedAuctionId) : null;
    const e = row.linkedEventId ? Store.getById('events', row.linkedEventId) : null;
    const u = (row.linkedUserId || row.purchaserId) ? Store.getById('users', (row.linkedUserId || row.purchaserId)) : null;
    return [
      u ? `<span class="tag">U: ${u.firstName}</span>` : '',
      a ? `<span class="tag">A: ${a.shortName||a.id}</span>` : '',
      e ? `<span class="tag">E: ${e.name||e.id}</span>` : ''
    ].filter(Boolean).join(' ');
  }
}

// ── REVENUE FORMS ────────────────────────────────────────────────────────────
function openFinDrawer(id, onDone) {
  let record = Store.getById('financials', id); if (!record) return;
  let fd = { ...record }, lf = {};
  const drawer = new RecordDrawer();
  drawer.open({
    recordId: record.id, title: record.description || record.id, tabs: ['Details'],
    tabRenderer: (body, tab, editMode) => {
      record = Store.getById('financials', id);
      const inp = (id,v,t='text')=>editMode?`<input class="input" id="fd-${id}" type="${t}" value="${String(v||'').replace(/"/g,'&quot;')}">`:`<div>${v||'—'}</div>`;
      const sel = (fid, opts, val) => editMode ? `<select class="select" id="fd-${fid}">${opts.map(o => `<option ${val===o?'selected':''}>${o}</option>`).join('')}</select>` : `<div>${val||'—'}</div>`;
      body.innerHTML = `
        <div class="drawer-section"><div class="drawer-section-title">Record Details</div>
          <div class="form-grid">
            <div class="form-group form-full"><label class="form-label">Description</label>${inp('d', record.description)}</div>
            <div class="form-group"><label class="form-label">Type</label>${sel('t', Store.FINANCIAL_RECORD_TYPES, record.recordType)}</div>
            <div class="form-group"><label class="form-label">Date</label>${inp('date', record.dateRecorded, 'date')}</div>
            <div class="form-group"><label class="form-label">Actual Rev</label>${inp('act', record.actualRevenue, 'number')}</div>
            ${editMode ? `<div class="form-group"><label class="form-label">Event</label><div id="fd-ev"></div></div><div class="form-group"><label class="form-label">Auction</label><div id="fd-au"></div></div>` : ''}
          </div>
        </div>`;
      if(editMode){
        ['d','date'].forEach(f=>{const e=body.querySelector(`#fd-${f}`);if(e)e.oninput=()=>fd[f==='d'?'description':'dateRecorded']=e.value;});
        const et=body.querySelector('#fd-t'); if(et)et.onchange=()=>fd.recordType=et.value;
        const ea=body.querySelector('#fd-act'); if(ea) ea.oninput=()=>fd.actualRevenue=parseFloat(ea.value)||null;
        createLinkedField({ container: body.querySelector('#fd-ev'), tableName: 'events', displayFn: r=>r.name, onSelect: id=>lf.linkedEventId=id, value: record.linkedEventId });
        createLinkedField({ container: body.querySelector('#fd-au'), tableName: 'auctions', displayFn: r=>r.shortName, onSelect: id=>lf.linkedAuctionId=id, value: record.linkedAuctionId });
      }
    },
    onSave: () => { Store.update('financials', id, {...fd, ...lf}); Toast.success('Saved'); if(onDone)onDone(); },
    onDelete: () => { Store.remove('financials', id); Toast.success('Deleted'); if(onDone)onDone(); drawer.close(); }
  });
}

function openFinForm(eid, onDone, pf={}) {
  const ex = eid ? Store.getById('financials', eid) : null;
  const lf = { ...pf }, o = document.createElement('div'); o.className = 'modal-overlay open';
  o.innerHTML = `<div class="modal"><div class="modal-header"><span class="modal-title">New Revenue</span><button class="drawer-close" id="c">${Icons.close}</button></div>
    <div class="modal-body"><div class="form-grid">
      <div class="form-group form-full"><label class="form-label">Description</label><input class="input" id="f-d" value="${ex?.description||''}"></div>
      <div class="form-group"><label class="form-label">Actual Rev ($)</label><input class="input" id="f-a" type="number" value="${ex?.actualRevenue||''}"></div>
      <div class="form-group"><label class="form-label">Type</label><select class="select" id="f-t">${Store.FINANCIAL_RECORD_TYPES.map(t=>`<option>${t}</option>`).join('')}</select></div>
      <div class="form-group"><label class="form-label">Linked Event</label><div id="f-e"></div></div>
      <div class="form-group"><label class="form-label">Linked Auction</label><div id="f-au"></div></div>
    </div></div>
    <div class="modal-footer"><button class="btn btn-primary" id="s">Save</button></div></div>`;
  document.body.appendChild(o); const cls=()=>o.remove(); o.querySelector('#c').onclick=cls;
  createLinkedField({ container: o.querySelector('#f-e'), tableName: 'events', displayFn: r=>r.name||r.id, onSelect: id=>lf.linkedEventId=id, value: lf.linkedEventId });
  createLinkedField({ container: o.querySelector('#f-au'), tableName: 'auctions', displayFn: r=>r.shortName||r.id, onSelect: id=>lf.linkedAuctionId=id, value: lf.linkedAuctionId });
  o.querySelector('#s').onclick = () => {
    Store.create('financials', { description: o.querySelector('#f-d').value||'Rev', actualRevenue: parseFloat(o.querySelector('#f-a').value)||0, recordType: o.querySelector('#f-t').value, revenueStatus: 'Complete', dateRecorded: new Date().toISOString().split('T')[0], ...lf });
    Toast.success('Revenue added'); cls(); if(onDone)onDone();
  };
}

// ── RECEIPTS FORMS ───────────────────────────────────────────────────────────
window.openReceiptDrawer = function openReceiptDrawer(id, onDone) {
  let record = Store.getById('receipts', id); if (!record) return;
  let fd = { ...record }, lf = {}; const drawer = new RecordDrawer();
  drawer.open({
    recordId: record.id, title: record.title || 'Receipt', tabs: ['Details', 'Notes', 'Files'],
    tabRenderer: (body, tab, editMode) => {
      record = Store.getById('receipts', id);
      if (tab === 'Details') {
        const inp = (id,v,t='text')=>editMode?`<input class="input" id="rd-${id}" type="${t}" value="${String(v||'').replace(/"/g,'&quot;')}">`:`<div>${v||'—'}</div>`;
        const sel = (fid, opts, val) => editMode ? `<select class="select" id="rd-${fid}"><option value="">--</option>${opts.map(o => `<option ${val===o?'selected':''}>${o}</option>`).join('')}</select>` : `<div>${val||'—'}</div>`;
        
        let subcats = Store.RECEIPT_SUBCATEGORIES[record.category] || [];
        
        body.innerHTML = `
          <div class="drawer-section"><div class="drawer-section-title">Expense Info</div>
            <div class="form-grid">
              <div class="form-group form-full"><label class="form-label">Title</label>${inp('title', record.title)}</div>
              <div class="form-group"><label class="form-label">Vendor</label>${inp('v', record.vendor)}</div>
              <div class="form-group"><label class="form-label">Date</label>${inp('date', record.date, 'date')}</div>
              <div class="form-group"><label class="form-label">Category</label>${sel('c', Store.RECEIPT_CATEGORIES, record.category)}</div>
              <div class="form-group"><label class="form-label">Subcategory</label>${sel('sub', subcats, record.subcategory)}</div>
              <div class="form-group"><label class="form-label">Status</label>${sel('s', Store.STATUS.receipts, record.status)}</div>
              <div class="form-group"><label class="form-label">Dept</label>${sel('dept', Store.RECEIPT_DEPARTMENTS, record.department)}</div>
              <div class="form-group form-full"><label class="form-label">Description / Memo</label>${inp('d', record.description)}</div>
            </div>
          </div>
          <div class="drawer-section"><div class="drawer-section-title">Financials</div>
            <div class="form-grid">
              <div class="form-group"><label class="form-label">Subtotal</label>${inp('a', record.amount, 'number')}</div>
              <div class="form-group"><label class="form-label">Tax</label>${inp('tax', record.tax, 'number')}</div>
              <div class="form-group"><label class="form-label">Total Amount</label>${inp('total', record.totalAmount, 'number')}</div>
              <div class="form-group"><label class="form-label">Payment Mthd</label>${sel('pm', Store.RECEIPT_PAYMENT_METHODS, record.paymentMethod)}</div>
            </div>
          </div>
          <div class="drawer-section"><div class="drawer-section-title">Linked Connections</div>
            <div class="form-grid">
              <div class="form-group"><label class="form-label">Purchaser</label>${editMode ? `<div id="rd-pu"></div>` : (record.purchaserId ? '*Linked User*' : '—')}</div>
              <div class="form-group"><label class="form-label">Event</label>${editMode ? `<div id="rd-ev"></div>` : (record.linkedEventId ? '*Linked Event*' : '—')}</div>
              <div class="form-group"><label class="form-label">Auction</label>${editMode ? `<div id="rd-au"></div>` : (record.linkedAuctionId ? '*Linked Auc*' : '—')}</div>
            </div>
          </div>
        `;
        if(editMode){
          ['title','v','d','date'].forEach(f=>{const e=body.querySelector(`#rd-${f}`);if(e)e.oninput=()=>fd[f==='v'?'vendor':f==='d'?'description':f]=e.value;});
          ['a','tax','total'].forEach(f=>{const e=body.querySelector(`#rd-${f}`);if(e)e.oninput=()=>fd[f==='a'?'amount':f==='total'?'totalAmount':f]=parseFloat(e.value)||null;});
          ['c','sub','s','dept','pm'].forEach(f=>{const e=body.querySelector(`#rd-${f}`);if(e)e.onchange=()=>{
            fd[f==='c'?'category':f==='sub'?'subcategory':f==='s'?'status':f==='dept'?'department':'paymentMethod']=e.value;
            if(f==='c') { fd.subcategory=''; drawer.refreshTab(); }
          };});
          createLinkedField({ container: body.querySelector('#rd-pu'), tableName: 'users', displayFn: r=>r.firstName+' '+r.lastName, onSelect: id=>lf.purchaserId=id, value: record.purchaserId });
          createLinkedField({ container: body.querySelector('#rd-ev'), tableName: 'events', displayFn: r=>r.name, onSelect: id=>lf.linkedEventId=id, value: record.linkedEventId });
          createLinkedField({ container: body.querySelector('#rd-au'), tableName: 'auctions', displayFn: r=>r.shortName, onSelect: id=>lf.linkedAuctionId=id, value: record.linkedAuctionId });
        }
      } else if (tab === 'Notes') renderNotesTab(body, record, 'receipts');
      else if (tab === 'Files') {
        const rFile = record.internalFile ? `<a href="${record.internalFile}" download="receipt-${record.id}" class="btn btn-sm btn-ghost">Download Uploaded Receipt</a>` : '';
        const rLink = record.fileUrl ? `<a href="${record.fileUrl}" target="_blank" class="btn btn-sm btn-ghost">Open Cloud URL</a>` : '';
        body.innerHTML = `
          <div class="drawer-section"><div class="drawer-section-title">Files & Storage Links</div>
            <div class="form-group" style="margin-bottom:var(--space-4)">
              <label class="form-label">Cloud Storage URL (Drive, Dropbox, etc)</label>
              ${editMode ? `<input class="input" id="rd-url" value="${record.fileUrl||''}">` : `<a href="${record.fileUrl||'#'}" target="_blank" style="color:var(--primary-color)">${record.fileUrl||'—'}</a>`}
            </div>
            <div class="form-group">
              <label class="form-label">Upload Replacement File</label>
              ${editMode ? `<input type="file" class="input" id="rd-file" accept="image/*,.pdf">` : (record.internalFile ? '<span class="tag badge-green">File securely stored</span>' : '—')}
            </div>
            <div style="margin-top:var(--space-4);display:flex;gap:var(--space-3)">${rFile}${rLink}</div>
          </div>
        `;
        if (editMode) {
          const u = body.querySelector('#rd-url'); if(u) u.oninput=()=>fd.fileUrl=u.value;
          const fi = body.querySelector('#rd-file'); 
          if(fi) fi.onchange=(e)=>{
            const f = e.target.files[0];
            if(f){ const r=new FileReader(); r.onload=ev=>fd.internalFile=ev.target.result; r.readAsDataURL(f); }
          };
        }
      }
    },
    onSave: () => { Store.update('receipts', id, {...fd, ...lf}); Toast.success('Saved'); if(onDone)onDone(); },
    onDelete: () => { Store.remove('receipts', id); Toast.success('Deleted'); if(onDone)onDone(); drawer.close(); }
  });
}

function openReceiptForm(eid, onDone, pf={}) {
  const lf = { ...pf }, o = document.createElement('div'); o.className = 'modal-overlay open';
  o.innerHTML = `<div class="modal" style="max-width:800px;width:90vw"><div class="modal-header"><span class="modal-title">Log Receipt / Expense</span><button class="drawer-close" id="c">${Icons.close}</button></div>
    <div class="modal-body" style="max-height: 70vh; overflow-y: auto"><div class="form-grid">
      <div class="form-group form-full"><label class="form-label">Receipt Title *</label><input class="input" id="f-t" placeholder="e.g. Venue Deposit, Flights to LA"></div>
      <div class="form-group"><label class="form-label">Vendor *</label><input class="input" id="f-v"></div>
      <div class="form-group"><label class="form-label">Date</label><input class="input" type="date" id="f-date" value="${new Date().toISOString().split('T')[0]}"></div>
      
      <div class="form-group"><label class="form-label">Category</label><select class="select" id="f-c"><option value="">--</option>${Store.RECEIPT_CATEGORIES.map(t=>`<option>${t}</option>`).join('')}</select></div>
      <div class="form-group"><label class="form-label">Subcategory</label><select class="select" id="f-sub" disabled><option>--</option></select></div>
      <div class="form-group"><label class="form-label">Department</label><select class="select" id="f-dept"><option value="">--</option>${Store.RECEIPT_DEPARTMENTS.map(t=>`<option>${t}</option>`).join('')}</select></div>
      <div class="form-group"><label class="form-label">Status</label><select class="select" id="f-s">${Store.STATUS.receipts.map(t=>`<option>${t}</option>`).join('')}</select></div>
      
      <div class="form-group"><label class="form-label">Subtotal ($)</label><input class="input" id="f-a" type="number"></div>
      <div class="form-group"><label class="form-label">Tax ($)</label><input class="input" id="f-tax" type="number"></div>
      <div class="form-group"><label class="form-label">Total Amount ($) *</label><input class="input" id="f-tot" type="number"></div>
      <div class="form-group"><label class="form-label">Payment Method</label><select class="select" id="f-pm"><option value="">--</option>${Store.RECEIPT_PAYMENT_METHODS.map(t=>`<option>${t}</option>`).join('')}</select></div>

      <div class="form-group"><label class="form-label">Purchaser</label><div id="f-pu"></div></div>
      <div class="form-group"><label class="form-label">Linked Event</label><div id="f-ev"></div></div>
      <div class="form-group"><label class="form-label">Linked Auction</label><div id="f-au"></div></div>
      
      <div class="form-group form-full"><label class="form-label">Cloud URL Link</label><input class="input" id="f-url" placeholder="https://drive.google.com/..."></div>
      <div class="form-group form-full"><label class="form-label">Upload File Image / PDF</label><input type="file" class="input" id="f-file"></div>
      <div class="form-group form-full"><label class="form-label">Memo / Description</label><textarea class="input" id="f-d" style="height:60px"></textarea></div>
    </div></div>
    <div class="modal-footer"><button class="btn btn-primary" id="s">Save Receipt</button></div></div>`;
  document.body.appendChild(o); const cls=()=>o.remove(); o.querySelector('#c').onclick=cls;
  
  createLinkedField({ container: o.querySelector('#f-pu'), tableName: 'users', displayFn: r=>r.firstName+' '+r.lastName, onSelect: id=>lf.purchaserId=id, value: lf.purchaserId, placeholder: "Search staff..." });
  createLinkedField({ container: o.querySelector('#f-ev'), tableName: 'events', displayFn: r=>r.name||r.id, onSelect: id=>lf.linkedEventId=id, value: lf.linkedEventId });
  createLinkedField({ container: o.querySelector('#f-au'), tableName: 'auctions', displayFn: r=>r.shortName||r.id, onSelect: id=>lf.linkedAuctionId=id, value: lf.linkedAuctionId });

  const catSel = o.querySelector('#f-c');
  const subSel = o.querySelector('#f-sub');
  catSel.onchange = () => {
    const subs = Store.RECEIPT_SUBCATEGORIES[catSel.value] || [];
    subSel.innerHTML = `<option value="">--</option>` + subs.map(s=>`<option>${s}</option>`).join('');
    subSel.disabled = subs.length === 0;
  };

  o.querySelector('#f-a').oninput = updateTot;
  o.querySelector('#f-tax').oninput = updateTot;
  function updateTot() {
    const a = parseFloat(o.querySelector('#f-a').value)||0;
    const t = parseFloat(o.querySelector('#f-tax').value)||0;
    o.querySelector('#f-tot').value = (a + t).toFixed(2);
  }

  let finalFileUrl = null;
  o.querySelector('#f-file').onchange = (e) => {
    const f=e.target.files[0];
    if(f){ const r=new FileReader(); r.onload=ev=>finalFileUrl=ev.target.result; r.readAsDataURL(f); }
  };

  o.querySelector('#s').onclick = () => {
    const title = o.querySelector('#f-t').value.trim();
    const vd = o.querySelector('#f-v').value.trim();
    const tot = parseFloat(o.querySelector('#f-tot').value);
    if(!title || !vd || !tot) { Toast.error('Title, Vendor, and Total Amount are required'); return; }
    Store.create('receipts', { 
      title: title, vendor: vd, amount: parseFloat(o.querySelector('#f-a').value)||0, tax: parseFloat(o.querySelector('#f-tax').value)||0, totalAmount: tot,
      date: o.querySelector('#f-date').value, category: catSel.value, subcategory: subSel.value, department: o.querySelector('#f-dept').value, status: o.querySelector('#f-s').value,
      paymentMethod: o.querySelector('#f-pm').value, description: o.querySelector('#f-d').value, fileUrl: o.querySelector('#f-url').value, internalFile: finalFileUrl,
      ...lf 
    });
    Toast.success('Receipt logged'); cls(); if(onDone)onDone();
  };
}

window.exportEventFinancialCSV = function(eventId) {
    const e = Store.getById('events', eventId);
    if(!e) return;
    const revs = Store.getAll('financials').filter(f => f.linkedEventId === eventId);
    const recs = Store.getAll('receipts').filter(r => r.linkedEventId === eventId && r.status !== 'Void');
    
    let csv = `"Event Name","${e.name}"\n"Date Generated","${new Date().toLocaleString()}"\n\n`;
    
    csv += `"TYPE","DATE","VENDOR / PURCHASER","CATEGORY","TOTAL AMOUNT"\n`;
    
    // Revenue
    if(e.spotsRegistered && e.entryFee) csv += `"Revenue","","Ticket Sales (${e.spotsRegistered})","Tickets","${e.spotsRegistered * e.entryFee}"\n`;
    if(e.sponsorshipRevenue) csv += `"Revenue","","Sponsorships","Sponsorship","${e.sponsorshipRevenue}"\n`;
    revs.forEach(rv => {
        const u = rv.linkedUserId ? Store.getById('users', rv.linkedUserId) : null;
        csv += `"Revenue","${rv.date||''}","${u?u.firstName+' '+u.lastName:'Manual'}","Manual Entry","${rv.actualRevenue}"\n`;
    });
    
    // Deductions
    if(e.discounts) csv += `"Deduction","","Discounts","Discount","-${e.discounts}"\n`;
    if(e.refunds) csv += `"Deduction","","Refunds","Refund","-${e.refunds}"\n`;
    
    // Expenses
    recs.forEach(r => {
        csv += `"Expense","${r.date||''}","${r.vendor||r.title||'Unknown'}","${r.category||'Uncategorized'}","-${r.totalAmount||r.amount}"\n`;
    });
    
    const vBlob = new Blob([csv], {type: 'text/csv'});
    const vUrl = window.URL.createObjectURL(vBlob);
    const a = document.createElement('a'); a.style.display = 'none'; a.href = vUrl;
    a.download = `Event_${eventId}_Financials.csv`;
    document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(vUrl);
};

window.renderLinkedFinancials = function(body, record, foreignKey, recordId, recordName) {
  const fmt = n => (n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const revs = Store.getAll('financials').filter(f => f[foreignKey] === recordId);
  const recs = Store.getAll('receipts').filter(r => r[foreignKey] === recordId && r.status !== 'Void');
  
  let actualRev = revs.reduce((s,f) => s + (parseFloat(f.actualRevenue)||0), 0);
  const totalExp = recs.reduce((s,r) => s + (parseFloat(r.totalAmount||r.amount)||0), 0);
  
  let isEvent = foreignKey === 'linkedEventId';
  let evHtml = '';
  
  if (isEvent) {
    const reg = record.spotsRegistered || 0;
    const cap = record.capacity || 0;
    const fee = record.entryFee || 0;
    const spon = record.sponsorshipRevenue || 0;
    const disc = record.discounts || 0;
    const ref = record.refunds || 0;
    
    // Total Event Revenue: (fee * reg) + spon - disc - ref + any manual revs
    const ticketRev = fee * reg;
    actualRev = actualRev + ticketRev + spon - disc - ref;
    
    const remainSpots = Math.max(0, cap - reg);
    const potRemainRev = remainSpots * fee;
    const grossProfit = actualRev - totalExp;
    
    const profPerAtt = reg ? (grossProfit / reg) : 0;
    const revPerAtt = reg ? (actualRev / reg) : 0;
    const expPerAtt = reg ? (totalExp / reg) : 0;
    const fillRate = cap ? Math.round((reg / cap) * 100) : 0;
    
    evHtml = `
      <div class="drawer-section"><div class="drawer-section-title">Event Intelligence</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4);margin-top:var(--space-3)">
          
          <div style="background:var(--bg-body);padding:var(--space-4);border-radius:var(--radius-md);border:1px solid var(--border-color)">
            <div style="font-weight:600;margin-bottom:var(--space-3)">Revenue Breakdown</div>
            <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px"><span>Ticket Sales (${reg} @ ${fmt(fee)})</span><span>${fmt(ticketRev)}</span></div>
            <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;color:var(--status-green)"><span>Sponsorships</span><span>+${fmt(spon)}</span></div>
            <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;color:var(--status-red)"><span>Discounts</span><span>-${fmt(disc)}</span></div>
            <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;color:var(--status-red)"><span>Refunds</span><span>-${fmt(ref)}</span></div>
            <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;color:var(--text-muted)"><span>Other Tracked Rev</span><span>+${fmt(actualRev - ticketRev - spon + disc + ref)}</span></div>
            <div style="border-top:1px solid var(--border-color);margin:8px 0"></div>
            <div style="display:flex;justify-content:space-between;font-weight:600"><span>Total Event Revenue</span><span style="color:var(--status-green)">${fmt(actualRev)}</span></div>
          </div>
          
          <div style="background:var(--bg-body);padding:var(--space-4);border-radius:var(--radius-md);border:1px solid var(--border-color)">
            <div style="font-weight:600;margin-bottom:var(--space-3)">Performance Metrics</div>
            <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px"><span>Capacity Fill Rate</span><span>${fillRate}% (${reg}/${cap})</span></div>
            <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;color:var(--text-muted)"><span>Potential Remaining Ticket Rev</span><span>${fmt(potRemainRev)}</span></div>
            <div style="border-top:1px dashed var(--border-color);margin:8px 0"></div>
            <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px"><span>Revenue / Attendee</span><span style="color:var(--status-green)">${fmt(revPerAtt)}</span></div>
            <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px"><span>Expense / Attendee</span><span style="color:var(--status-red)">${fmt(expPerAtt)}</span></div>
            <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;font-weight:600"><span>Net Profit / Attendee</span><span style="color:var(--badge-blue-text)">${fmt(profPerAtt)}</span></div>
          </div>

        </div>
      </div>
    `;
  }

  const profit = actualRev - totalExp;

  body.innerHTML = `
    <div class="drawer-section">
      <div class="drawer-section-title" style="display:flex;justify-content:space-between;align-items:center">
        P&L Summary
        ${isEvent ? `<button class="btn btn-ghost btn-sm" onclick="exportEventFinancialCSV('${recordId}')" style="margin-top:-6px"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> Export Event Report</button>` : ''}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--space-4);margin-top:var(--space-3)">
        <div class="stat-card" style="padding:var(--space-4);background:var(--bg-body)"><div class="stat-card-label">${isEvent?'Total Event Revenue':'Actual Revenue'}</div><div style="font-size:24px;color:var(--status-green);font-weight:700">${fmt(actualRev)}</div></div>
        <div class="stat-card" style="padding:var(--space-4);background:var(--bg-body)"><div class="stat-card-label">Total Expenses</div><div style="font-size:24px;color:var(--status-red);font-weight:700">${fmt(totalExp)}</div></div>
        <div class="stat-card" style="padding:var(--space-4);background:var(--badge-blue-bg)"><div class="stat-card-label" style="color:var(--badge-blue-text)">Gross Net Profit</div>
        <div style="font-size:24px;color:${profit<0?'var(--status-red)':'var(--badge-blue-text)'};font-weight:700">${profit<0?'-':''}${fmt(Math.abs(profit))}</div></div>
      </div>
    </div>
    ${evHtml}
    <div class="drawer-section">
      <div class="drawer-section-title" style="display:flex;justify-content:space-between;align-items:center">Other Revenue Records <button class="btn btn-ghost btn-sm" onclick="Router.navigate('financials?tab=revenue')">Log Revenue</button></div>
      ${revs.length===0?'<div style="color:var(--text-muted);font-size:14px;padding:var(--space-3) 0">No manual revenue logged.</div>':`<table class="crm-table" style="font-size:13px;margin-top:var(--space-3)"><tr style="color:var(--text-muted);border-bottom:1px solid var(--border-color)"><th>Description</th><th>Est. Rev</th><th>Actual Rev</th><th>Date</th></tr>${revs.map(r=>`<tr><td>${r.description||'—'}</td><td>${fmt(r.estimatedRevenue)}</td><td style="color:var(--status-green);font-weight:600">${fmt(r.actualRevenue)}</td><td>${r.dateRecorded||'—'}</td></tr>`).join('')}</table>`}
    </div>
    <div class="drawer-section">
      <div class="drawer-section-title" style="display:flex;justify-content:space-between;align-items:center">Itemized Event Expenses <button class="btn btn-ghost btn-sm" onclick="Router.navigate('financials?tab=receipts')">Log Expense</button></div>
      ${recs.length===0?'<div style="color:var(--text-muted);font-size:14px;padding:var(--space-3) 0">No expenses logged yet.</div>':`<table class="crm-table" style="font-size:13px;margin-top:var(--space-3)"><tr style="color:var(--text-muted);border-bottom:1px solid var(--border-color)"><th>Title / Vendor</th><th>Category</th><th>Total Amount</th><th>Date</th></tr>${recs.map(r=>`<tr><td><div style="font-weight:600">${r.title||'—'}</div><div style="color:var(--text-muted);font-size:11px">${r.vendor||'—'}</div></td><td>${r.category?`<span class="tag">${r.category}</span>`:'—'}</td><td style="color:var(--status-red);font-weight:600">${fmt(r.totalAmount||r.amount)}</td><td>${r.date||'—'}</td></tr>`).join('')}</table>`}
    </div>
  `;
};

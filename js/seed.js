/**
 * EPIC Foundation CRM — Seed Data
 * Populates all tables with realistic sample records on first run.
 */

const Seed = (() => {
  'use strict';

  const SEED_KEY = 'crm_seeded_v7';

  function isSeeded() {
    return localStorage.getItem(SEED_KEY) === 'true';
  }

  function markSeeded() {
    localStorage.setItem(SEED_KEY, 'true');
  }

  // ─── DEDUP HELPERS ────────────────────────────────────────────────────────────
  function dedupeLocalTable(storageKey, keyFn) {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return 0;
      const records = JSON.parse(raw);
      const seen = {};
      const kept = [];
      let removed = 0;
      records.forEach(r => {
        const k = keyFn(r);
        if (!k) { kept.push(r); return; } // no key = always keep
        if (!seen[k]) { seen[k] = r; kept.push(r); }
        else {
          // Keep the older (smaller createdAt) record
          if ((r.createdAt || '') < (seen[k].createdAt || '')) {
            kept.splice(kept.indexOf(seen[k]), 1);
            kept.push(r);
            seen[k] = r;
          }
          removed++;
        }
      });
      if (removed > 0) localStorage.setItem(storageKey, JSON.stringify(kept));
      return removed;
    } catch (e) { return 0; }
  }

  function deduplicateAll() {
    const r = {};
    // Courses — by normalized name
    r.courses      = dedupeLocalTable('crm_courses',      c => (c.name||'').trim().toLowerCase());
    // Users — by email
    r.users        = dedupeLocalTable('crm_users',        u => (u.email||'').trim().toLowerCase());
    // Auctions — by itemNumber (skip blank ones)
    r.auctions     = dedupeLocalTable('crm_auctions',     a => {
      const n = (a.itemNumber||'').trim();
      return (n && n !== '—') ? n.toLowerCase() : null;
    });
    // Opportunities — by title+courseId
    r.opportunities= dedupeLocalTable('crm_opportunities',o => {
      const t = (o.title||o.name||'').trim().toLowerCase();
      return t ? `${t}::${o.courseId||''}` : null;
    });
    // Donations — by donorId+courseId
    r.donations    = dedupeLocalTable('crm_donations',    d =>
      (d.donorId||d.courseId) ? `${d.donorId||''}::${d.courseId||''}` : null);
    // Tasks — by title+auctionId+userId
    r.tasks        = dedupeLocalTable('crm_tasks',        t => {
      const s = (t.title||'').trim().toLowerCase();
      return s ? `${s}::${t.auctionId||''}::${t.userId||''}` : null;
    });
    // Events — by title+date
    r.events       = dedupeLocalTable('crm_events',       e => {
      const s = (e.title||'').trim().toLowerCase();
      const d = e.date||e.startDate||'';
      return s ? `${s}::${d}` : null;
    });
    // Financials — by label+linkedId
    r.financials   = dedupeLocalTable('crm_financials',   f => {
      const s = (f.label||f.notes||'').trim().toLowerCase();
      return s ? `${s}::${f.linkedId||f.auctionId||''}` : null;
    });
    // Messages — by subject+fromUserId
    r.messages     = dedupeLocalTable('crm_messages',     m => {
      const s = (m.subject||'').trim().toLowerCase();
      return s ? `${s}::${m.fromUserId||''}` : null;
    });

    const total = Object.values(r).reduce((s, v) => s + v, 0);
    if (total > 0) console.log(`[Seed] Deduped ${total} duplicate records`, r);
    return r;
  }

  function run() {
    if (isSeeded()) return;

    // ── COURSES ────────────────────────────────────────────────────────────────
    const pebbleBeach = Store.create('courses', {
      name: 'Pebble Beach Golf Links', city: 'Pebble Beach', state: 'CA',
      address: '1700 17-Mile Dr, Pebble Beach, CA 93953',
      type: 'Public', tier: 'Platinum', region: 'West',
      website: 'pebblebeach.com', status: 'Active',
      contactName: 'Sam Torres', contactEmail: 'stam@pebblebeach.com', contactPhone: '(831) 574-5609',
      notes: 'Iconic coastal course. Host of multiple US Opens.',
    });

    const augustaNational = Store.create('courses', {
      name: 'Augusta National Golf Club', city: 'Augusta', state: 'GA',
      address: '2604 Washington Rd, Augusta, GA 30904',
      type: 'Private', tier: 'Platinum', region: 'Southeast',
      website: 'augustanational.com', status: 'Active',
      contactName: 'Bill Harmon', contactEmail: 'bharmon@angc.com', contactPhone: '(706) 667-6000',
      notes: 'Home of The Masters. Extremely exclusive access.',
    });

    const stAndrews = Store.create('courses', {
      name: 'St Andrews Links — Old Course', city: 'St Andrews', state: 'Scotland',
      address: 'Pilmour House, St Andrews, Fife KY16 9SF',
      type: 'Public', tier: 'Platinum', region: 'International',
      website: 'standrews.com', status: 'Active',
      contactName: 'Elaine Reid', contactEmail: 'ereid@standrews.com', contactPhone: '+44 1334 466666',
      notes: 'Home of golf. Category A tee time access required.',
    });

    const bethpage = Store.create('courses', {
      name: 'Bethpage Black', city: 'Farmingdale', state: 'NY',
      address: '99 Quaker Meeting House Rd, Farmingdale, NY 11735',
      type: 'Public', tier: 'Gold', region: 'Northeast',
      website: 'nysparks.com', status: 'Active',
      contactName: 'Mike Capuano', contactEmail: 'golf@parks.ny.gov', contactPhone: '(516) 249-0707',
      notes: 'Renowned public course. US Open host.',
    });

    const torrey = Store.create('courses', {
      name: 'Torrey Pines Golf Course', city: 'La Jolla', state: 'CA',
      address: '11480 N Torrey Pines Rd, La Jolla, CA 92037',
      type: 'Public', tier: 'Gold', region: 'West',
      website: 'torreypinesgolfcourse.com', status: 'Active',
      contactName: 'Laura Chan', contactEmail: 'lchan@sandiego.gov', contactPhone: '(858) 581-7171',
      notes: 'Stunning ocean views. Host of the Farmers Insurance Open.',
    });

    // ── ADMIN USERS ────────────────────────────────────────────────────────────
    const adminHunter = Store.create('admins', {
      name: 'Hunter Burnside',
      email: 'hunter@epicfoundation.com',
      role: 'Super Admin',
      status: 'Active',
      notes: 'Platform owner.',
    });

    // ── USERS ──────────────────────────────────────────────────────────────────
    const user1 = Store.create('users', {
      firstName: 'James',
      lastName: 'Whitfield',
      email: 'jwhitfield@gmail.com',
      phone: '(310) 555-0182',
      company: 'Whitfield Capital Partners',
      types: ['Member', 'Donor'],
      tags: ['VIP', 'High Value'],
      city: 'Los Angeles',
      state: 'CA',
      status: 'Active',
      address: '1420 Sunset Plaza Dr, Los Angeles, CA 90069',
      notes: 'Long-standing member. Major donor in 2023 Pebble Beach package.',
    });

    const user2 = Store.create('users', {
      firstName: 'Caroline',
      lastName: 'Marsh',
      email: 'cmarsh@marshsolutions.com',
      phone: '(415) 555-0293',
      company: 'Marsh Solutions Group',
      types: ['Donor', 'Buyer'],
      tags: ['Repeat Buyer', 'High Value'],
      city: 'San Francisco',
      state: 'CA',
      status: 'Active',
      notes: 'Purchased St Andrews round in 2024. Interested in Augusta access.',
    });

    const user3 = Store.create('users', {
      firstName: 'Robert',
      lastName: 'Chen',
      email: 'rchen@pacificequity.com',
      phone: '(650) 555-0374',
      company: 'Pacific Equity Group',
      types: ['Member', 'Buyer'],
      tags: ['Repeat Buyer', 'VIP'],
      city: 'Palo Alto',
      state: 'CA',
      status: 'Active',
      notes: 'Active bidder in all quarterly auctions.',
    });

    const user4 = Store.create('users', {
      firstName: 'David',
      lastName: 'Hartley',
      email: 'dhartley@wealthbridge.com',
      phone: '(212) 555-0451',
      company: 'Wealth Bridge Advisors',
      types: ['Broker'],
      tags: ['Hot Lead'],
      city: 'New York',
      state: 'NY',
      status: 'Active',
      notes: 'Broker who sources new donors. Manages multiple client introductions per quarter.',
    });

    const user5 = Store.create('users', {
      firstName: 'Margaret',
      lastName: 'Collins',
      email: 'mcollins@collinsphilanthropy.org',
      phone: '(713) 555-0527',
      company: 'Collins Philanthropy Foundation',
      types: ['Donor'],
      tags: ['Donor Tier 1'],
      city: 'Houston',
      state: 'TX',
      status: 'Active',
      notes: 'Donated Pebble Beach 4-some in Spring 2025.',
    });

    const user6 = Store.create('users', {
      firstName: 'Thomas',
      lastName: 'Nguyen',
      email: 'tnguyen@nguyenventures.com',
      phone: '(408) 555-0618',
      company: 'Nguyen Ventures',
      types: ['Member', 'Buyer', 'Donor'],
      tags: ['VIP', 'Donor Tier 1', 'Repeat Buyer'],
      city: 'San Jose',
      state: 'CA',
      status: 'Active',
      notes: 'Multi-role user. Both buys and donates rounds.',
    });

    // ── AUCTIONS ───────────────────────────────────────────────────────────────
    const auct1 = Store.create('auctions', {
      title: 'Pebble Beach 4-Some — Spring 2025',
      shortName: 'Pebble 4-Some Spring',
      description: 'An unforgettable round at the iconic Pebble Beach Golf Links for four players. Includes cart, caddie service, and post-round dinner at The Lodge. One of the most coveted tee times in American golf.',
      type: 'Round of Golf',
      roundType: '4-Some',
      itemNumber: 'GS-001',
      courseId: pebbleBeach.id,
      donorId: user5.id,
      buyerId: user2.id,
      confirmedPlayDate: '2025-06-15',
      players: 4,
      fmv: 25000,
      reservePrice: 15000,
      sellPrice: 22500,
      finalPrice: 22500,
      buyNowPrice: 30000,
      quantity: 1,
      visibility: 'Public',
      categories: ['Golf'],
      schedulingStatus: 'Confirmed',
      givesmartUrl: 'https://givesmart.com/events/epic-spring2025/items/GS001',
      eventCode: 'EPIC-S25',
      itemToken: 'GS001',
      launchDate: '2025-03-01',
      endDate: '2025-04-15',
      city: 'Pebble Beach',
      state: 'CA',
      status: 'New',
      notes: 'Includes cart, caddie, and post-round dinner at The Lodge.',
    });

    const auct2 = Store.create('auctions', {
      title: 'Augusta National 2-Some — Members Only',
      shortName: 'Augusta 2-Some',
      description: 'Extremely rare access to Augusta National Golf Club for two players. One of the most exclusive opportunities in golf. Must be placed with a serious, qualified buyer only.',
      type: 'Round of Golf',
      roundType: '2-Some',
      itemNumber: 'GS-002',
      courseId: augustaNational.id,
      donorId: user1.id,
      buyerId: null,
      players: 2,
      fmv: 40000,
      reservePrice: 35000,
      sellPrice: null,
      finalPrice: null,
      buyNowPrice: 50000,
      quantity: 1,
      visibility: 'Members Only',
      categories: ['Golf'],
      schedulingStatus: 'Not Started',
      givesmartUrl: 'https://givesmart.com/events/epic-members/items/GS002',
      eventCode: 'EPIC-MEM',
      itemToken: 'GS002',
      launchDate: '2026-06-01',
      endDate: '2026-07-15',
      city: 'Augusta',
      state: 'GA',
      status: 'New',
      notes: 'Extremely rare access. Must be placed with serious buyer only.',
    });

    const auct3 = Store.create('auctions', {
      title: 'St Andrews Old Course 4-Some — Fall 2025',
      shortName: 'St Andrews Fall',
      description: 'Play the Old Course at St Andrews, the home of golf, for four players. Fall availability with travel package potentially included. A once-in-a-lifetime experience.',
      type: 'Golf Trip',
      roundType: '4-Some',
      itemNumber: 'GS-003',
      courseId: stAndrews.id,
      donorId: user6.id,
      buyerId: null,
      players: 4,
      fmv: 22000,
      reservePrice: 18000,
      sellPrice: null,
      finalPrice: null,
      buyNowPrice: 28000,
      quantity: 1,
      visibility: 'Public',
      categories: ['Golf', 'Travel'],
      schedulingStatus: 'Not Started',
      givesmartUrl: 'https://givesmart.com/events/epic-fall2025/items/GS003',
      eventCode: 'EPIC-F25',
      itemToken: 'GS003',
      launchDate: '2026-08-01',
      endDate: '2026-09-30',
      city: 'St Andrews',
      state: 'Scotland',
      status: 'New',
      notes: 'Pending logistics confirmation. Travel package potentially included.',
    });

    const auct4 = Store.create('auctions', {
      title: 'Torrey Pines Twilight 2-Some — Summer 2025',
      shortName: 'Torrey Twilight 2-Some',
      description: 'Ocean-view tee times after 4pm at the legendary Torrey Pines Golf Course for two players. Stunning sunset views on one of the most scenic public courses in America.',
      type: 'Round of Golf',
      roundType: '2-Some',
      itemNumber: 'GS-004',
      courseId: torrey.id,
      donorId: user1.id,
      buyerId: user3.id,
      confirmedPlayDate: '2025-07-22',
      players: 2,
      fmv: 8000,
      reservePrice: 4500,
      sellPrice: 6200,
      finalPrice: 6200,
      buyNowPrice: 9000,
      quantity: 1,
      visibility: 'Public',
      categories: ['Golf'],
      schedulingStatus: 'Confirmed',
      givesmartUrl: 'https://givesmart.com/events/epic-summer2025/items/GS004',
      eventCode: 'EPIC-SU25',
      itemToken: 'GS004',
      launchDate: '2025-04-01',
      endDate: '2025-05-31',
      city: 'La Jolla',
      state: 'CA',
      status: 'New',
      notes: 'Reserved for ocean-view tee times after 4pm.',
    });

    // ── SPECIAL OPPORTUNITIES ─────────────────────────────────────────────────
    const opp1 = Store.create('opportunities', {
      title: 'Augusta Private Suite Access — Masters Week',
      courseId: augustaNational.id,
      donorId: user1.id,
      interestedUserId: user3.id,
      availableDate: '2026-04-06',
      value: 50000,
      status: 'Pending',
      notes: 'Once-in-a-lifetime opportunity. Discussing privately with Robert Chen.',
    });

    const opp2 = Store.create('opportunities', {
      title: 'Pebble Beach Pro-Am Experience — Jan 2026',
      courseId: pebbleBeach.id,
      donorId: user6.id,
      interestedUserId: null,
      availableDate: '2026-01-28',
      value: 28000,
      status: 'Available',
      notes: 'Walk the course alongside pros. Full week access and hospitality.',
    });

    const opp3 = Store.create('opportunities', {
      title: 'Bethpage Black Members Day — Fall 2025',
      courseId: bethpage.id,
      donorId: user5.id,
      interestedUserId: user2.id,
      availableDate: '2025-11-04',
      value: 8500,
      status: 'Committed',
      notes: 'Caroline Marsh confirmed interest. Contract being prepared.',
    });

    // ── DONATIONS ─────────────────────────────────────────────────────────────
    const don1 = Store.create('donations', {
      donorId: user5.id,
      courseId: pebbleBeach.id,
      type: 'Round of Golf',
      description: 'Pebble Beach 4-some — Spring donation for auction pool',
      value: 22500,
      status: 'Received',
      receivedDate: '2025-01-15',
      notes: 'Delivered via donor contribution agreement.',
    });

    const don2 = Store.create('donations', {
      donorId: user1.id,
      courseId: augustaNational.id,
      type: 'Round of Golf',
      description: 'Augusta 2-some — access donated for members-only auction',
      value: 35000,
      status: 'Received',
      receivedDate: '2025-02-01',
      notes: 'High-value donation. Strictly for verified buyer only.',
    });

    const don3 = Store.create('donations', {
      donorId: user6.id,
      courseId: stAndrews.id,
      type: 'Round of Golf',
      description: 'St Andrews 4-some — Fall 2025 auction',
      value: 18000,
      status: 'Pending',
      receivedDate: null,
      notes: 'Commitment received. Formal agreement pending.',
    });

    const don4 = Store.create('donations', {
      donorId: user2.id,
      courseId: null,
      type: 'Cash',
      description: 'General foundation fund contribution',
      value: 5000,
      status: 'Received',
      receivedDate: '2025-03-01',
      notes: 'Unrestricted gift. Allocated to operations.',
    });

    // ── TASKS ─────────────────────────────────────────────────────────────────
    Store.create('tasks', {
      title: 'Confirm Augusta tee time window with donor',
      description: 'Bill Harmon at Augusta confirmed availability in late April. Need exact window before marketing to buyers.',
      taskType: 'Donor Contact',
      assignedToId: adminHunter.id,
      auctionId: auct2.id, opportunityId: null, userId: user1.id, donationId: null, eventId: null,
      dueDate: '2025-04-30', dueTime: '10:00', reminderDate: '2025-04-28',
      priority: 'High', status: 'Open',
      notes: 'Must have exact dates before marketing to buyers.',
    });

    Store.create('tasks', {
      title: 'Draft contract for Bethpage Black opportunity',
      description: 'Template ready. Needs specific dates and payment terms for the Bethpage 4-some.',
      taskType: 'Scheduling',
      assignedToId: adminHunter.id,
      auctionId: null, opportunityId: opp3.id, userId: null, donationId: null, eventId: null,
      dueDate: '2025-04-25', dueTime: '',
      priority: 'High', status: 'In Progress',
      notes: 'Template ready. Needs specific dates and payment terms inserted.',
    });

    Store.create('tasks', {
      title: 'Follow up with Robert Chen re: Augusta suite',
      description: 'Robert expressed strong interest at last event. Awaiting calendar confirmation.',
      taskType: 'Buyer Contact',
      assignedToId: adminHunter.id,
      auctionId: null, opportunityId: opp1.id, userId: user3.id, donationId: null, eventId: null,
      dueDate: '2025-05-05', priority: 'Medium', status: 'Open',
      notes: 'Last contact was positive. Awaiting his schedule confirmation.',
    });

    Store.create('tasks', {
      title: 'Send post-sale receipt to Caroline Marsh (Pebble Beach)',
      description: 'Receipt for the Pebble Beach 4-some purchase. Confirm mailing address.',
      taskType: 'Admin',
      assignedToId: adminHunter.id,
      auctionId: auct1.id, opportunityId: null, userId: user2.id, donationId: null, eventId: null,
      dueDate: '2025-03-20', priority: 'Low', status: 'Complete',
      completedDate: '2025-03-19',
      notes: 'Receipt emailed and confirmed received.',
    });

    Store.create('tasks', {
      title: 'Onboard Thomas Nguyen — verify broker/donor dual status',
      description: 'Check all linked records and ensure both Donor and Broker roles are correctly set.',
      taskType: 'Internal Review',
      assignedToId: adminHunter.id,
      auctionId: null, opportunityId: null, userId: null, donationId: null, eventId: null,
      dueDate: '2025-04-10', priority: 'Medium', status: 'Complete',
      completedDate: '2025-04-08',
      notes: 'Confirmed: both donor and buyer roles active.',
    });

    Store.create('tasks', {
      title: 'Call James Whitfield — confirm Round Scheduled for St Andrews',
      description: 'James confirmed interest. Need to lock down dates and send itinerary package.',
      taskType: 'Follow Up',
      assignedToId: adminHunter.id,
      auctionId: auct3.id, opportunityId: null, userId: user1.id, donationId: null, eventId: null,
      dueDate: '2026-03-20', dueTime: '14:00', reminderDate: '2026-03-18',
      priority: 'Urgent', status: 'Open',
      notes: 'James prefers to be called in the morning PST.',
    });

    Store.create('tasks', {
      title: 'Review unassigned Torrey Pines donation — assign to auction or opportunity',
      description: 'Don4 round from Pacific Equity sitting unassigned. Assign or create listing by end of week.',
      taskType: 'Internal Review',
      assignedToId: adminHunter.id,
      auctionId: null, opportunityId: null, userId: user3.id, donationId: null, eventId: null,
      dueDate: '2026-03-22', priority: 'High', status: 'Waiting',
      notes: 'Waiting on response from events team regarding spring schedule.',
    });

    Store.create('tasks', {
      title: 'Follow up with Caroline Marsh — Augusta opportunity interest',
      description: 'Caroline previously asked about Augusta access. Reach out and gauge commitment level.',
      taskType: 'Outreach',
      assignedToId: adminHunter.id,
      auctionId: null, opportunityId: opp1.id, userId: user2.id, donationId: null, eventId: null,
      dueDate: '2026-03-21', priority: 'High', status: 'Open',
      notes: 'She mentioned interest at the gala. Hot lead.',
    });

    // ── FINANCIALS ────────────────────────────────────────────────────────────
    Store.create('financials', {
      recordType: 'Auction',
      description: 'Pebble Beach 4-Some sale — AUCT0001',
      linkedAuctionId: auct1.id,
      fmv: 28000, salePrice: 22500, estimatedRevenue: 22500, actualRevenue: 22500,
      revenueStatus: 'Recorded', dateRecorded: '2025-02-20',
      internalNotes: 'Wire received from Caroline Marsh. Confirmed deposited.',
    });

    Store.create('financials', {
      recordType: 'Auction',
      description: 'Torrey Pines 2-Some sale — AUCT0004',
      linkedAuctionId: auct4.id,
      fmv: 8000, salePrice: 6200, estimatedRevenue: 6200, actualRevenue: 6200,
      revenueStatus: 'Recorded', dateRecorded: '2025-03-05',
      internalNotes: 'Paid via check. Deposited.',
    });

    Store.create('financials', {
      recordType: 'Other',
      description: 'Platform operations — Q1 2025',
      fmv: null, salePrice: null, estimatedRevenue: null, actualRevenue: 2400,
      revenueStatus: 'Complete', dateRecorded: '2025-01-31',
      internalNotes: 'Software, site hosting, admin expenses.',
    });

    Store.create('financials', {
      recordType: 'Auction',
      description: 'Augusta National auction — AUCT0002 projected',
      linkedAuctionId: auct2.id,
      fmv: 45000, salePrice: null, estimatedRevenue: 35000, actualRevenue: null,
      revenueStatus: 'Estimated', dateRecorded: null,
      internalNotes: 'Projected based on reserve price. Auction not yet live.',
    });

    Store.create('financials', {
      recordType: 'Special Opportunity',
      description: 'Bethpage Black Private Round — OPP0001',
      fmv: 12000, salePrice: 9500, estimatedRevenue: 9500, actualRevenue: null,
      revenueStatus: 'Pending', dateRecorded: null,
      internalNotes: 'Reserved for James Whitfield. Awaiting final payment.',
    });

    // ── MESSAGES ──────────────────────────────────────────────────────────────
    Store.create('messages', {
      fromName: 'William Frasier',
      fromEmail: 'wfrasier@frasiergroup.com',
      subject: 'Inquiry about Pebble Beach availability',
      body: 'Hello, I saw your organization offers exclusive golf rounds. I am interested in a Pebble Beach 4-some for late summer 2025 for myself and a few clients. Please advise on availability and pricing.',
      linkedUserId: null,
      status: 'Open',
      notes: 'Warm lead. Check if he should be added as a User record.',
    });

    Store.create('messages', {
      fromName: 'Sandra Kim',
      fromEmail: 'skim@novalaw.com',
      subject: 'Donation inquiry — St Andrews',
      body: 'I\'d like to learn more about donating a round at St Andrews. Our firm has access and we\'d love to support the foundation. Can we set up a call?',
      linkedUserId: null,
      status: 'Open',
      notes: 'Potential new donor. Respond promptly.',
    });

    Store.create('messages', {
      fromName: 'James Whitfield',
      fromEmail: 'jwhitfield@gmail.com',
      subject: 'Re: Augusta confirmation',
      body: 'Confirming the Augusta 2-some donation for your records. My assistant will send the access letter next week.',
      linkedUserId: user1.id,
      status: 'Closed',
      notes: 'Donation confirmed. Linked to USER0001 record.',
    });

    // ── EVENTS ─────────────────────────────────────────────────────────────────
    Store.create('events', {
      title: 'Spring Charity Auction Gala 2025',
      type: 'Auction Event',
      date: '2025-05-15',
      location: 'The Beverly Hilton, Los Angeles, CA',
      courseId: null,
      userIds: [user1.id, user2.id, user3.id, user6.id],
      status: 'Upcoming',
      capacity: 80,
      spotsRegistered: 4,
      notes: 'Annual spring gala. All active auction lots to be presented.',
    });

    Store.create('events', {
      title: 'Pebble Beach Member Weekend — June 2025',
      type: 'Golf Trip',
      date: '2025-06-14',
      location: 'Pebble Beach, CA',
      courseId: pebbleBeach.id,
      userIds: [user2.id, user3.id],
      status: 'Upcoming',
      capacity: 8,
      spotsRegistered: 2,
      notes: 'Companion event for auction winners + select members.',
    });

    Store.create('events', {
      title: 'Year-End Foundation Dinner 2024',
      type: 'Gala Dinner',
      date: '2024-12-05',
      location: 'The Jonathan Club, Los Angeles, CA',
      courseId: null,
      userIds: [user1.id, user2.id, user3.id, user4.id, user5.id, user6.id],
      status: 'Completed',
      capacity: 60,
      spotsRegistered: 6,
      notes: 'Recap of 2024 season. Awards presented.',
    });


    // ── ADMIN USERS ─────────────────────────────────────────────────────────────
    // Super Admin - null passwordHash = first-login bypass (set password on first login)
    Store.create('admins', {
      name: 'Hunter Burnside',
      email: 'hunter@epicfoundation.com',
      role: 'Super Admin',
      passwordHash: null,
      status: 'Active',
      permissions: { _all: true },
      lastLogin: null,
    });

    // Sample limited admin for testing permissions
    Store.create('admins', {
      name: 'Caitlyn Staff',
      email: 'caitlyn@epicfoundation.com',
      role: 'Limited Admin',
      passwordHash: null,
      status: 'Active',
      permissions: {
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
      lastLogin: null,
    });

    markSeeded();
    console.log('[CRM] Seed data loaded successfully.');
  }

  return { run, isSeeded, markSeeded, deduplicateAll };
})();


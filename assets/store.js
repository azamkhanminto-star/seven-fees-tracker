/* ============================================================
   3M Detailing — data store
   One localStorage document, plus every derived number the
   views need (job totals, dues, stock, ratings, follow-ups).
   Exposed as the global `S`.
   ============================================================ */
(function (global) {
  'use strict';

  var KEY = '3m_detailing_v1';
  var S = {};

  S.STATUSES = ['Booked', 'Received', 'In Progress', 'Ready', 'Delivered', 'Cancelled'];
  S.OPEN_STATUSES = ['Booked', 'Received', 'In Progress', 'Ready'];
  S.PAY_MODES = ['Cash', 'UPI / Wallet', 'Bank transfer', 'Card', 'Credit (due)'];
  S.ASPECTS = [
    { key: 'quality', label: 'Work quality' },
    { key: 'time', label: 'On-time delivery' },
    { key: 'staff', label: 'Staff behaviour' },
    { key: 'value', label: 'Value for money' }
  ];

  /* ── defaults ──────────────────────────────────────────── */
  function defaultSettings() {
    return {
      workshopName: '3M Detailing',
      tagline: 'Car wash · Detailing · Ceramic coating · PPF',
      phone: '',
      address: '',
      taxLabel: 'GST',
      taxPercent: 0,
      currency: 'Rs',
      jobPrefix: 'JC-',
      invoicePrefix: 'INV-',
      nextJobNo: 1,
      openingBalance: 0,
      theme: 'auto',
      bays: ['Wash Bay', 'Detailing Bay', 'Paint Booth', 'Service Bay'],
      sizes: ['Bike', 'Hatchback', 'Sedan', 'SUV', 'Luxury'],
      expenseCategories: ['Materials & consumables', 'Salary & wages', 'Rent',
        'Electricity & water', 'Equipment', 'Marketing', 'Transport',
        'Maintenance', 'Tea & food', 'Miscellaneous'],
      feedbackAskDays: 1,
      lowStockOnly: false
    };
  }

  /* Service catalog matching the workshop's actual work.
     price is per vehicle size; repeatDays drives service reminders. */
  function defaultServices() {
    var mk = function (name, group, p, opts) {
      opts = opts || {};
      return {
        id: U.uid('sv'), name: name, group: group,
        price: { Bike: p[0], Hatchback: p[1], Sedan: p[2], SUV: p[3], Luxury: p[4] },
        minutes: opts.minutes || 60,
        warrantyMonths: opts.warranty || 0,
        repeatDays: opts.repeat || 0,
        materials: [],
        active: true,
        notes: opts.notes || ''
      };
    };
    return [
      mk('Body wash', 'Washing', [150, 350, 450, 600, 900], { minutes: 40, repeat: 15 }),
      mk('Foam wash + tyre polish', 'Washing', [250, 550, 700, 900, 1300], { minutes: 60, repeat: 15 }),
      mk('Underbody wash', 'Washing', [0, 500, 600, 800, 1100], { minutes: 40, repeat: 90 }),
      mk('General service', 'Service', [600, 2500, 3200, 4200, 6500], { minutes: 180, repeat: 150, notes: 'Oil, filters, labour billed separately' }),
      mk('AC service', 'Service', [0, 2500, 3000, 4000, 6000], { minutes: 120, repeat: 365 }),
      mk('Denting & painting (per panel)', 'Painting', [1500, 4500, 5500, 6500, 9500], { minutes: 480, warranty: 6 }),
      mk('Full body paint', 'Painting', [8000, 45000, 55000, 70000, 120000], { minutes: 2880, warranty: 12 }),
      mk('Interior dry cleaning', 'Dry cleaning', [0, 3000, 3800, 4800, 7000], { minutes: 240, repeat: 180 }),
      mk('Seat & roof shampoo', 'Dry cleaning', [0, 2000, 2500, 3200, 4500], { minutes: 150, repeat: 180 }),
      mk('Rubbing & polishing', 'Rubbing', [800, 2500, 3000, 3800, 5500], { minutes: 180, repeat: 180 }),
      mk('Paint correction (2 step)', 'Rubbing', [0, 6000, 7500, 9500, 15000], { minutes: 480, repeat: 365 }),
      mk('Full body detailing', 'Detailing', [1500, 6000, 7500, 9500, 15000], { minutes: 360, repeat: 120 }),
      mk('Engine bay detailing', 'Detailing', [500, 1500, 1800, 2200, 3000], { minutes: 90, repeat: 180 }),
      mk('Headlight restoration', 'Detailing', [0, 1500, 1800, 2200, 3000], { minutes: 90 }),
      mk('Ceramic coating 9H (1 year)', 'Ceramic coating', [3500, 12000, 15000, 18000, 28000], { minutes: 600, warranty: 12, repeat: 365 }),
      mk('Ceramic coating 9H (3 year)', 'Ceramic coating', [6000, 22000, 26000, 32000, 48000], { minutes: 900, warranty: 36 }),
      mk('Graphene coating (5 year)', 'Ceramic coating', [0, 35000, 42000, 52000, 75000], { minutes: 1080, warranty: 60 }),
      mk('Teflon coating', 'Ceramic coating', [1500, 5000, 6000, 7500, 11000], { minutes: 240, warranty: 6, repeat: 180 }),
      mk('PPF — full body (TPU)', 'PPF', [0, 130000, 150000, 190000, 280000], { minutes: 2880, warranty: 60 }),
      mk('PPF — front / partial kit', 'PPF', [0, 35000, 42000, 50000, 70000], { minutes: 720, warranty: 60 }),
      mk('PPF — headlight / bumper patch', 'PPF', [1500, 4500, 5000, 6000, 9000], { minutes: 120, warranty: 24 })
    ];
  }

  function defaultInventory() {
    var mk = function (name, unit, stock, reorder, cost) {
      return { id: U.uid('it'), name: name, unit: unit, stock: stock, reorder: reorder, cost: cost, supplier: '' };
    };
    return [
      mk('Car shampoo', 'litre', 20, 5, 700),
      mk('Snow foam', 'litre', 12, 4, 1100),
      mk('Rubbing compound', 'kg', 8, 2, 1500),
      mk('Polish / wax', 'kg', 6, 2, 2200),
      mk('Ceramic coating 9H', 'ml', 300, 100, 45),
      mk('PPF film roll', 'sq ft', 400, 120, 350),
      mk('Interior cleaner', 'litre', 10, 3, 900),
      mk('Dashboard polish', 'litre', 6, 2, 1200),
      mk('Tyre polish', 'litre', 8, 2, 850),
      mk('Microfiber cloth', 'piece', 60, 20, 180),
      mk('Sandpaper sheets', 'piece', 120, 40, 35),
      mk('Primer', 'litre', 10, 3, 1800),
      mk('Thinner', 'litre', 25, 8, 400),
      mk('IPA / degreaser', 'litre', 8, 3, 950)
    ];
  }

  function emptyDB() {
    return {
      version: 1,
      settings: defaultSettings(),
      services: defaultServices(),
      staff: [],
      customers: [],
      vehicles: [],
      jobs: [],
      expenses: [],
      inventory: defaultInventory(),
      stockMoves: [],
      feedback: [],
      appointments: [],
      followups: [],
      seeded: false
    };
  }

  /* ── persistence ───────────────────────────────────────── */
  S.db = emptyDB();

  S.load = function () {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        S.db = S.migrate(parsed);
      }
    } catch (e) {
      console.warn('Could not read saved data:', e);
    }
    U.currency = S.db.settings.currency || 'Rs';
    return S.db;
  };

  S.migrate = function (data) {
    var base = emptyDB();
    var db = Object.assign(base, data || {});
    db.settings = Object.assign(base.settings, data && data.settings || {});
    ['services', 'staff', 'customers', 'vehicles', 'jobs', 'expenses',
      'inventory', 'stockMoves', 'feedback', 'appointments', 'followups'].forEach(function (k) {
        if (!Array.isArray(db[k])) db[k] = [];
      });
    db.jobs.forEach(function (j) {
      if (!Array.isArray(j.items)) j.items = [];
      if (!Array.isArray(j.payments)) j.payments = [];
    });
    return db;
  };

  var saveTimer = null;
  S.save = function (immediate) {
    U.currency = S.db.settings.currency || 'Rs';
    var write = function () {
      try {
        localStorage.setItem(KEY, JSON.stringify(S.db));
      } catch (e) {
        U.toast('Could not save — storage full or blocked', 'warn');
      }
    };
    if (immediate) { clearTimeout(saveTimer); write(); return; }
    clearTimeout(saveTimer);
    saveTimer = setTimeout(write, 120);
  };

  S.reset = function () {
    S.db = emptyDB();
    S.save(true);
  };

  S.exportJSON = function () {
    return JSON.stringify({
      app: '3M Detailing Workshop Manager',
      exportedAt: new Date().toISOString(),
      data: S.db
    }, null, 2);
  };

  S.importJSON = function (text) {
    var parsed = JSON.parse(text);
    var data = parsed && parsed.data ? parsed.data : parsed;
    if (!data || typeof data !== 'object' || !data.settings) throw new Error('Not a valid backup file');
    S.db = S.migrate(data);
    S.save(true);
  };

  /* ── lookups ───────────────────────────────────────────── */
  S.customer = function (id) { return U.pick(S.db.customers, id); };
  S.vehicle = function (id) { return U.pick(S.db.vehicles, id); };
  S.service = function (id) { return U.pick(S.db.services, id); };
  S.staffMember = function (id) { return U.pick(S.db.staff, id); };
  S.item = function (id) { return U.pick(S.db.inventory, id); };
  S.job = function (id) { return U.pick(S.db.jobs, id); };

  S.customerName = function (id) { var c = S.customer(id); return c ? c.name : 'Walk-in'; };
  S.staffName = function (id) { var s = S.staffMember(id); return s ? s.name : '—'; };
  S.vehicleLabel = function (id) {
    var v = S.vehicle(id);
    if (!v) return '—';
    var name = [v.make, v.model].filter(Boolean).join(' ');
    return (v.reg ? v.reg + (name ? ' · ' : '') : '') + name;
  };
  S.vehiclesOf = function (customerId) {
    return S.db.vehicles.filter(function (v) { return v.customerId === customerId; });
  };
  S.jobsOfCustomer = function (customerId) {
    return S.db.jobs.filter(function (j) { return j.customerId === customerId; })
      .sort(U.desc('date'));
  };
  S.jobsOfVehicle = function (vehicleId) {
    return S.db.jobs.filter(function (j) { return j.vehicleId === vehicleId; })
      .sort(U.desc('date'));
  };

  S.servicePrice = function (service, size) {
    if (!service) return 0;
    var p = service.price || {};
    return U.n(p[size] !== undefined ? p[size] : p.Sedan);
  };

  /* ── job maths ─────────────────────────────────────────── */
  S.totals = function (job) {
    if (!job) return { sub: 0, discount: 0, tax: 0, total: 0, paid: 0, balance: 0 };
    var sub = U.sum(job.items, function (i) { return U.n(i.price) * (U.n(i.qty) || 1); });
    var discount = Math.min(U.n(job.discount), sub);
    var taxable = sub - discount;
    var taxPct = U.n(job.taxPct);
    var tax = U.round2(taxable * taxPct / 100);
    var total = U.round2(taxable + tax);
    var paid = U.sum(job.payments, function (p) { return p.amount; });
    return {
      sub: U.round2(sub), discount: U.round2(discount), taxable: U.round2(taxable),
      taxPct: taxPct, tax: tax, total: total,
      paid: U.round2(paid), balance: U.round2(total - paid)
    };
  };

  S.payStatus = function (job) {
    var t = S.totals(job);
    if (t.total <= 0) return 'No charge';
    if (t.balance <= 0.5) return 'Paid';
    if (t.paid > 0) return 'Part paid';
    return 'Unpaid';
  };

  S.isOpen = function (job) { return S.OPEN_STATUSES.indexOf(job.status) >= 0; };

  S.nextJobNo = function () {
    var s = S.db.settings;
    var no = s.jobPrefix + String(s.nextJobNo).padStart(4, '0');
    return no;
  };
  S.consumeJobNo = function () {
    S.db.settings.nextJobNo = U.n(S.db.settings.nextJobNo) + 1;
  };

  /* Warranty end date for a job item, if the service carries one. */
  S.itemWarrantyEnd = function (job, item) {
    var months = U.n(item.warrantyMonths);
    if (!months) return null;
    return U.addMonths(job.deliveredAt || job.date, months);
  };

  /* ── stock ─────────────────────────────────────────────── */
  S.moveStock = function (itemId, qty, reason, ref) {
    var it = S.item(itemId);
    if (!it) return;
    it.stock = U.round2(U.n(it.stock) + U.n(qty));
    S.db.stockMoves.push({
      id: U.uid('mv'), date: U.today(), itemId: itemId,
      qty: U.round2(qty), reason: reason || '', jobId: (ref && ref.jobId) || '',
      cost: U.round2(U.n(it.cost) * Math.abs(U.n(qty)))
    });
  };

  /* Deduct every material tied to the services on a job. Runs once. */
  S.consumeMaterials = function (job) {
    if (!job || job.materialsConsumed) return 0;
    var count = 0;
    job.items.forEach(function (line) {
      var sv = S.service(line.serviceId);
      if (!sv || !sv.materials) return;
      sv.materials.forEach(function (m) {
        if (!m.itemId || !U.n(m.qty)) return;
        S.moveStock(m.itemId, -U.n(m.qty) * (U.n(line.qty) || 1),
          'Used on ' + job.no, { jobId: job.id });
        count++;
      });
    });
    job.materialsConsumed = true;
    return count;
  };

  S.lowStock = function () {
    return S.db.inventory.filter(function (i) {
      return U.n(i.reorder) > 0 && U.n(i.stock) <= U.n(i.reorder);
    });
  };
  S.stockValue = function () {
    return U.sum(S.db.inventory, function (i) { return U.n(i.stock) * U.n(i.cost); });
  };

  /* ── money in / out ────────────────────────────────────── */
  S.paymentsIn = function (from, to) {
    var out = [];
    S.db.jobs.forEach(function (j) {
      j.payments.forEach(function (p) {
        if (from && p.date < from) return;
        if (to && p.date > to) return;
        out.push({ date: p.date, amount: U.n(p.amount), mode: p.mode, jobId: j.id, jobNo: j.no, customerId: j.customerId, note: p.note, id: p.id });
      });
    });
    return out.sort(U.desc('date'));
  };

  S.expensesIn = function (from, to) {
    return S.db.expenses.filter(function (e) {
      if (from && e.date < from) return false;
      if (to && e.date > to) return false;
      return true;
    }).sort(U.desc('date'));
  };

  S.jobsIn = function (from, to, opts) {
    opts = opts || {};
    return S.db.jobs.filter(function (j) {
      var d = opts.byDelivery ? (j.deliveredAt || j.date) : j.date;
      if (from && d < from) return false;
      if (to && d > to) return false;
      if (!opts.includeCancelled && j.status === 'Cancelled') return false;
      return true;
    });
  };

  /* Revenue is billed value of non-cancelled job cards in the window. */
  S.revenue = function (from, to) {
    return U.sum(S.jobsIn(from, to), function (j) { return S.totals(j).total; });
  };

  S.cashInHand = function () {
    var opening = U.n(S.db.settings.openingBalance);
    var received = U.sum(S.paymentsIn(), function (p) { return p.amount; });
    var spent = U.sum(S.db.expenses, function (e) { return e.amount; });
    return U.round2(opening + received - spent);
  };

  S.outstanding = function () {
    var rows = [];
    S.db.jobs.forEach(function (j) {
      if (j.status === 'Cancelled') return;
      var t = S.totals(j);
      if (t.balance > 0.5) rows.push({ job: j, balance: t.balance, total: t.total });
    });
    return rows.sort(U.desc('balance'));
  };

  /* ── feedback ──────────────────────────────────────────── */
  S.feedbackStats = function (list) {
    var fb = list || S.db.feedback;
    var dist = [0, 0, 0, 0, 0];
    var aspectTotals = {}, aspectCounts = {};
    S.ASPECTS.forEach(function (a) { aspectTotals[a.key] = 0; aspectCounts[a.key] = 0; });
    fb.forEach(function (f) {
      var r = Math.min(5, Math.max(1, Math.round(U.n(f.rating))));
      dist[r - 1]++;
      S.ASPECTS.forEach(function (a) {
        var v = U.n(f.aspects && f.aspects[a.key]);
        if (v > 0) { aspectTotals[a.key] += v; aspectCounts[a.key]++; }
      });
    });
    var count = fb.length;
    var avg = count ? U.sum(fb, function (f) { return f.rating; }) / count : 0;
    var promoters = dist[4], passives = dist[3];
    var detractors = dist[0] + dist[1] + dist[2];
    var aspects = S.ASPECTS.map(function (a) {
      return {
        key: a.key, label: a.label,
        avg: aspectCounts[a.key] ? aspectTotals[a.key] / aspectCounts[a.key] : 0
      };
    });
    return {
      count: count, avg: avg, dist: dist,
      promoters: promoters, passives: passives, detractors: detractors,
      satisfaction: count ? ((dist[3] + dist[4]) / count) * 100 : 0,
      nps: count ? Math.round(((promoters - detractors) / count) * 100) : 0,
      open: fb.filter(function (f) { return f.rating <= 3 && f.status !== 'resolved'; }).length,
      aspects: aspects
    };
  };

  S.staffRatings = function () {
    var map = {};
    S.db.feedback.forEach(function (f) {
      var job = S.job(f.jobId);
      var ids = [];
      if (f.staffId) ids.push(f.staffId);
      else if (job) job.items.forEach(function (i) { if (i.staffId) ids.push(i.staffId); });
      U.uniq(ids).forEach(function (id) {
        map[id] = map[id] || { staffId: id, total: 0, count: 0 };
        map[id].total += U.n(f.rating);
        map[id].count++;
      });
    });
    return Object.keys(map).map(function (k) {
      var m = map[k];
      return { staffId: k, name: S.staffName(k), avg: m.total / m.count, count: m.count };
    }).sort(function (a, b) { return b.avg - a.avg; });
  };

  /* Delivered jobs with no feedback yet — the "ask for review" list. */
  S.feedbackPending = function () {
    var have = {};
    S.db.feedback.forEach(function (f) { if (f.jobId) have[f.jobId] = true; });
    return S.db.jobs.filter(function (j) {
      return j.status === 'Delivered' && !have[j.id] &&
        U.daysBetween(j.deliveredAt || j.date, U.today()) >= 0;
    }).sort(U.desc('deliveredAt'));
  };

  /* ── staff performance ─────────────────────────────────── */
  S.staffStats = function (from, to) {
    var rows = S.db.staff.map(function (st) {
      return { staff: st, jobs: 0, revenue: 0, commission: 0 };
    });
    var index = {};
    rows.forEach(function (r) { index[r.staff.id] = r; });
    S.jobsIn(from, to).forEach(function (j) {
      var seen = {};
      j.items.forEach(function (i) {
        var r = index[i.staffId];
        if (!r) return;
        var value = U.n(i.price) * (U.n(i.qty) || 1);
        r.revenue += value;
        r.commission += value * U.n(r.staff.commissionPct) / 100;
        if (!seen[i.staffId]) { r.jobs++; seen[i.staffId] = true; }
      });
    });
    var ratings = {};
    S.staffRatings().forEach(function (r) { ratings[r.staffId] = r; });
    rows.forEach(function (r) {
      var rt = ratings[r.staff.id];
      r.rating = rt ? rt.avg : 0;
      r.ratingCount = rt ? rt.count : 0;
      r.commission = U.round2(r.commission);
      r.revenue = U.round2(r.revenue);
    });
    return rows.sort(function (a, b) { return b.revenue - a.revenue; });
  };

  /* ── follow-ups & reminders ────────────────────────────── */
  /* Four automatic sources plus anything added by hand:
     warranty expiry, repeat-service due, unpaid balance, ready-not-delivered. */
  S.reminders = function (horizonDays) {
    var horizon = horizonDays === undefined ? 30 : horizonDays;
    var today = U.today();
    var out = [];

    /* warranty running out (ceramic coating, PPF, paint) */
    S.db.jobs.forEach(function (j) {
      if (j.status === 'Cancelled') return;
      j.items.forEach(function (i) {
        var end = S.itemWarrantyEnd(j, i);
        if (!end) return;
        var left = U.daysBetween(today, end);
        if (left < -30 || left > horizon) return;
        out.push({
          kind: 'warranty', due: end, days: left,
          customerId: j.customerId, vehicleId: j.vehicleId, jobId: j.id,
          title: i.name + ' warranty ' + (left < 0 ? 'expired' : 'ends') + ' ' + U.relDay(end),
          detail: S.vehicleLabel(j.vehicleId) + ' · done ' + U.fmtDate(j.deliveredAt || j.date)
        });
      });
    });

    /* repeat services due (wash every 15 days, detailing every 120…) */
    var lastByPair = {};
    S.db.jobs.forEach(function (j) {
      if (j.status === 'Cancelled' || !j.vehicleId) return;
      j.items.forEach(function (i) {
        var sv = S.service(i.serviceId);
        if (!sv || !U.n(sv.repeatDays)) return;
        var key = j.vehicleId + '|' + sv.id;
        var d = j.deliveredAt || j.date;
        if (!lastByPair[key] || lastByPair[key].date < d) {
          lastByPair[key] = { date: d, job: j, service: sv };
        }
      });
    });
    Object.keys(lastByPair).forEach(function (k) {
      var e = lastByPair[k];
      var due = U.addDays(e.date, U.n(e.service.repeatDays));
      var left = U.daysBetween(today, due);
      if (left > horizon || left < -120) return;
      out.push({
        kind: 'service-due', due: due, days: left,
        customerId: e.job.customerId, vehicleId: e.job.vehicleId, jobId: e.job.id,
        title: e.service.name + ' due ' + U.relDay(due),
        detail: S.vehicleLabel(e.job.vehicleId) + ' · last on ' + U.fmtDate(e.date)
      });
    });

    /* money still to collect */
    S.outstanding().forEach(function (o) {
      out.push({
        kind: 'payment', due: o.job.deliveredAt || o.job.date,
        days: U.daysBetween(today, o.job.deliveredAt || o.job.date),
        customerId: o.job.customerId, vehicleId: o.job.vehicleId, jobId: o.job.id,
        title: U.money(o.balance) + ' pending on ' + o.job.no,
        detail: S.vehicleLabel(o.job.vehicleId) + ' · ' + o.job.status
      });
    });

    /* finished but still parked in the yard */
    S.db.jobs.forEach(function (j) {
      if (j.status !== 'Ready') return;
      out.push({
        kind: 'delivery', due: j.promisedDate || j.date,
        days: U.daysBetween(today, j.promisedDate || j.date),
        customerId: j.customerId, vehicleId: j.vehicleId, jobId: j.id,
        title: 'Ready for delivery — ' + j.no,
        detail: S.vehicleLabel(j.vehicleId) + ' · waiting since ' + U.fmtDate(j.readyAt || j.date)
      });
    });

    /* manual follow-ups */
    S.db.followups.filter(function (f) { return !f.done; }).forEach(function (f) {
      out.push({
        kind: 'manual', due: f.date, days: U.daysBetween(today, f.date),
        customerId: f.customerId, vehicleId: '', jobId: '',
        title: f.note, detail: 'Added ' + U.fmtDate(f.createdAt || f.date), followupId: f.id
      });
    });

    return out.sort(function (a, b) { return a.days - b.days; });
  };

  /* ── customer value ────────────────────────────────────── */
  S.customerStats = function (customerId) {
    var jobs = S.jobsOfCustomer(customerId).filter(function (j) { return j.status !== 'Cancelled'; });
    var spend = U.sum(jobs, function (j) { return S.totals(j).total; });
    var due = U.sum(jobs, function (j) { return Math.max(0, S.totals(j).balance); });
    var fb = S.db.feedback.filter(function (f) { return f.customerId === customerId; });
    return {
      visits: jobs.length,
      spend: U.round2(spend),
      due: U.round2(due),
      last: jobs.length ? jobs[0].date : '',
      avgTicket: jobs.length ? U.round2(spend / jobs.length) : 0,
      rating: fb.length ? U.sum(fb, function (f) { return f.rating; }) / fb.length : 0,
      feedbackCount: fb.length
    };
  };

  /* ── sample data ───────────────────────────────────────── */
  S.seed = function () {
    var db = emptyDB();
    db.seeded = true;
    db.settings.phone = '0300-1234567';
    db.settings.address = 'Main Boulevard, near Ring Road';
    db.settings.openingBalance = 25000;

    var staffSeed = [
      ['Imran Ali', 'Detailer', 8], ['Bilal Ahmed', 'Washer', 5],
      ['Kashif Raza', 'Painter', 10], ['Naveed Iqbal', 'Coating specialist', 12],
      ['Sohail Khan', 'PPF installer', 12], ['Adnan Shah', 'Service technician', 7]
    ];
    db.staff = staffSeed.map(function (s) {
      return {
        id: U.uid('st'), name: s[0], role: s[1], phone: '03' + (10 + Math.floor(Math.random() * 89)) + '-' + (1000000 + Math.floor(Math.random() * 8999999)),
        commissionPct: s[2], joinedAt: U.addDays(U.today(), -400 - Math.floor(Math.random() * 500)),
        active: true, salary: 35000 + Math.floor(Math.random() * 5) * 5000
      };
    });

    var custSeed = [
      ['Ahmed Raza', '0301-2345678', 'Toyota', 'Corolla', 'Sedan', 'White'],
      ['Fatima Noor', '0302-3456789', 'Honda', 'Civic', 'Sedan', 'Black'],
      ['Usman Tariq', '0303-4567890', 'Suzuki', 'Cultus', 'Hatchback', 'Silver'],
      ['Hina Malik', '0304-5678901', 'Toyota', 'Fortuner', 'SUV', 'Grey'],
      ['Zeeshan Akram', '0305-6789012', 'Kia', 'Sportage', 'SUV', 'White'],
      ['Sana Javed', '0306-7890123', 'Suzuki', 'Alto', 'Hatchback', 'Red'],
      ['Rehan Sheikh', '0307-8901234', 'Mercedes', 'C200', 'Luxury', 'Black'],
      ['Ali Hamza', '0308-9012345', 'Honda', 'City', 'Sedan', 'Blue'],
      ['Nadia Aslam', '0309-0123456', 'Hyundai', 'Tucson', 'SUV', 'White'],
      ['Faisal Mehmood', '0311-1234567', 'Toyota', 'Yaris', 'Sedan', 'Silver'],
      ['Ayesha Siddiqui', '0312-2345678', 'Suzuki', 'Swift', 'Hatchback', 'Blue'],
      ['Kamran Butt', '0313-3456789', 'BMW', '520i', 'Luxury', 'Black'],
      ['Sadia Anwar', '0314-4567890', 'Honda', 'BR-V', 'SUV', 'Grey'],
      ['Tahir Nawaz', '0315-5678901', 'Suzuki', 'Wagon R', 'Hatchback', 'White']
    ];
    var regionCodes = ['LEA', 'LEB', 'ABC', 'RIY', 'AGH'];
    custSeed.forEach(function (c, idx) {
      var cust = {
        id: U.uid('cu'), name: c[0], phone: c[1], email: '', address: '',
        createdAt: U.addDays(U.today(), -300 + idx * 8), notes: '',
        source: ['Walk-in', 'Reference', 'Facebook', 'Google'][idx % 4]
      };
      db.customers.push(cust);
      db.vehicles.push({
        id: U.uid('vh'), customerId: cust.id,
        reg: regionCodes[idx % regionCodes.length] + '-' + (1000 + Math.floor(Math.random() * 8999)),
        make: c[2], model: c[3], size: c[4], color: c[5],
        year: 2015 + (idx % 9), odometer: 20000 + idx * 4500, vin: ''
      });
    });

    /* eighty job cards spread over the last ninety days */
    var pickSvc = function (group) {
      var list = db.services.filter(function (s) { return s.group === group; });
      return list[Math.floor(Math.random() * list.length)];
    };
    var groups = ['Washing', 'Washing', 'Washing', 'Detailing', 'Rubbing',
      'Dry cleaning', 'Ceramic coating', 'PPF', 'Painting', 'Service'];
    var comments = [
      'Car looks brand new, very happy with the shine.',
      'Good work but delivery was two hours late.',
      'Coating finish is excellent, will come again.',
      'Interior smells fresh now. Team was polite.',
      'Price is a bit high compared to others.',
      'Swirl marks removed properly, worth the money.',
      'Staff handled the car carefully. Recommended.',
      'Wash was fine but door jambs were left wet.',
      'PPF installation is clean, no bubbles at all.',
      'Paint match is perfect, cannot tell it was repaired.',
      'Waited long even after booking a slot.',
      'Best detailing service in the area.'
    ];

    for (var d = 90; d >= 0; d--) {
      var date = U.addDays(U.today(), -d);
      var perDay = 1 + Math.floor(Math.random() * 3);
      for (var k = 0; k < perDay; k++) {
        var ci = Math.floor(Math.random() * db.customers.length);
        var cust2 = db.customers[ci];
        var veh = db.vehicles.filter(function (v) { return v.customerId === cust2.id; })[0];
        var lines = [];
        var count = 1 + (Math.random() < 0.35 ? 1 : 0);
        for (var li = 0; li < count; li++) {
          var sv = pickSvc(groups[Math.floor(Math.random() * groups.length)]);
          if (!sv || lines.some(function (l) { return l.serviceId === sv.id; })) continue;
          var st = db.staff[Math.floor(Math.random() * db.staff.length)];
          lines.push({
            id: U.uid('ln'), serviceId: sv.id, name: sv.name,
            price: S.servicePrice(sv, veh.size), qty: 1,
            staffId: st.id, warrantyMonths: sv.warrantyMonths
          });
        }
        if (!lines.length) continue;

        var status = d === 0 ? ['Received', 'In Progress', 'Ready'][Math.floor(Math.random() * 3)]
          : d <= 2 && Math.random() < 0.35 ? ['In Progress', 'Ready'][Math.floor(Math.random() * 2)]
            : 'Delivered';
        var job = {
          id: U.uid('jb'), no: db.settings.jobPrefix + String(db.settings.nextJobNo).padStart(4, '0'),
          date: date, customerId: cust2.id, vehicleId: veh.id,
          status: status,
          bay: db.settings.bays[Math.floor(Math.random() * db.settings.bays.length)],
          promisedDate: date, promisedTime: ['12:00', '15:00', '17:30', '19:00'][Math.floor(Math.random() * 4)],
          items: lines, discount: Math.random() < 0.2 ? 500 : 0,
          taxPct: 0, notes: '', odometer: veh.odometer, fuel: ['E', '1/4', '1/2', '3/4', 'F'][Math.floor(Math.random() * 5)],
          payments: [], createdAt: date, materialsConsumed: false,
          intake: { scratches: Math.random() < 0.3, dents: Math.random() < 0.2, spare: true, tools: true, stereo: true, mats: true }
        };
        db.settings.nextJobNo++;

        var tot = S.totals(job);
        if (status === 'Delivered') {
          job.deliveredAt = date;
          job.readyAt = date;
          var payAll = Math.random() < 0.85;
          job.payments.push({
            id: U.uid('py'), date: date,
            amount: payAll ? tot.total : Math.round(tot.total * 0.5),
            mode: ['Cash', 'Cash', 'UPI / Wallet', 'Bank transfer', 'Card'][Math.floor(Math.random() * 5)],
            note: payAll ? 'Full payment' : 'Advance'
          });
        } else if (Math.random() < 0.4) {
          job.payments.push({
            id: U.uid('py'), date: date, amount: Math.round(tot.total * 0.3),
            mode: 'Cash', note: 'Advance'
          });
        }
        db.jobs.push(job);

        /* feedback on roughly half of the delivered cards */
        if (status === 'Delivered' && Math.random() < 0.5) {
          var rating = Math.random() < 0.62 ? 5 : Math.random() < 0.7 ? 4 : Math.random() < 0.6 ? 3 : Math.random() < 0.6 ? 2 : 1;
          var jitter = function () { return Math.max(1, Math.min(5, rating + (Math.random() < 0.25 ? (Math.random() < 0.5 ? -1 : 1) : 0))); };
          db.feedback.push({
            id: U.uid('fb'), date: U.addDays(date, 1), jobId: job.id,
            customerId: cust2.id, staffId: lines[0].staffId,
            rating: rating,
            aspects: { quality: jitter(), time: jitter(), staff: jitter(), value: jitter() },
            comment: comments[Math.floor(Math.random() * comments.length)],
            recommend: rating >= 4,
            source: Math.random() < 0.6 ? 'form' : 'staff',
            status: rating <= 3 && Math.random() < 0.5 ? 'new' : 'resolved',
            reply: ''
          });
        }
      }
    }

    /* running expenses */
    var expSeed = [
      ['Salary & wages', 210000, 1], ['Rent', 120000, 1], ['Electricity & water', 28000, 1],
      ['Materials & consumables', 18000, 6], ['Marketing', 6000, 2],
      ['Tea & food', 1500, 12], ['Maintenance', 9000, 2], ['Transport', 2500, 6]
    ];
    for (var m = 2; m >= 0; m--) {
      var monthBase = U.addMonths(U.today(), -m);
      expSeed.forEach(function (e) {
        for (var t = 0; t < e[2]; t++) {
          var day = 1 + Math.floor(Math.random() * 27);
          var dt = U.monthKey(monthBase) + '-' + String(day).padStart(2, '0');
          if (dt > U.today()) continue;
          db.expenses.push({
            id: U.uid('ex'), date: dt, category: e[0],
            amount: Math.round(e[1] / e[2] * (0.85 + Math.random() * 0.3)),
            mode: 'Cash', note: '', staffId: ''
          });
        }
      });
    }

    /* a few upcoming bookings */
    for (var b = 0; b < 7; b++) {
      var bc = db.customers[Math.floor(Math.random() * db.customers.length)];
      var bv = db.vehicles.filter(function (v) { return v.customerId === bc.id; })[0];
      var bsv = db.services[Math.floor(Math.random() * db.services.length)];
      db.appointments.push({
        id: U.uid('ap'), date: U.addDays(U.today(), Math.floor(Math.random() * 6)),
        time: ['09:00', '10:30', '12:00', '14:00', '16:00'][Math.floor(Math.random() * 5)],
        customerId: bc.id, name: bc.name, phone: bc.phone,
        vehicle: bv ? bv.reg + ' ' + bv.make + ' ' + bv.model : '',
        vehicleId: bv ? bv.id : '', serviceIds: [bsv.id],
        bay: db.settings.bays[Math.floor(Math.random() * db.settings.bays.length)],
        staffId: db.staff[Math.floor(Math.random() * db.staff.length)].id,
        status: 'Booked', note: ''
      });
    }

    /* link a couple of materials so stock movement is demonstrable */
    var byName = {};
    db.inventory.forEach(function (i) { byName[i.name] = i.id; });
    db.services.forEach(function (sv) {
      if (sv.group === 'Washing') sv.materials = [{ itemId: byName['Car shampoo'], qty: 0.2 }, { itemId: byName['Microfiber cloth'], qty: 0.5 }];
      if (sv.group === 'Ceramic coating') sv.materials = [{ itemId: byName['Ceramic coating 9H'], qty: 30 }, { itemId: byName['IPA / degreaser'], qty: 0.3 }];
      if (sv.group === 'Rubbing') sv.materials = [{ itemId: byName['Rubbing compound'], qty: 0.3 }, { itemId: byName['Polish / wax'], qty: 0.2 }];
      if (sv.group === 'PPF') sv.materials = [{ itemId: byName['PPF film roll'], qty: 60 }];
      if (sv.group === 'Dry cleaning') sv.materials = [{ itemId: byName['Interior cleaner'], qty: 0.5 }];
    });

    db.followups.push({
      id: U.uid('fu'), date: U.addDays(U.today(), 2),
      customerId: db.customers[0].id, note: 'Call about ceramic coating package offer',
      done: false, createdAt: U.today()
    });

    S.db = db;
    S.save(true);
  };

  global.S = S;
})(window);

/* ============================================================
   3M Detailing — dashboard
   The one screen the owner keeps open: money, vehicles on the
   floor, today's bookings, ratings, stock warnings.
   ============================================================ */
(function (global) {
  'use strict';

  var Dash = {};
  var range = '30';

  function bounds() {
    var to = U.today();
    if (range === 'today') return { from: to, to: to, label: 'today' };
    if (range === '7') return { from: U.addDays(to, -6), to: to, label: 'last 7 days' };
    if (range === 'month') return { from: U.monthStart(), to: to, label: U.fmtMonth(U.monthKey(to)) };
    if (range === 'all') return { from: '', to: '', label: 'all time' };
    return { from: U.addDays(to, -29), to: to, label: 'last 30 days' };
  }

  Dash.render = function (host) {
    var b = bounds();
    var jobs = S.jobsIn(b.from, b.to);
    var revenue = U.sum(jobs, function (j) { return S.totals(j).total; });
    var collected = U.sum(S.paymentsIn(b.from, b.to), function (p) { return p.amount; });
    var expenses = U.sum(S.expensesIn(b.from, b.to), function (e) { return e.amount; });
    var profit = revenue - expenses;
    var inShop = S.db.jobs.filter(S.isOpen);
    var ready = S.db.jobs.filter(function (j) { return j.status === 'Ready'; });
    var outstanding = S.outstanding();
    var duesTotal = U.sum(outstanding, function (o) { return o.balance; });
    var fbStats = S.feedbackStats();
    var low = S.lowStock();
    var todayJobs = S.jobsIn(U.today(), U.today());
    var todayCollected = U.sum(S.paymentsIn(U.today(), U.today()), function (p) { return p.amount; });
    var bookingsToday = S.db.appointments.filter(function (a) {
      return a.date === U.today() && a.status !== 'Cancelled';
    }).sort(U.by('time'));
    var dueReminders = S.reminders(7).filter(function (r) { return r.days <= 3; });

    host.innerHTML = U.html`
      ${U.raw(App.page(S.db.settings.workshopName,
        S.db.settings.tagline,
        U.html`<button class="btn ghost" type="button" id="qBooking">+ Booking</button>
               <button class="btn ghost" type="button" id="qExpense">+ Expense</button>
               <button class="btn ghost" type="button" id="qFeedback">+ Feedback</button>
               <button class="btn primary" type="button" id="qJob">+ Job card</button>`))}

      <div class="range-row">
        ${U.raw(['today', '7', '30', 'month', 'all'].map(function (r) {
          var label = { today: 'Today', '7': '7 days', '30': '30 days', month: 'This month', all: 'All time' }[r];
          return U.html`<button class="btn ghost sm ${U.raw(range === r ? 'is-on' : '')}" type="button" data-range="${r}">${label}</button>`;
        }).join(''))}
        <span class="muted sm">Showing ${b.label}</span>
      </div>

      <div class="tiles">
        ${U.raw(App.tile('Revenue billed', U.money(revenue), jobs.length + ' job cards', 'in'))}
        ${U.raw(App.tile('Cash collected', U.money(collected), 'payments received', 'in'))}
        ${U.raw(App.tile('Expenses', U.money(expenses), 'shop running cost', 'out'))}
        ${U.raw(App.tile(profit >= 0 ? 'Gross profit' : 'Loss', U.money(profit),
          revenue > 0 ? Math.round(profit / revenue * 100) + '% margin' : '—', profit >= 0 ? 'good' : 'bad'))}
        ${U.raw(App.tile('In workshop', String(inShop.length), ready.length + ' ready for delivery', 'work'))}
        ${U.raw(App.tile('Pending payments', U.money(duesTotal), outstanding.length + ' job cards', duesTotal > 0 ? 'bad' : 'good'))}
        ${U.raw(App.tile('Customer rating', fbStats.count ? fbStats.avg.toFixed(1) + ' ★' : '—',
          fbStats.count ? fbStats.count + ' reviews · ' + Math.round(fbStats.satisfaction) + '% happy' : 'no feedback yet', 'star'))}
        ${U.raw(App.tile('Cash in hand', U.money(S.cashInHand()), 'opening + received − spent', 'cash'))}
      </div>

      <div class="cols">
        <section class="card">
          <div class="card-head"><h2>Daily collection — last 14 days</h2>
            <span class="muted sm">bars: billed · line total ${U.raw(U.money(U.sum(last14(), function (d) { return d.value; })))}</span></div>
          ${U.raw(U.barChart(last14(), { height: 40, title: 'Daily billing' }))}
        </section>
        <section class="card">
          <div class="card-head"><h2>Revenue by service</h2><span class="muted sm">${b.label}</span></div>
          ${U.raw(U.shareBars(revenueByGroup(jobs)))}
        </section>
      </div>

      <div class="cols">
        <section class="card">
          <div class="card-head"><h2>Vehicles in the workshop</h2>
            <button class="linkbtn" type="button" data-nav="jobs">Open job cards</button></div>
          ${U.raw(inShop.length ? U.html`<div class="table-scroll"><table class="tight">
            <thead><tr><th>Job</th><th>Vehicle</th><th>Customer</th><th>Bay</th><th>Status</th><th>Promised</th></tr></thead>
            <tbody>${U.raw(inShop.sort(U.by('promisedDate')).map(function (j) {
              var late = j.promisedDate && j.promisedDate < U.today();
              return U.html`<tr class="clickable" data-job="${j.id}">
                <td class="nowrap"><strong>${j.no}</strong></td>
                <td class="nowrap">${S.vehicleLabel(j.vehicleId)}</td>
                <td>${S.customerName(j.customerId)}</td>
                <td class="muted sm">${j.bay || '—'}</td>
                <td>${U.raw(App.statusChip(j.status))}</td>
                <td class="sm ${U.raw(late ? 'is-due' : 'muted')}">${U.raw(U.fmtDateShort(j.promisedDate) + ' ' + U.fmtTime(j.promisedTime))}${U.raw(late ? ' · late' : '')}</td>
              </tr>`;
            }).join(''))}</tbody></table></div>` : App.empty('No vehicles in the workshop right now.'))}
        </section>

        <section class="card">
          <div class="card-head"><h2>Today's bookings</h2>
            <button class="linkbtn" type="button" data-nav="bookings">All bookings</button></div>
          ${U.raw(bookingsToday.length ? U.html`<ul class="list">
            ${U.raw(bookingsToday.map(function (a) {
              return U.html`<li>
                <span class="list-lead">${U.raw(U.fmtTime(a.time))} · ${a.name || S.customerName(a.customerId)}</span>
                <span class="muted sm">${a.vehicle || S.vehicleLabel(a.vehicleId)} · ${a.serviceIds.map(function (s) {
                  var sv = S.service(s); return sv ? sv.name : '';
                }).filter(Boolean).join(', ')}</span>
                <span class="chip chip-soft">${a.status}</span>
              </li>`;
            }).join(''))}</ul>` : App.empty('No bookings for today.'))}
        </section>
      </div>

      <div class="cols">
        <section class="card">
          <div class="card-head"><h2>Needs a call today</h2>
            <button class="linkbtn" type="button" data-nav="followups">All follow-ups</button></div>
          ${U.raw(dueReminders.length ? U.html`<ul class="list">
            ${U.raw(dueReminders.slice(0, 8).map(function (r) {
              return U.html`<li>
                <span class="list-lead">${r.title}</span>
                <span class="muted sm">${S.customerName(r.customerId)} · ${r.detail}</span>
                <span class="chip ${U.raw(r.days < 0 ? 'chip-unpaid' : 'chip-soft')}">${U.raw(r.days < 0 ? 'overdue' : U.relDay(r.due))}</span>
              </li>`;
            }).join(''))}</ul>` : App.empty('Nothing pending — all caught up.'))}
        </section>

        <section class="card">
          <div class="card-head"><h2>Latest feedback</h2>
            <button class="linkbtn" type="button" data-nav="feedback">Feedback centre</button></div>
          ${U.raw(S.db.feedback.length ? U.html`<ul class="list">
            ${U.raw(S.db.feedback.slice().sort(U.desc('date')).slice(0, 5).map(function (f) {
              return U.html`<li>
                <span class="list-lead">${U.raw(U.stars(f.rating))} ${S.customerName(f.customerId)}</span>
                <span class="muted sm">${f.comment || 'No comment'}</span>
                <span class="muted sm nowrap">${U.raw(U.fmtDateShort(f.date))}</span>
              </li>`;
            }).join(''))}</ul>` : App.empty('No feedback collected yet.',
              U.html`<button class="btn ghost sm" type="button" data-nav="feedback">Collect feedback</button>`))}
        </section>
      </div>

      ${U.raw(low.length ? U.html`
      <section class="card alert-card">
        <div class="card-head"><h2>⚠︎ Low stock</h2>
          <button class="linkbtn" type="button" data-nav="inventory">Open inventory</button></div>
        <p class="sm">${U.raw(low.map(function (i) {
          return U.html`<span class="chip chip-unpaid">${i.name}: ${U.raw(U.numFmt(i.stock))} ${i.unit}</span>`;
        }).join(' '))}</p>
      </section>` : '')}

      <section class="card">
        <div class="card-head"><h2>Today at a glance</h2><span class="muted sm">${U.raw(U.fmtDate(U.today()))}</span></div>
        <div class="mini-tiles">
          <div><span class="muted sm">Job cards today</span><strong>${U.raw(String(todayJobs.length))}</strong></div>
          <div><span class="muted sm">Billed today</span><strong>${U.raw(U.money(U.sum(todayJobs, function (j) { return S.totals(j).total; })))}</strong></div>
          <div><span class="muted sm">Collected today</span><strong>${U.raw(U.money(todayCollected))}</strong></div>
          <div><span class="muted sm">Delivered today</span><strong>${U.raw(String(S.db.jobs.filter(function (j) { return j.deliveredAt === U.today(); }).length))}</strong></div>
          <div><span class="muted sm">Open complaints</span><strong>${U.raw(String(fbStats.open))}</strong></div>
          <div><span class="muted sm">Stock value</span><strong>${U.raw(U.money(S.stockValue()))}</strong></div>
        </div>
      </section>`;

    U.$$('[data-range]', host).forEach(function (b2) {
      b2.addEventListener('click', function () { range = this.dataset.range; App.render(); });
    });
    U.$$('[data-job]', host).forEach(function (el) {
      el.addEventListener('click', function () { Jobs.openJob(this.dataset.job); });
    });
    U.$('#qJob', host).addEventListener('click', function () { Jobs.openEditor(null); });
    U.$('#qBooking', host).addEventListener('click', function () { Bookings.openEditor(null); });
    U.$('#qExpense', host).addEventListener('click', function () { Accounts.expenseDialog(null); });
    U.$('#qFeedback', host).addEventListener('click', function () { Feedback.openForm({}); });
  };

  function last14() {
    var out = [];
    for (var i = 13; i >= 0; i--) {
      var d = U.addDays(U.today(), -i);
      var jobs = S.jobsIn(d, d);
      out.push({
        label: U.fmtDateShort(d), short: U.parse(d).getDate(),
        value: U.sum(jobs, function (j) { return S.totals(j).total; })
      });
    }
    return out;
  }

  function revenueByGroup(jobs) {
    var map = {};
    jobs.forEach(function (j) {
      j.items.forEach(function (i) {
        var sv = S.service(i.serviceId);
        var g = sv ? (sv.group || 'Other') : 'Other';
        map[g] = (map[g] || 0) + U.n(i.price) * (U.n(i.qty) || 1);
      });
    });
    return Object.keys(map).map(function (k) { return { label: k, value: map[k] }; })
      .sort(function (a, b) { return b.value - a.value; });
  }

  App.register('dashboard', Dash);
  global.Dash = Dash;
})(window);

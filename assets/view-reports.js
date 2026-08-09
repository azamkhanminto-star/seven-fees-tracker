/* ============================================================
   3M Detailing — reports
   Which service earns, which technician performs, who the best
   customers are, and how the months compare.
   ============================================================ */
(function (global) {
  'use strict';

  var Reports = {};
  var from = U.addDays(U.today(), -89), to = U.today();

  Reports.render = function (host) {
    var jobs = S.jobsIn(from, to);
    var billed = U.sum(jobs, function (j) { return S.totals(j).total; });
    var collected = U.sum(S.paymentsIn(from, to), function (p) { return p.amount; });
    var expenses = U.sum(S.expensesIn(from, to), function (e) { return e.amount; });
    var profit = billed - expenses;
    var vehicles = U.uniq(jobs.map(function (j) { return j.vehicleId; })).filter(Boolean).length;
    var avgTicket = jobs.length ? billed / jobs.length : 0;

    var svcRows = serviceRows(jobs);
    var staffRows = S.staffStats(from, to);
    var custRows = customerRows(jobs);

    host.innerHTML = U.html`
      ${U.raw(App.page('Reports', U.fmtDate(from) + ' to ' + U.fmtDate(to),
        U.html`<button class="btn ghost" type="button" id="printRep">Print summary</button>
               <button class="btn ghost" type="button" id="exportRep">Export CSV</button>`))}

      <div class="filterbar card">
        <label class="inline">From <input type="date" id="rFrom" value="${from}"></label>
        <label class="inline">To <input type="date" id="rTo" value="${to}"></label>
        ${U.raw([['30', '30 days'], ['90', '90 days'], ['month', 'This month'], ['year', 'This year'], ['all', 'All time']]
          .map(function (p) {
            return U.html`<button class="btn ghost sm" type="button" data-preset="${p[0]}">${p[1]}</button>`;
          }).join(''))}
      </div>

      <div class="tiles">
        ${U.raw(App.tile('Billed', U.money(billed), jobs.length + ' job cards', 'in'))}
        ${U.raw(App.tile('Collected', U.money(collected), 'cash actually received', 'in'))}
        ${U.raw(App.tile('Expenses', U.money(expenses), 'running cost', 'out'))}
        ${U.raw(App.tile('Gross profit', U.money(profit),
          billed ? Math.round(profit / billed * 100) + '% margin' : '—', profit >= 0 ? 'good' : 'bad'))}
        ${U.raw(App.tile('Average ticket', U.money(avgTicket), vehicles + ' unique vehicles', 'work'))}
        ${U.raw(App.tile('Cars per day', jobs.length ? (jobs.length / Math.max(1, U.daysBetween(from, to) + 1)).toFixed(1) : '0',
          'over ' + (U.daysBetween(from, to) + 1) + ' days', 'work'))}
      </div>

      <section class="card">
        <div class="card-head"><h2>Month by month</h2><span class="muted sm">billed vs expenses, last 12 months</span></div>
        ${U.raw(U.barChart(monthly(), { height: 40 }))}
        <div class="legend sm">
          <span><i class="sw sw1"></i> Billed</span>
          <span><i class="sw sw2"></i> Expenses</span>
        </div>
      </section>

      <div class="cols">
        <section class="card">
          <div class="card-head"><h2>Revenue by service group</h2></div>
          ${U.raw(U.shareBars(groupRows(jobs)))}
        </section>
        <section class="card">
          <div class="card-head"><h2>Revenue by vehicle size</h2></div>
          ${U.raw(U.shareBars(sizeRows(jobs)))}
        </section>
      </div>

      <section class="card">
        <div class="card-head"><h2>Service performance</h2><span class="muted sm">${svcRows.length} services sold</span></div>
        ${U.raw(svcRows.length ? U.html`<div class="table-scroll"><table>
          <thead><tr><th>Service</th><th>Group</th><th class="num">Times sold</th><th class="num">Revenue</th>
            <th class="num">Average price</th><th class="num">Share</th></tr></thead>
          <tbody>${U.raw(svcRows.map(function (r) {
            return U.html`<tr>
              <td><strong>${r.name}</strong></td>
              <td class="muted sm">${r.group}</td>
              <td class="num">${U.raw(String(r.count))}</td>
              <td class="num">${U.raw(U.money(r.revenue))}</td>
              <td class="num">${U.raw(U.money(r.revenue / r.count))}</td>
              <td class="num muted">${U.raw(billed ? Math.round(r.revenue / billed * 100) + '%' : '—')}</td>
            </tr>`;
          }).join(''))}</tbody>
        </table></div>` : App.empty('No services sold in this period.'))}
      </section>

      <div class="cols">
        <section class="card">
          <div class="card-head"><h2>Technician performance</h2></div>
          ${U.raw(staffRows.length ? U.html`<div class="table-scroll"><table class="tight">
            <thead><tr><th>Name</th><th>Role</th><th class="num">Jobs</th><th class="num">Revenue</th>
              <th class="num">Commission</th><th>Rating</th></tr></thead>
            <tbody>${U.raw(staffRows.map(function (r) {
              return U.html`<tr>
                <td><strong>${r.staff.name}</strong></td>
                <td class="muted sm">${r.staff.role}</td>
                <td class="num">${U.raw(String(r.jobs))}</td>
                <td class="num">${U.raw(U.money(r.revenue))}</td>
                <td class="num">${U.raw(U.money(r.commission))}</td>
                <td>${U.raw(r.ratingCount ? U.stars(r.rating) + ' <span class="muted sm">' + r.ratingCount + '</span>' : '<span class="muted sm">—</span>')}</td>
              </tr>`;
            }).join(''))}</tbody>
          </table></div>` : App.empty('Add technicians in Setup to track performance.'))}
        </section>

        <section class="card">
          <div class="card-head"><h2>Top customers</h2><span class="muted sm">by spend in period</span></div>
          ${U.raw(custRows.length ? U.html`<div class="table-scroll"><table class="tight">
            <thead><tr><th>Customer</th><th class="num">Visits</th><th class="num">Spend</th><th class="num">Average</th></tr></thead>
            <tbody>${U.raw(custRows.slice(0, 12).map(function (r) {
              return U.html`<tr class="clickable" data-cust="${r.id}">
                <td>${r.name}</td>
                <td class="num">${U.raw(String(r.visits))}</td>
                <td class="num">${U.raw(U.money(r.spend))}</td>
                <td class="num">${U.raw(U.money(r.spend / r.visits))}</td>
              </tr>`;
            }).join(''))}</tbody>
          </table></div>` : App.empty('No customers in this period.'))}
        </section>
      </div>

      <div class="cols">
        <section class="card">
          <div class="card-head"><h2>Busiest days</h2><span class="muted sm">job cards by weekday</span></div>
          ${U.raw(U.shareBars(weekdayRows(jobs), { raw: true }))}
        </section>
        <section class="card">
          <div class="card-head"><h2>New vs repeat</h2></div>
          ${U.raw(U.shareBars(newVsRepeat(jobs), { raw: true }))}
          <p class="muted sm">Repeat business is the cheapest business — chase the follow-up list to grow it.</p>
        </section>
      </div>`;

    U.$('#rFrom', host).addEventListener('change', function () { from = this.value; App.render(); });
    U.$('#rTo', host).addEventListener('change', function () { to = this.value; App.render(); });
    U.$$('[data-preset]', host).forEach(function (b) {
      b.addEventListener('click', function () {
        var p = this.dataset.preset;
        to = U.today();
        if (p === '30') from = U.addDays(to, -29);
        else if (p === '90') from = U.addDays(to, -89);
        else if (p === 'month') from = U.monthStart();
        else if (p === 'year') from = U.today().slice(0, 4) + '-01-01';
        else {
          var dates = S.db.jobs.map(function (j) { return j.date; }).sort();
          from = dates[0] || U.today();
        }
        App.render();
      });
    });
    U.$$('[data-cust]', host).forEach(function (el) {
      el.addEventListener('click', function () { Customers.openCustomer(this.dataset.cust); });
    });
    U.$('#exportRep', host).addEventListener('click', function () {
      var rows = [['Report', from + ' to ' + to], [],
        ['Summary'], ['Billed', billed], ['Collected', collected], ['Expenses', expenses], ['Profit', profit], [],
        ['Service', 'Group', 'Times sold', 'Revenue']];
      svcRows.forEach(function (r) { rows.push([r.name, r.group, r.count, r.revenue]); });
      rows.push([], ['Technician', 'Role', 'Jobs', 'Revenue', 'Commission', 'Rating']);
      staffRows.forEach(function (r) {
        rows.push([r.staff.name, r.staff.role, r.jobs, r.revenue, r.commission, r.ratingCount ? r.rating.toFixed(1) : '']);
      });
      rows.push([], ['Customer', 'Visits', 'Spend']);
      custRows.forEach(function (r) { rows.push([r.name, r.visits, r.spend]); });
      U.csv('report-' + from + '-to-' + to + '.csv', rows);
    });
    U.$('#printRep', host).addEventListener('click', function () {
      printReport({ billed: billed, collected: collected, expenses: expenses, profit: profit, jobs: jobs.length },
        svcRows, staffRows, custRows);
    });
  };

  function serviceRows(jobs) {
    var map = {};
    jobs.forEach(function (j) {
      j.items.forEach(function (i) {
        var sv = S.service(i.serviceId);
        var key = sv ? sv.id : ('x_' + i.name);
        map[key] = map[key] || { name: i.name, group: sv ? sv.group : 'Other', count: 0, revenue: 0 };
        map[key].count += U.n(i.qty) || 1;
        map[key].revenue += U.n(i.price) * (U.n(i.qty) || 1);
      });
    });
    return Object.keys(map).map(function (k) { return map[k]; })
      .sort(function (a, b) { return b.revenue - a.revenue; });
  }

  function groupRows(jobs) {
    var map = {};
    jobs.forEach(function (j) {
      j.items.forEach(function (i) {
        var sv = S.service(i.serviceId);
        var g = sv ? sv.group : 'Other';
        map[g] = (map[g] || 0) + U.n(i.price) * (U.n(i.qty) || 1);
      });
    });
    return Object.keys(map).map(function (k) { return { label: k, value: map[k] }; })
      .sort(function (a, b) { return b.value - a.value; });
  }

  function sizeRows(jobs) {
    var map = {};
    jobs.forEach(function (j) {
      var v = S.vehicle(j.vehicleId);
      var size = v ? v.size : 'Unknown';
      map[size] = (map[size] || 0) + S.totals(j).total;
    });
    return Object.keys(map).map(function (k) { return { label: k, value: map[k] }; })
      .sort(function (a, b) { return b.value - a.value; });
  }

  function customerRows(jobs) {
    var map = {};
    jobs.forEach(function (j) {
      if (!j.customerId) return;
      map[j.customerId] = map[j.customerId] ||
        { id: j.customerId, name: S.customerName(j.customerId), visits: 0, spend: 0 };
      map[j.customerId].visits++;
      map[j.customerId].spend += S.totals(j).total;
    });
    return Object.keys(map).map(function (k) { return map[k]; })
      .sort(function (a, b) { return b.spend - a.spend; });
  }

  function weekdayRows(jobs) {
    var names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var counts = [0, 0, 0, 0, 0, 0, 0];
    jobs.forEach(function (j) {
      var d = U.parse(j.date);
      if (d) counts[d.getDay()]++;
    });
    return names.map(function (n, i) { return { label: n, value: counts[i] }; })
      .sort(function (a, b) { return b.value - a.value; });
  }

  function newVsRepeat(jobs) {
    var seen = {}, fresh = 0, repeat = 0;
    S.db.jobs.slice().sort(U.by('date')).forEach(function (j) {
      var isNew = !seen[j.customerId];
      seen[j.customerId] = true;
      if (jobs.indexOf(j) < 0) return;
      if (isNew) fresh++; else repeat++;
    });
    return [{ label: 'Repeat visits', value: repeat }, { label: 'First-time customers', value: fresh }];
  }

  function monthly() {
    var out = [];
    for (var i = 11; i >= 0; i--) {
      var key = U.monthKey(U.addMonths(U.today(), -i));
      var mFrom = key + '-01';
      var mTo = U.addDays(U.addMonths(mFrom, 1), -1);
      out.push({
        label: U.fmtMonth(key), short: U.fmtMonth(key).slice(0, 3),
        value: S.revenue(mFrom, mTo),
        value2: U.sum(S.expensesIn(mFrom, mTo), function (e) { return e.amount; })
      });
    }
    return out;
  }

  function printReport(sum, svcRows, staffRows, custRows) {
    var s = S.db.settings;
    U.print('Business report', U.html`
      <div class="doc">
        <div class="doc-head">
          <div><h1>${s.workshopName}</h1><div class="sm muted">${s.tagline || ''}</div></div>
          <div class="meta"><strong>BUSINESS REPORT</strong><br>${U.raw(U.fmtDate(from))} – ${U.raw(U.fmtDate(to))}</div>
        </div>
        <div class="grid2">
          <div class="box"><h3>Money</h3>
            <div class="kv"><span>Billed</span><span>${U.raw(U.money(sum.billed))}</span></div>
            <div class="kv"><span>Collected</span><span>${U.raw(U.money(sum.collected))}</span></div>
            <div class="kv"><span>Expenses</span><span>${U.raw(U.money(sum.expenses))}</span></div>
            <div class="kv"><span><strong>Gross profit</strong></span><span><strong>${U.raw(U.money(sum.profit))}</strong></span></div>
          </div>
          <div class="box"><h3>Work</h3>
            <div class="kv"><span>Job cards</span><span>${U.raw(String(sum.jobs))}</span></div>
            <div class="kv"><span>Average ticket</span><span>${U.raw(U.money(sum.jobs ? sum.billed / sum.jobs : 0))}</span></div>
            <div class="kv"><span>Receivables (all time)</span><span>${U.raw(U.money(U.sum(S.outstanding(), function (o) { return o.balance; })))}</span></div>
            <div class="kv"><span>Customer rating</span><span>${U.raw(S.feedbackStats().avg.toFixed(1))} / 5</span></div>
          </div>
        </div>
        <h2>Service performance</h2>
        <table><thead><tr><th>Service</th><th>Group</th><th class="num">Sold</th><th class="num">Revenue</th></tr></thead>
          <tbody>${U.raw(svcRows.map(function (r) {
            return U.html`<tr><td>${r.name}</td><td>${r.group}</td>
              <td class="num">${U.raw(String(r.count))}</td><td class="num">${U.raw(U.money(r.revenue))}</td></tr>`;
          }).join(''))}</tbody></table>
        <h2>Technicians</h2>
        <table><thead><tr><th>Name</th><th>Role</th><th class="num">Jobs</th><th class="num">Revenue</th><th class="num">Commission</th></tr></thead>
          <tbody>${U.raw(staffRows.map(function (r) {
            return U.html`<tr><td>${r.staff.name}</td><td>${r.staff.role}</td>
              <td class="num">${U.raw(String(r.jobs))}</td><td class="num">${U.raw(U.money(r.revenue))}</td>
              <td class="num">${U.raw(U.money(r.commission))}</td></tr>`;
          }).join(''))}</tbody></table>
        <h2>Top customers</h2>
        <table><thead><tr><th>Customer</th><th class="num">Visits</th><th class="num">Spend</th></tr></thead>
          <tbody>${U.raw(custRows.slice(0, 15).map(function (r) {
            return U.html`<tr><td>${r.name}</td><td class="num">${U.raw(String(r.visits))}</td>
              <td class="num">${U.raw(U.money(r.spend))}</td></tr>`;
          }).join(''))}</tbody></table>
        <div class="foot">Generated ${U.raw(U.fmtDate(U.today()))} · ${s.workshopName}</div>
      </div>`);
  }

  App.register('reports', Reports);
  global.Reports = Reports;
})(window);

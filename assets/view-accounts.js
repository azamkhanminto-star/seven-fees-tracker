/* ============================================================
   3M Detailing — accounts
   Money received, money spent, the day book and what is still
   owed to the workshop.
   ============================================================ */
(function (global) {
  'use strict';

  var Accounts = {};
  var range = 'month', tab = 'daybook', cat = '';

  function bounds() {
    var to = U.today();
    if (range === 'today') return { from: to, to: to, label: 'today' };
    if (range === '7') return { from: U.addDays(to, -6), to: to, label: 'last 7 days' };
    if (range === '30') return { from: U.addDays(to, -29), to: to, label: 'last 30 days' };
    if (range === 'prev') {
      var pm = U.addMonths(U.today(), -1);
      var start = U.monthStart(pm);
      var end = U.addDays(U.monthStart(U.today()), -1);
      return { from: start, to: end, label: U.fmtMonth(U.monthKey(pm)) };
    }
    if (range === 'all') return { from: '', to: '', label: 'all time' };
    return { from: U.monthStart(), to: to, label: U.fmtMonth(U.monthKey(to)) };
  }

  Accounts.render = function (host) {
    var b = bounds();
    var payments = S.paymentsIn(b.from, b.to);
    var expenses = S.expensesIn(b.from, b.to).filter(function (e) { return !cat || e.category === cat; });
    var allExpenses = S.expensesIn(b.from, b.to);
    var collected = U.sum(payments, function (p) { return p.amount; });
    var spent = U.sum(allExpenses, function (e) { return e.amount; });
    var billed = S.revenue(b.from, b.to);
    var receivables = U.sum(S.outstanding(), function (o) { return o.balance; });

    host.innerHTML = U.html`
      ${U.raw(App.page('Accounts', 'Cash book for ' + b.label,
        U.html`<button class="btn ghost" type="button" id="printDay">Print day book</button>
               <button class="btn ghost" type="button" id="exportAcc">Export CSV</button>
               <button class="btn primary" type="button" id="newExp">+ Expense</button>`))}

      <div class="range-row">
        ${U.raw(['today', '7', '30', 'month', 'prev', 'all'].map(function (r) {
          var label = { today: 'Today', '7': '7 days', '30': '30 days', month: 'This month', prev: 'Last month', all: 'All time' }[r];
          return U.html`<button class="btn ghost sm ${U.raw(range === r ? 'is-on' : '')}" type="button" data-range="${r}">${label}</button>`;
        }).join(''))}
      </div>

      <div class="tiles">
        ${U.raw(App.tile('Collected', U.money(collected), payments.length + ' payments', 'in'))}
        ${U.raw(App.tile('Spent', U.money(spent), allExpenses.length + ' expenses', 'out'))}
        ${U.raw(App.tile('Net cash', U.money(collected - spent), 'in − out for ' + b.label, collected - spent >= 0 ? 'good' : 'bad'))}
        ${U.raw(App.tile('Billed', U.money(billed), 'value of job cards', 'work'))}
        ${U.raw(App.tile('Receivables', U.money(receivables), 'still to collect (all time)', receivables ? 'bad' : 'good'))}
        ${U.raw(App.tile('Cash in hand', U.money(S.cashInHand()), 'opening + all in − all out', 'cash'))}
      </div>

      <div class="cols">
        <section class="card">
          <div class="card-head"><h2>How customers paid</h2><span class="muted sm">${b.label}</span></div>
          ${U.raw(U.shareBars(modeSplit(payments)))}
        </section>
        <section class="card">
          <div class="card-head"><h2>Where the money went</h2><span class="muted sm">${b.label}</span></div>
          ${U.raw(U.shareBars(catSplit(allExpenses)))}
        </section>
      </div>

      <div class="tabs-inline">
        ${U.raw([['daybook', 'Day book'], ['payments', 'Payments in'], ['expenses', 'Expenses'], ['dues', 'Outstanding']]
          .map(function (t) {
            return U.html`<button class="btn ghost sm ${U.raw(tab === t[0] ? 'is-on' : '')}" type="button" data-tab="${t[0]}">${t[1]}</button>`;
          }).join(''))}
      </div>

      <div id="accBody"></div>`;

    var body = U.$('#accBody', host);
    if (tab === 'daybook') body.innerHTML = daybook(b);
    else if (tab === 'payments') body.innerHTML = paymentsTable(payments);
    else if (tab === 'expenses') body.innerHTML = expensesTable(expenses);
    else body.innerHTML = duesTable();

    U.$$('[data-range]', host).forEach(function (btn) {
      btn.addEventListener('click', function () { range = this.dataset.range; App.render(); });
    });
    U.$$('[data-tab]', host).forEach(function (btn) {
      btn.addEventListener('click', function () { tab = this.dataset.tab; App.render(); });
    });
    U.$('#newExp', host).addEventListener('click', function () { Accounts.expenseDialog(null); });
    U.$('#printDay', host).addEventListener('click', function () { printDaybook(b); });
    U.$('#exportAcc', host).addEventListener('click', function () { exportCSV(b, payments, allExpenses); });

    U.$$('[data-editexp]', host).forEach(function (btn) {
      btn.addEventListener('click', function () { Accounts.expenseDialog(this.dataset.editexp); });
    });
    U.$$('[data-job]', host).forEach(function (el) {
      el.addEventListener('click', function () { Jobs.openJob(this.dataset.job); });
    });
    var catSel = U.$('#expCat', host);
    if (catSel) catSel.addEventListener('change', function () { cat = this.value; App.render(); });
  };

  function modeSplit(payments) {
    var map = {};
    payments.forEach(function (p) { map[p.mode || '—'] = (map[p.mode || '—'] || 0) + U.n(p.amount); });
    return Object.keys(map).map(function (k) { return { label: k, value: map[k] }; })
      .sort(function (a, b) { return b.value - a.value; });
  }

  function catSplit(expenses) {
    var map = {};
    expenses.forEach(function (e) { map[e.category || '—'] = (map[e.category || '—'] || 0) + U.n(e.amount); });
    return Object.keys(map).map(function (k) { return { label: k, value: map[k] }; })
      .sort(function (a, b) { return b.value - a.value; });
  }

  /* ── day book ──────────────────────────────────────────── */
  function dayRows(b) {
    var days = {};
    S.paymentsIn(b.from, b.to).forEach(function (p) {
      days[p.date] = days[p.date] || { date: p.date, inAmt: 0, out: 0, jobs: 0 };
      days[p.date].inAmt += U.n(p.amount);
    });
    S.expensesIn(b.from, b.to).forEach(function (e) {
      days[e.date] = days[e.date] || { date: e.date, inAmt: 0, out: 0, jobs: 0 };
      days[e.date].out += U.n(e.amount);
    });
    S.jobsIn(b.from, b.to).forEach(function (j) {
      days[j.date] = days[j.date] || { date: j.date, inAmt: 0, out: 0, jobs: 0 };
      days[j.date].jobs++;
    });
    var list = Object.keys(days).sort().map(function (k) { return days[k]; });

    /* running balance must count everything before the window too */
    var opening = U.n(S.db.settings.openingBalance);
    if (b.from) {
      opening += U.sum(S.paymentsIn('', U.addDays(b.from, -1)), function (p) { return p.amount; });
      opening -= U.sum(S.expensesIn('', U.addDays(b.from, -1)), function (e) { return e.amount; });
    }
    var running = opening;
    list.forEach(function (d) {
      d.net = d.inAmt - d.out;
      running += d.net;
      d.balance = running;
    });
    return { list: list, opening: opening, closing: running };
  }

  function daybook(b) {
    var d = dayRows(b);
    if (!d.list.length) return App.empty('No money movement in this period.');
    return U.html`
      <div class="card table-card">
        <div class="table-scroll"><table>
          <thead><tr><th>Date</th><th>Day</th><th class="num">Job cards</th><th class="num">Received</th>
            <th class="num">Spent</th><th class="num">Net</th><th class="num">Balance</th></tr></thead>
          <tbody>
            <tr class="row-opening"><td colspan="6">Opening balance</td><td class="num">${U.raw(U.money(d.opening))}</td></tr>
            ${U.raw(d.list.map(function (r) {
              return U.html`<tr>
                <td class="nowrap"><strong>${U.raw(U.fmtDateShort(r.date))}</strong></td>
                <td class="muted sm">${U.raw(U.dayName(r.date))}</td>
                <td class="num">${U.raw(String(r.jobs))}</td>
                <td class="num is-good">${U.raw(r.inAmt ? U.money(r.inAmt) : '—')}</td>
                <td class="num is-due">${U.raw(r.out ? U.money(r.out) : '—')}</td>
                <td class="num">${U.raw(U.money(r.net))}</td>
                <td class="num">${U.raw(U.money(r.balance))}</td>
              </tr>`;
            }).join(''))}
            <tr class="row-total"><td colspan="3">Totals</td>
              <td class="num">${U.raw(U.money(U.sum(d.list, function (r) { return r.inAmt; })))}</td>
              <td class="num">${U.raw(U.money(U.sum(d.list, function (r) { return r.out; })))}</td>
              <td class="num">${U.raw(U.money(U.sum(d.list, function (r) { return r.net; })))}</td>
              <td class="num">${U.raw(U.money(d.closing))}</td></tr>
          </tbody>
        </table></div>
      </div>`;
  }

  function paymentsTable(payments) {
    if (!payments.length) return App.empty('No payments received in this period.');
    return U.html`
      <div class="card table-card"><div class="table-scroll"><table>
        <thead><tr><th>Date</th><th>Job</th><th>Customer</th><th>Mode</th><th>Note</th><th class="num">Amount</th></tr></thead>
        <tbody>${U.raw(payments.map(function (p) {
          return U.html`<tr class="clickable" data-job="${p.jobId}">
            <td class="nowrap">${U.raw(U.fmtDateShort(p.date))}</td>
            <td><strong>${p.jobNo}</strong></td>
            <td>${S.customerName(p.customerId)}</td>
            <td class="sm">${p.mode}</td>
            <td class="muted sm">${p.note || '—'}</td>
            <td class="num is-good">${U.raw(U.money(p.amount))}</td>
          </tr>`;
        }).join(''))}
        <tr class="row-total"><td colspan="5">Total received</td>
          <td class="num">${U.raw(U.money(U.sum(payments, function (p) { return p.amount; })))}</td></tr>
        </tbody>
      </table></div></div>`;
  }

  function expensesTable(expenses) {
    return U.html`
      <div class="filterbar card">
        <select id="expCat">${U.raw(App.options(S.db.settings.expenseCategories, cat, { blank: 'All categories' }))}</select>
        <span class="filter-note muted sm">${expenses.length} entries · ${U.raw(U.money(U.sum(expenses, function (e) { return e.amount; })))}</span>
      </div>
      ${U.raw(expenses.length ? U.html`<div class="card table-card"><div class="table-scroll"><table>
        <thead><tr><th>Date</th><th>Category</th><th>Note</th><th>Paid by</th><th>Mode</th><th class="num">Amount</th><th></th></tr></thead>
        <tbody>${U.raw(expenses.map(function (e) {
          return U.html`<tr>
            <td class="nowrap">${U.raw(U.fmtDateShort(e.date))}</td>
            <td>${e.category}</td>
            <td class="muted sm">${e.note || '—'}</td>
            <td class="muted sm">${U.raw(e.staffId ? U.esc(S.staffName(e.staffId)) : '—')}</td>
            <td class="sm">${e.mode || '—'}</td>
            <td class="num is-due">${U.raw(U.money(e.amount))}</td>
            <td><button class="linkbtn" type="button" data-editexp="${e.id}">Edit</button></td>
          </tr>`;
        }).join(''))}
        <tr class="row-total"><td colspan="5">Total spent</td>
          <td class="num">${U.raw(U.money(U.sum(expenses, function (e) { return e.amount; })))}</td><td></td></tr>
        </tbody>
      </table></div></div>` : App.empty('No expenses recorded in this period.'))}`;
  }

  function duesTable() {
    var rows = S.outstanding();
    if (!rows.length) return App.empty('Nothing outstanding — every job card is settled.');
    return U.html`
      <div class="card table-card"><div class="table-scroll"><table>
        <thead><tr><th>Job</th><th>Date</th><th>Customer</th><th>Phone</th><th>Vehicle</th>
          <th>Status</th><th class="num">Bill</th><th class="num">Balance</th><th class="num">Age</th></tr></thead>
        <tbody>${U.raw(rows.map(function (o) {
          var c = S.customer(o.job.customerId);
          var age = U.daysBetween(o.job.deliveredAt || o.job.date, U.today());
          return U.html`<tr class="clickable" data-job="${o.job.id}">
            <td><strong>${o.job.no}</strong></td>
            <td class="nowrap sm">${U.raw(U.fmtDateShort(o.job.date))}</td>
            <td>${c ? c.name : 'Walk-in'}</td>
            <td class="sm nowrap">${c && c.phone ? c.phone : '—'}</td>
            <td class="sm">${S.vehicleLabel(o.job.vehicleId)}</td>
            <td>${U.raw(App.statusChip(o.job.status))}</td>
            <td class="num">${U.raw(U.money(o.total))}</td>
            <td class="num is-due">${U.raw(U.money(o.balance))}</td>
            <td class="num ${U.raw(age > 30 ? 'is-due' : 'muted')}">${U.raw(String(age))}d</td>
          </tr>`;
        }).join(''))}
        <tr class="row-total"><td colspan="7">Total receivable</td>
          <td class="num">${U.raw(U.money(U.sum(rows, function (o) { return o.balance; })))}</td><td></td></tr>
        </tbody>
      </table></div></div>`;
  }

  /* ── expense entry ─────────────────────────────────────── */
  Accounts.expenseDialog = function (id) {
    var e = U.pick(S.db.expenses, id);
    var draft = e || {
      id: '', date: U.today(), category: S.db.settings.expenseCategories[0],
      amount: '', mode: 'Cash', note: '', staffId: ''
    };
    U.modal({
      title: e ? 'Edit expense' : 'Record an expense',
      body: U.html`
        <div class="form-grid two">
          <label>Date<input type="date" name="date" value="${draft.date}"></label>
          <label>Category
            <select name="category">${U.raw(App.options(S.db.settings.expenseCategories, draft.category))}</select>
          </label>
          <label>Amount<input type="number" name="amount" step="1" min="0" value="${draft.amount}"></label>
          <label>Paid by
            <select name="mode">${U.raw(App.options(['Cash', 'Bank transfer', 'Card', 'UPI / Wallet', 'Credit'], draft.mode))}</select>
          </label>
          <label>Staff (if salary / advance)
            <select name="staffId">${U.raw(App.options(S.db.staff.map(function (s) {
              return { value: s.id, label: s.name };
            }), draft.staffId, { blank: '—' }))}</select>
          </label>
          <label>Note<input type="text" name="note" value="${draft.note || ''}" placeholder="Shampoo drum, electricity bill…"></label>
        </div>`,
      footer: U.html`
        ${U.raw(e ? U.html`<button class="btn ghost danger" type="button" id="delExp">Delete</button>` : '')}
        <span class="spacer"></span>
        <button class="btn ghost" type="button" data-close="1">Cancel</button>
        <button class="btn primary" type="button" id="saveExp">${e ? 'Save' : 'Record expense'}</button>`,
      onMount: function (wrap) {
        wrap.querySelector('#saveExp').addEventListener('click', function () {
          var f = U.formData(wrap);
          if (U.n(f.amount) <= 0) { U.toast('Enter an amount', 'warn'); return; }
          var rec = e || { id: U.uid('ex') };
          Object.assign(rec, {
            date: f.date || U.today(), category: f.category, amount: U.round2(f.amount),
            mode: f.mode, note: f.note, staffId: f.staffId
          });
          if (!e) S.db.expenses.push(rec);
          U.closeModal(); App.refresh(); U.toast(e ? 'Expense updated' : 'Expense recorded');
        });
        var del = wrap.querySelector('#delExp');
        if (del) del.addEventListener('click', function () {
          U.confirm('Delete this expense?', { danger: true, ok: 'Delete' }).then(function (ok) {
            if (!ok) return;
            S.db.expenses = S.db.expenses.filter(function (x) { return x.id !== e.id; });
            U.closeModal(); App.refresh(); U.toast('Expense deleted');
          });
        });
      }
    });
  };

  /* ── output ────────────────────────────────────────────── */
  function printDaybook(b) {
    var d = dayRows(b);
    var s = S.db.settings;
    U.print('Day book', U.html`
      <div class="doc">
        <div class="doc-head">
          <div><h1>${s.workshopName}</h1><div class="sm muted">${s.address || ''}</div></div>
          <div class="meta"><strong>DAY BOOK</strong><br>${b.label}<br>${U.raw(U.fmtDate(U.today()))}</div>
        </div>
        <table>
          <thead><tr><th>Date</th><th class="num">Job cards</th><th class="num">Received</th>
            <th class="num">Spent</th><th class="num">Net</th><th class="num">Balance</th></tr></thead>
          <tbody>
            <tr><td colspan="5">Opening balance</td><td class="num">${U.raw(U.money(d.opening))}</td></tr>
            ${U.raw(d.list.map(function (r) {
              return U.html`<tr><td>${U.raw(U.fmtDate(r.date))}</td>
                <td class="num">${U.raw(String(r.jobs))}</td>
                <td class="num">${U.raw(U.money(r.inAmt))}</td>
                <td class="num">${U.raw(U.money(r.out))}</td>
                <td class="num">${U.raw(U.money(r.net))}</td>
                <td class="num">${U.raw(U.money(r.balance))}</td></tr>`;
            }).join(''))}
            <tr class="tot"><td>Total</td><td class="num">${U.raw(String(U.sum(d.list, function (r) { return r.jobs; })))}</td>
              <td class="num">${U.raw(U.money(U.sum(d.list, function (r) { return r.inAmt; })))}</td>
              <td class="num">${U.raw(U.money(U.sum(d.list, function (r) { return r.out; })))}</td>
              <td class="num">${U.raw(U.money(U.sum(d.list, function (r) { return r.net; })))}</td>
              <td class="num">${U.raw(U.money(d.closing))}</td></tr>
          </tbody>
        </table>
        <div class="sign"><div>Prepared by</div><div>Owner</div></div>
      </div>`);
  }

  function exportCSV(b, payments, expenses) {
    var rows = [['Type', 'Date', 'Reference', 'Party / category', 'Mode', 'Note', 'In', 'Out']];
    payments.forEach(function (p) {
      rows.push(['Received', p.date, p.jobNo, S.customerName(p.customerId), p.mode, p.note || '', p.amount, '']);
    });
    expenses.forEach(function (e) {
      rows.push(['Expense', e.date, '', e.category, e.mode || '', e.note || '', '', e.amount]);
    });
    U.csv('accounts-' + b.label.replace(/\s+/g, '-').toLowerCase() + '.csv', rows);
  }

  App.register('accounts', Accounts);
  global.Accounts = Accounts;
})(window);

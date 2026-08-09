/* ============================================================
   3M Detailing — job cards
   The heart of the workshop: every vehicle that comes in gets a
   job card. List / board, editor, payments, invoice and print.
   ============================================================ */
(function (global) {
  'use strict';

  var Jobs = {};
  var filter = { q: '', status: 'open', range: 'all', bay: '', mode: 'list' };

  /* ── list view ─────────────────────────────────────────── */
  function visibleJobs() {
    var from = '';
    if (filter.range === 'today') from = U.today();
    else if (filter.range === '7') from = U.addDays(U.today(), -6);
    else if (filter.range === '30') from = U.addDays(U.today(), -29);
    else if (filter.range === 'month') from = U.monthStart();

    return S.db.jobs.filter(function (j) {
      if (from && j.date < from) return false;
      if (filter.status === 'open' && !S.isOpen(j)) return false;
      if (filter.status === 'unpaid') {
        if (j.status === 'Cancelled' || S.totals(j).balance <= 0.5) return false;
      } else if (filter.status !== 'open' && filter.status !== 'all' && j.status !== filter.status) return false;
      if (filter.bay && j.bay !== filter.bay) return false;
      if (filter.q) {
        var veh = S.vehicle(j.vehicleId);
        var hay = [j.no, S.customerName(j.customerId), veh && veh.reg, veh && veh.make,
          veh && veh.model, j.status, j.bay].join(' ');
        if (!U.matches(hay, filter.q)) return false;
      }
      return true;
    }).sort(function (a, b) {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return a.no < b.no ? 1 : -1;
    });
  }

  Jobs.render = function (host) {
    var jobs = visibleJobs();
    var openCount = S.db.jobs.filter(S.isOpen).length;
    var billed = U.sum(jobs, function (j) { return j.status === 'Cancelled' ? 0 : S.totals(j).total; });
    var due = U.sum(jobs, function (j) { return j.status === 'Cancelled' ? 0 : Math.max(0, S.totals(j).balance); });

    host.innerHTML = U.html`
      ${U.raw(App.page('Job cards',
        openCount + ' vehicle' + (openCount === 1 ? '' : 's') + ' in the workshop right now',
        U.html`<button class="btn ghost" type="button" id="toggleMode">${filter.mode === 'list' ? 'Board view' : 'List view'}</button>
               <button class="btn ghost" type="button" id="exportJobs">Export CSV</button>
               <button class="btn primary" type="button" id="newJob">+ New job card</button>`))}

      <div class="filterbar card">
        <input type="search" id="jq" class="grow" placeholder="Job no, customer, vehicle…" value="${filter.q}">
        <select id="jstatus">
          ${U.raw(App.options([
            { value: 'open', label: 'In workshop' }, { value: 'all', label: 'All statuses' },
            { value: 'unpaid', label: 'Payment pending' }
          ].concat(S.STATUSES.map(function (s) { return { value: s, label: s }; })), filter.status))}
        </select>
        <select id="jrange">
          ${U.raw(App.options([
            { value: 'all', label: 'All dates' }, { value: 'today', label: 'Today' },
            { value: '7', label: 'Last 7 days' }, { value: '30', label: 'Last 30 days' },
            { value: 'month', label: 'This month' }], filter.range))}
        </select>
        <select id="jbay">
          ${U.raw(App.options(S.db.settings.bays, filter.bay, { blank: 'All bays' }))}
        </select>
        <span class="filter-note muted sm">${jobs.length} card${jobs.length === 1 ? '' : 's'} · billed ${U.raw(U.money(billed))} · pending ${U.raw(U.money(due))}</span>
      </div>

      <div id="jobsBody"></div>`;

    var body = U.$('#jobsBody', host);
    if (!jobs.length) {
      body.innerHTML = App.empty('No job cards match this filter.',
        U.html`<button class="btn primary" type="button" data-new="1">Create a job card</button>`);
    } else if (filter.mode === 'board') {
      body.innerHTML = renderBoard(jobs);
    } else {
      body.innerHTML = renderTable(jobs);
    }

    U.$('#jq', host).addEventListener('input', function () {
      filter.q = this.value;
      var pos = this.selectionStart;
      App.render();
      var f = U.$('#jq'); f.focus(); f.setSelectionRange(pos, pos);
    });
    ['jstatus', 'jrange', 'jbay'].forEach(function (id) {
      U.$('#' + id, host).addEventListener('change', function () {
        filter[id.slice(1)] = this.value;
        App.render();
      });
    });
    U.$('#toggleMode', host).addEventListener('click', function () {
      filter.mode = filter.mode === 'list' ? 'board' : 'list';
      App.render();
    });
    U.$('#newJob', host).addEventListener('click', function () { Jobs.openEditor(null); });
    U.$('#exportJobs', host).addEventListener('click', function () { exportCSV(jobs); });
    U.$$('[data-new]', host).forEach(function (b) {
      b.addEventListener('click', function () { Jobs.openEditor(null); });
    });
    U.$$('[data-job]', host).forEach(function (el) {
      el.addEventListener('click', function () { Jobs.openJob(this.dataset.job); });
    });
  };

  function renderTable(jobs) {
    return U.html`
      <div class="card table-card">
        <div class="table-scroll">
          <table>
            <thead><tr>
              <th>Job no</th><th>Date</th><th>Customer</th><th>Vehicle</th>
              <th>Services</th><th>Status</th><th class="num">Total</th>
              <th class="num">Balance</th><th>Payment</th>
            </tr></thead>
            <tbody>
              ${U.raw(jobs.map(function (j) {
                var t = S.totals(j);
                return U.html`<tr class="clickable" data-job="${j.id}">
                  <td class="nowrap"><strong>${j.no}</strong></td>
                  <td class="nowrap">${U.raw(U.fmtDateShort(j.date))}</td>
                  <td>${S.customerName(j.customerId)}</td>
                  <td class="nowrap">${S.vehicleLabel(j.vehicleId)}</td>
                  <td class="cell-services">${j.items.map(function (i) { return i.name; }).join(', ') || '—'}</td>
                  <td>${U.raw(App.statusChip(j.status))}</td>
                  <td class="num">${U.raw(U.money(t.total))}</td>
                  <td class="num ${U.raw(t.balance > 0.5 ? 'is-due' : '')}">${U.raw(t.balance > 0.5 ? U.money(t.balance) : '—')}</td>
                  <td>${U.raw(App.payChip(j))}</td>
                </tr>`;
              }).join(''))}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  function renderBoard(jobs) {
    var cols = ['Booked', 'Received', 'In Progress', 'Ready', 'Delivered'];
    return U.html`<div class="board">${U.raw(cols.map(function (col) {
      var list = jobs.filter(function (j) { return j.status === col; });
      return U.html`
        <section class="board-col">
          <header><h2>${col}</h2><span class="count">${list.length}</span></header>
          ${U.raw(list.length ? list.map(function (j) {
            var t = S.totals(j);
            return U.html`<article class="job-card clickable" data-job="${j.id}">
              <div class="job-card-top">
                <strong>${j.no}</strong>
                <span class="muted sm">${U.raw(U.fmtDateShort(j.date))}</span>
              </div>
              <div class="job-card-veh">${S.vehicleLabel(j.vehicleId)}</div>
              <div class="muted sm">${S.customerName(j.customerId)}</div>
              <div class="job-card-svc sm">${j.items.map(function (i) { return i.name; }).join(', ') || '—'}</div>
              <div class="job-card-foot">
                <span class="num">${U.raw(U.money(t.total))}</span>
                ${U.raw(t.balance > 0.5 ? U.html`<span class="chip chip-unpaid">${U.raw(U.money(t.balance))} due</span>` : U.html`<span class="chip chip-paid">Paid</span>`)}
              </div>
            </article>`;
          }).join('') : U.html`<p class="board-empty muted sm">Nothing here</p>`)}
        </section>`;
    }).join(''))}</div>`;
  }

  function exportCSV(jobs) {
    var rows = [['Job no', 'Date', 'Customer', 'Phone', 'Vehicle', 'Size', 'Services',
      'Staff', 'Status', 'Bay', 'Subtotal', 'Discount', 'Tax', 'Total', 'Paid', 'Balance', 'Delivered on']];
    jobs.forEach(function (j) {
      var t = S.totals(j);
      var c = S.customer(j.customerId), v = S.vehicle(j.vehicleId);
      rows.push([j.no, j.date, c ? c.name : '', c ? c.phone : '', S.vehicleLabel(j.vehicleId),
        v ? v.size : '', j.items.map(function (i) { return i.name; }).join(' | '),
        U.uniq(j.items.map(function (i) { return S.staffName(i.staffId); })).join(' | '),
        j.status, j.bay || '', t.sub, t.discount, t.tax, t.total, t.paid, t.balance, j.deliveredAt || '']);
    });
    U.csv('job-cards-' + U.today() + '.csv', rows);
  }

  /* ── job detail ────────────────────────────────────────── */
  Jobs.openJob = function (id) {
    var job = S.job(id);
    if (!job) { Jobs.openEditor(null); return; }
    var t = S.totals(job);
    var cust = S.customer(job.customerId);
    var veh = S.vehicle(job.vehicleId);
    var fb = S.db.feedback.filter(function (f) { return f.jobId === job.id; })[0];

    var nextStatus = {
      'Booked': 'Received', 'Received': 'In Progress',
      'In Progress': 'Ready', 'Ready': 'Delivered'
    }[job.status];

    U.modal({
      title: job.no + ' · ' + S.vehicleLabel(job.vehicleId),
      size: 'lg',
      body: U.html`
        <div class="detail-grid">
          <section class="detail-box">
            <h3>Customer</h3>
            <p class="lead">${cust ? cust.name : 'Walk-in'}</p>
            ${U.raw(cust && cust.phone ? U.html`<p class="sm">
              <a href="${U.raw(U.telLink(cust.phone))}">${cust.phone}</a> ·
              <a href="${U.raw(U.waLink(cust.phone, ''))}" target="_blank" rel="noopener">WhatsApp</a></p>` : '')}
            ${U.raw(cust ? U.html`<p class="muted sm">${U.raw(String(S.customerStats(cust.id).visits))} visits · ${U.raw(U.money(S.customerStats(cust.id).spend))} lifetime</p>` : '')}
          </section>
          <section class="detail-box">
            <h3>Vehicle</h3>
            <p class="lead">${veh ? [veh.make, veh.model].filter(Boolean).join(' ') : '—'}</p>
            <p class="sm">${veh ? veh.reg : ''} ${U.raw(veh ? '· ' + U.esc(veh.size) : '')} ${U.raw(veh && veh.color ? '· ' + U.esc(veh.color) : '')}</p>
            <p class="muted sm">Odometer in: ${job.odometer ? U.numFmt(job.odometer, 0) + ' km' : '—'} · Fuel: ${job.fuel || '—'}</p>
          </section>
          <section class="detail-box">
            <h3>Status</h3>
            <p>${U.raw(App.statusChip(job.status))} ${U.raw(App.payChip(job))}</p>
            <p class="muted sm">Received ${U.raw(U.fmtDate(job.date))}${U.raw(job.promisedDate ? ' · promised ' + U.esc(U.fmtDate(job.promisedDate)) + ' ' + U.esc(U.fmtTime(job.promisedTime)) : '')}</p>
            <p class="muted sm">${job.bay || 'No bay assigned'}${U.raw(job.deliveredAt ? ' · delivered ' + U.esc(U.fmtDate(job.deliveredAt)) : '')}</p>
          </section>
        </div>

        <h3 class="section-title">Work &amp; charges</h3>
        <div class="table-scroll">
          <table class="tight">
            <thead><tr><th>Service</th><th>Technician</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">Amount</th><th>Warranty</th></tr></thead>
            <tbody>
              ${U.raw(job.items.map(function (i) {
                var end = S.itemWarrantyEnd(job, i);
                return U.html`<tr>
                  <td>${i.name}</td>
                  <td class="muted">${S.staffName(i.staffId)}</td>
                  <td class="num">${U.raw(String(U.n(i.qty) || 1))}</td>
                  <td class="num">${U.raw(U.money(i.price))}</td>
                  <td class="num">${U.raw(U.money(U.n(i.price) * (U.n(i.qty) || 1)))}</td>
                  <td class="sm muted">${U.raw(end ? U.esc(i.warrantyMonths + ' mo → ' + U.fmtDate(end)) : '—')}</td>
                </tr>`;
              }).join('') || U.html`<tr><td colspan="6" class="muted">No services added yet.</td></tr>`)}
            </tbody>
          </table>
        </div>

        <div class="detail-grid two">
          <section class="detail-box">
            <h3>Bill</h3>
            <div class="kv"><span>Subtotal</span><span class="num">${U.raw(U.money(t.sub))}</span></div>
            ${U.raw(t.discount ? U.html`<div class="kv"><span>Discount</span><span class="num">− ${U.raw(U.money(t.discount))}</span></div>` : '')}
            ${U.raw(t.tax ? U.html`<div class="kv"><span>${S.db.settings.taxLabel} ${U.raw(String(t.taxPct))}%</span><span class="num">${U.raw(U.money(t.tax))}</span></div>` : '')}
            <div class="kv total"><span>Total</span><span class="num">${U.raw(U.money(t.total))}</span></div>
            <div class="kv"><span>Received</span><span class="num">${U.raw(U.money(t.paid))}</span></div>
            <div class="kv ${U.raw(t.balance > 0.5 ? 'is-due' : '')}"><span>Balance</span><span class="num">${U.raw(U.money(t.balance))}</span></div>
          </section>
          <section class="detail-box">
            <h3>Payments</h3>
            ${U.raw(job.payments.length ? job.payments.map(function (p) {
              return U.html`<div class="kv sm">
                <span>${U.raw(U.fmtDateShort(p.date))} · ${p.mode}${U.raw(p.note ? ' · ' + U.esc(p.note) : '')}</span>
                <span class="num">${U.raw(U.money(p.amount))}
                  <button class="linkbtn danger-text" type="button" data-delpay="${p.id}" title="Remove">✕</button></span>
              </div>`;
            }).join('') : U.html`<p class="muted sm">Nothing received yet.</p>`)}
            <button class="btn ghost sm" type="button" id="addPay">+ Record payment</button>
          </section>
        </div>

        ${U.raw(job.notes ? U.html`<section class="detail-box"><h3>Notes</h3><p class="sm">${job.notes}</p></section>` : '')}
        ${U.raw(renderIntake(job))}
        ${U.raw(fb ? U.html`
          <section class="detail-box feedback-box">
            <h3>Customer feedback</h3>
            <p>${U.raw(U.stars(fb.rating))} <span class="muted sm">${U.raw(U.fmtDate(fb.date))}</span></p>
            ${U.raw(fb.comment ? U.html`<p class="sm">“${fb.comment}”</p>` : '')}
          </section>` : '')}`,
      footer: U.html`
        <button class="btn ghost" type="button" id="printCard">Job card</button>
        <button class="btn ghost" type="button" id="printBill">Invoice</button>
        <button class="btn ghost" type="button" id="waBill">WhatsApp</button>
        <button class="btn ghost danger" type="button" id="delJob">Delete</button>
        <span class="spacer"></span>
        <button class="btn ghost" type="button" id="editJob">Edit</button>
        ${U.raw(nextStatus ? U.html`<button class="btn primary" type="button" id="advance">Mark ${nextStatus}</button>` : '')}
        ${U.raw(!fb && job.status === 'Delivered' ? U.html`<button class="btn primary" type="button" id="askFb">Take feedback</button>` : '')}`,
      onMount: function (wrap) {
        wrap.querySelector('#editJob').addEventListener('click', function () {
          U.closeModal(); Jobs.openEditor(job.id);
        });
        wrap.querySelector('#printCard').addEventListener('click', function () { printJobCard(job); });
        wrap.querySelector('#printBill').addEventListener('click', function () { printInvoice(job); });
        wrap.querySelector('#waBill').addEventListener('click', function () { whatsappBill(job); });
        wrap.querySelector('#addPay').addEventListener('click', function () { paymentDialog(job); });
        wrap.querySelector('#delJob').addEventListener('click', function () {
          U.confirm('Delete job card ' + job.no + '? This cannot be undone.', { danger: true, ok: 'Delete' })
            .then(function (ok) {
              if (!ok) return;
              S.db.jobs = S.db.jobs.filter(function (x) { return x.id !== job.id; });
              U.closeModal(); App.refresh(); U.toast('Job card deleted');
            });
        });
        U.$$('[data-delpay]', wrap).forEach(function (b) {
          b.addEventListener('click', function () {
            job.payments = job.payments.filter(function (p) { return p.id !== b.dataset.delpay; });
            S.save(); U.closeModal(); Jobs.openJob(job.id); App.paintChrome();
          });
        });
        var adv = wrap.querySelector('#advance');
        if (adv) adv.addEventListener('click', function () { advanceStatus(job, nextStatus); });
        var ask = wrap.querySelector('#askFb');
        if (ask) ask.addEventListener('click', function () {
          U.closeModal(); Feedback.openForm({ jobId: job.id });
        });
      }
    });
  };

  function renderIntake(job) {
    var it = job.intake || {};
    var keys = [['spare', 'Spare wheel'], ['tools', 'Tool kit'], ['stereo', 'Stereo / speakers'],
      ['mats', 'Floor mats'], ['scratches', 'Existing scratches'], ['dents', 'Existing dents']];
    var any = keys.some(function (k) { return it[k[0]]; });
    if (!any) return '';
    return U.html`<section class="detail-box">
      <h3>Vehicle intake</h3>
      <p class="sm">${U.raw(keys.filter(function (k) { return it[k[0]]; })
        .map(function (k) { return U.html`<span class="chip chip-soft">${k[1]}</span>`; }).join(' '))}</p>
    </section>`;
  }

  function advanceStatus(job, next) {
    if (next === 'Delivered') {
      var t = S.totals(job);
      if (t.balance > 0.5) {
        paymentDialog(job, {
          title: 'Collect payment and deliver',
          amount: t.balance,
          after: function () { deliver(job); }
        });
        return;
      }
      deliver(job);
      return;
    }
    job.status = next;
    if (next === 'Ready') job.readyAt = U.today();
    if (next === 'In Progress' && !job.startedAt) job.startedAt = U.today();
    S.save();
    U.closeModal();
    App.refresh();
    U.toast(job.no + ' → ' + next);
  }

  function deliver(job) {
    job.status = 'Delivered';
    job.deliveredAt = U.today();
    if (!job.readyAt) job.readyAt = U.today();
    var used = S.consumeMaterials(job);
    S.save();
    U.closeModal();
    App.refresh();
    U.toast(job.no + ' delivered' + (used ? ' · stock updated' : ''));
  }

  /* ── payments ──────────────────────────────────────────── */
  function paymentDialog(job, opts) {
    opts = opts || {};
    var t = S.totals(job);
    var amount = opts.amount !== undefined ? opts.amount : Math.max(0, t.balance);
    U.modal({
      title: opts.title || ('Record payment · ' + job.no),
      body: U.html`
        <div class="form-grid">
          <label>Amount
            <input type="number" name="amount" step="1" min="0" value="${U.raw(String(amount))}">
          </label>
          <label>Mode
            <select name="mode">${U.raw(App.options(S.PAY_MODES, 'Cash'))}</select>
          </label>
          <label>Date
            <input type="date" name="date" value="${U.today()}">
          </label>
          <label>Note
            <input type="text" name="note" placeholder="Advance, balance, tip…">
          </label>
        </div>
        <p class="muted sm">Bill ${U.raw(U.money(t.total))} · already received ${U.raw(U.money(t.paid))} · balance ${U.raw(U.money(t.balance))}</p>`,
      footer: U.html`
        <button class="btn ghost" type="button" data-close="1">Cancel</button>
        <button class="btn primary" type="button" id="savePay">Save payment</button>`,
      onMount: function (wrap) {
        wrap.querySelector('#savePay').addEventListener('click', function () {
          var f = U.formData(wrap);
          if (U.n(f.amount) <= 0) { U.toast('Enter an amount', 'warn'); return; }
          job.payments.push({
            id: U.uid('py'), date: f.date || U.today(),
            amount: U.round2(f.amount), mode: f.mode, note: f.note || ''
          });
          S.save();
          U.closeModal();
          if (opts.after) opts.after();
          else { App.refresh(); Jobs.openJob(job.id); U.toast('Payment recorded'); }
        });
      }
    });
  }

  /* ── editor ────────────────────────────────────────────── */
  Jobs.openEditor = function (id, preset) {
    var existing = S.job(id);
    var draft = existing ? JSON.parse(JSON.stringify(existing)) : {
      id: '', no: S.nextJobNo(), date: U.today(),
      customerId: (preset && preset.customerId) || '',
      vehicleId: (preset && preset.vehicleId) || '',
      status: 'Received', bay: S.db.settings.bays[0] || '',
      promisedDate: U.today(), promisedTime: '18:00',
      items: [], discount: 0, taxPct: U.n(S.db.settings.taxPercent),
      notes: '', odometer: '', fuel: '', payments: [],
      intake: { spare: true, tools: true, stereo: true, mats: true, scratches: false, dents: false },
      createdAt: U.today()
    };
    if (preset && preset.serviceIds) {
      preset.serviceIds.forEach(function (sid) { addLine(draft, sid); });
    }

    U.modal({
      title: existing ? 'Edit ' + existing.no : 'New job card ' + draft.no,
      size: 'lg',
      body: U.html`
        <div class="form-grid three">
          <label>Customer
            <select name="customerId" id="fCustomer">
              ${U.raw(App.options(S.db.customers.slice().sort(U.by('name')).map(function (c) {
                return { value: c.id, label: c.name + (c.phone ? ' · ' + c.phone : '') };
              }), draft.customerId, { blank: '— walk-in / new —' }))}
            </select>
          </label>
          <label>Vehicle
            <select name="vehicleId" id="fVehicle"></select>
          </label>
          <label>Date in
            <input type="date" name="date" value="${draft.date}">
          </label>
        </div>

        <div id="newCustFields" class="form-grid three sub-fields" hidden>
          <label>New customer name<input type="text" name="newName" placeholder="Customer name"></label>
          <label>Phone<input type="tel" name="newPhone" placeholder="03xx-xxxxxxx"></label>
          <label>How did they hear of us?
            <select name="newSource">${U.raw(App.options(['Walk-in', 'Reference', 'Facebook', 'Google', 'Instagram', 'Repeat'], 'Walk-in'))}</select>
          </label>
        </div>

        <div id="newVehFields" class="form-grid four sub-fields" hidden>
          <label>Registration no<input type="text" name="newReg" placeholder="ABC-1234"></label>
          <label>Make<input type="text" name="newMake" placeholder="Toyota"></label>
          <label>Model<input type="text" name="newModel" placeholder="Corolla"></label>
          <label>Size
            <select name="newSize">${U.raw(App.options(S.db.settings.sizes, 'Sedan'))}</select>
          </label>
        </div>

        <h3 class="section-title">Services</h3>
        <div id="lines"></div>
        <div class="line-add">
          <select id="addService">
            <option value="">+ Add a service…</option>
            ${U.raw(serviceOptionGroups())}
          </select>
          <button class="btn ghost sm" type="button" id="addBlank">+ Custom line</button>
        </div>

        <div class="form-grid four">
          <label>Status
            <select name="status">${U.raw(App.options(S.STATUSES, draft.status))}</select>
          </label>
          <label>Bay
            <select name="bay">${U.raw(App.options(S.db.settings.bays, draft.bay, { blank: '—' }))}</select>
          </label>
          <label>Promised date
            <input type="date" name="promisedDate" value="${draft.promisedDate || ''}">
          </label>
          <label>Promised time
            <input type="time" name="promisedTime" value="${draft.promisedTime || ''}">
          </label>
        </div>

        <div class="form-grid four">
          <label>Discount
            <input type="number" name="discount" step="1" min="0" value="${U.raw(String(U.n(draft.discount)))}">
          </label>
          <label>${S.db.settings.taxLabel} %
            <input type="number" name="taxPct" step="0.1" min="0" value="${U.raw(String(U.n(draft.taxPct)))}">
          </label>
          <label>Odometer (km)
            <input type="number" name="odometer" step="1" min="0" value="${draft.odometer || ''}">
          </label>
          <label>Fuel level
            <select name="fuel">${U.raw(App.options(['E', '1/4', '1/2', '3/4', 'F'], draft.fuel, { blank: '—' }))}</select>
          </label>
        </div>

        ${U.raw(existing ? '' : U.html`
        <div class="form-grid three">
          <label>Advance received
            <input type="number" name="advance" step="1" min="0" placeholder="0">
          </label>
          <label>Advance mode
            <select name="advanceMode">${U.raw(App.options(S.PAY_MODES, 'Cash'))}</select>
          </label>
          <span></span>
        </div>`)}

        <h3 class="section-title">Vehicle intake check</h3>
        <div class="check-row">
          ${U.raw([['spare', 'Spare wheel'], ['tools', 'Tool kit'], ['stereo', 'Stereo'],
            ['mats', 'Floor mats'], ['scratches', 'Existing scratches'], ['dents', 'Existing dents']]
            .map(function (k) {
              return U.html`<label class="check"><input type="checkbox" name="in_${U.raw(k[0])}" ${U.raw(draft.intake && draft.intake[k[0]] ? 'checked' : '')}> ${k[1]}</label>`;
            }).join(''))}
        </div>

        <label class="block">Notes / customer complaint
          <textarea name="notes" rows="2" placeholder="Water leakage from boot, deep scratch on left door…">${draft.notes || ''}</textarea>
        </label>

        <div class="totals-preview" id="totalsPreview"></div>`,
      footer: U.html`
        <button class="btn ghost" type="button" data-close="1">Cancel</button>
        <span class="spacer"></span>
        <button class="btn primary" type="button" id="saveJob">${existing ? 'Save changes' : 'Create job card'}</button>`,
      onMount: function (wrap) {
        var custSel = wrap.querySelector('#fCustomer');
        var vehSel = wrap.querySelector('#fVehicle');

        function paintVehicles() {
          var list = draft.customerId ? S.vehiclesOf(draft.customerId) : [];
          vehSel.innerHTML = App.options(list.map(function (v) {
            return { value: v.id, label: (v.reg || '—') + ' · ' + [v.make, v.model].filter(Boolean).join(' ') };
          }), draft.vehicleId, { blank: '— new vehicle —' });
          wrap.querySelector('#newVehFields').hidden = !!vehSel.value;
          wrap.querySelector('#newCustFields').hidden = !!custSel.value;
        }
        function currentSize() {
          var v = S.vehicle(vehSel.value);
          if (v) return v.size;
          var sel = wrap.querySelector('[name="newSize"]');
          return sel ? sel.value : 'Sedan';
        }
        function paintLines() {
          var host = wrap.querySelector('#lines');
          if (!draft.items.length) {
            host.innerHTML = U.html`<p class="muted sm line-empty">No services yet — add at least one below.</p>`;
          } else {
            host.innerHTML = U.html`
              <div class="table-scroll"><table class="tight lines-table">
                <thead><tr><th>Service</th><th>Technician</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">Amount</th><th></th></tr></thead>
                <tbody>${U.raw(draft.items.map(function (ln, idx) {
                  return U.html`<tr>
                    <td><input type="text" class="cell-input" data-idx="${idx}" data-f="name" value="${ln.name}"></td>
                    <td><select class="cell-input" data-idx="${idx}" data-f="staffId">
                        ${U.raw(App.options(S.db.staff.filter(function (s) { return s.active !== false; })
                          .map(function (s) { return { value: s.id, label: s.name }; }), ln.staffId, { blank: '—' }))}
                      </select></td>
                    <td class="num"><input type="number" class="cell-input narrow" data-idx="${idx}" data-f="qty" min="1" step="1" value="${U.raw(String(U.n(ln.qty) || 1))}"></td>
                    <td class="num"><input type="number" class="cell-input" data-idx="${idx}" data-f="price" min="0" step="1" value="${U.raw(String(U.n(ln.price)))}"></td>
                    <td class="num">${U.raw(U.money(U.n(ln.price) * (U.n(ln.qty) || 1)))}</td>
                    <td><button class="linkbtn danger-text" type="button" data-del="${idx}" title="Remove">✕</button></td>
                  </tr>`;
                }).join(''))}</tbody>
              </table></div>`;
          }
          U.$$('.cell-input', host).forEach(function (el) {
            el.addEventListener('input', function () {
              var ln = draft.items[+this.dataset.idx];
              if (!ln) return;
              ln[this.dataset.f] = this.dataset.f === 'price' || this.dataset.f === 'qty' ? U.n(this.value) : this.value;
              paintTotals();
            });
            el.addEventListener('change', function () {
              if (this.dataset.f === 'staffId') draft.items[+this.dataset.idx].staffId = this.value;
            });
          });
          U.$$('[data-del]', host).forEach(function (b) {
            b.addEventListener('click', function () {
              draft.items.splice(+this.dataset.del, 1);
              paintLines(); paintTotals();
            });
          });
        }
        function paintTotals() {
          draft.discount = U.n(wrap.querySelector('[name="discount"]').value);
          draft.taxPct = U.n(wrap.querySelector('[name="taxPct"]').value);
          var t = S.totals(draft);
          wrap.querySelector('#totalsPreview').innerHTML = U.html`
            <span>Subtotal <strong>${U.raw(U.money(t.sub))}</strong></span>
            <span>Discount <strong>${U.raw(U.money(t.discount))}</strong></span>
            <span>${S.db.settings.taxLabel} <strong>${U.raw(U.money(t.tax))}</strong></span>
            <span class="grand">Total <strong>${U.raw(U.money(t.total))}</strong></span>`;
        }

        custSel.addEventListener('change', function () {
          draft.customerId = this.value;
          draft.vehicleId = '';
          paintVehicles();
        });
        vehSel.addEventListener('change', function () {
          draft.vehicleId = this.value;
          wrap.querySelector('#newVehFields').hidden = !!this.value;
        });
        wrap.querySelector('[name="newSize"]').addEventListener('change', function () {
          /* re-price open lines for the newly chosen size */
          draft.items.forEach(function (ln) {
            var sv = S.service(ln.serviceId);
            if (sv) ln.price = S.servicePrice(sv, currentSize());
          });
          paintLines(); paintTotals();
        });
        wrap.querySelector('#addService').addEventListener('change', function () {
          if (!this.value) return;
          addLine(draft, this.value, currentSize());
          this.value = '';
          paintLines(); paintTotals();
        });
        wrap.querySelector('#addBlank').addEventListener('click', function () {
          draft.items.push({ id: U.uid('ln'), serviceId: '', name: '', price: 0, qty: 1, staffId: '', warrantyMonths: 0 });
          paintLines(); paintTotals();
        });
        ['discount', 'taxPct'].forEach(function (n) {
          wrap.querySelector('[name="' + n + '"]').addEventListener('input', paintTotals);
        });

        wrap.querySelector('#saveJob').addEventListener('click', function () {
          saveJob(wrap, draft, existing);
        });

        paintVehicles();
        paintLines();
        paintTotals();
      }
    });
  };

  function addLine(draft, serviceId, size) {
    var sv = S.service(serviceId);
    if (!sv) return;
    draft.items.push({
      id: U.uid('ln'), serviceId: sv.id, name: sv.name,
      price: S.servicePrice(sv, size || 'Sedan'), qty: 1,
      staffId: '', warrantyMonths: U.n(sv.warrantyMonths)
    });
  }

  function serviceOptionGroups() {
    var groups = U.groupBy(S.db.services.filter(function (s) { return s.active !== false; }), function (s) { return s.group || 'Other'; });
    return Object.keys(groups).map(function (g) {
      return U.html`<optgroup label="${g}">${U.raw(groups[g].map(function (s) {
        return U.html`<option value="${s.id}">${s.name}</option>`;
      }).join(''))}</optgroup>`;
    }).join('');
  }

  function saveJob(wrap, draft, existing) {
    var f = U.formData(wrap);

    /* create the customer / vehicle inline when needed */
    var customerId = f.customerId;
    if (!customerId && String(f.newName || '').trim()) {
      var cust = {
        id: U.uid('cu'), name: f.newName.trim(), phone: f.newPhone || '',
        email: '', address: '', notes: '', source: f.newSource || 'Walk-in',
        createdAt: U.today()
      };
      S.db.customers.push(cust);
      customerId = cust.id;
    }
    var vehicleId = f.vehicleId;
    if (!vehicleId && (String(f.newReg || '').trim() || String(f.newModel || '').trim())) {
      var veh = {
        id: U.uid('vh'), customerId: customerId,
        reg: (f.newReg || '').toUpperCase().trim(), make: f.newMake || '',
        model: f.newModel || '', size: f.newSize || 'Sedan', color: '', year: '', vin: '',
        odometer: U.n(f.odometer)
      };
      S.db.vehicles.push(veh);
      vehicleId = veh.id;
    }
    if (!draft.items.length) { U.toast('Add at least one service', 'warn'); return; }

    var job = existing || {
      id: U.uid('jb'), no: S.nextJobNo(), payments: [], createdAt: U.today(), materialsConsumed: false
    };
    var wasDelivered = existing && existing.status === 'Delivered';

    job.date = f.date || U.today();
    job.customerId = customerId;
    job.vehicleId = vehicleId;
    job.status = f.status;
    job.bay = f.bay;
    job.promisedDate = f.promisedDate;
    job.promisedTime = f.promisedTime;
    job.items = draft.items.filter(function (l) { return String(l.name || '').trim(); });
    job.discount = U.n(f.discount);
    job.taxPct = U.n(f.taxPct);
    job.odometer = U.n(f.odometer);
    job.fuel = f.fuel;
    job.notes = f.notes;
    job.intake = {
      spare: !!f.in_spare, tools: !!f.in_tools, stereo: !!f.in_stereo,
      mats: !!f.in_mats, scratches: !!f.in_scratches, dents: !!f.in_dents
    };
    if (job.status === 'Ready' && !job.readyAt) job.readyAt = U.today();
    if (job.status === 'Delivered' && !job.deliveredAt) job.deliveredAt = U.today();

    if (!existing) {
      S.db.jobs.push(job);
      S.consumeJobNo();
      if (U.n(f.advance) > 0) {
        job.payments.push({
          id: U.uid('py'), date: job.date, amount: U.round2(f.advance),
          mode: f.advanceMode || 'Cash', note: 'Advance'
        });
      }
    }
    if (vehicleId && U.n(f.odometer)) {
      var v2 = S.vehicle(vehicleId);
      if (v2 && U.n(f.odometer) > U.n(v2.odometer)) v2.odometer = U.n(f.odometer);
    }
    if (job.status === 'Delivered' && !wasDelivered) S.consumeMaterials(job);

    U.closeModal();
    App.refresh();
    U.toast(existing ? 'Job card updated' : 'Job card ' + job.no + ' created');
  }

  /* ── printing ──────────────────────────────────────────── */
  function docHead(title, job) {
    var s = S.db.settings;
    return U.html`
      <div class="doc-head">
        <div>
          <h1>${s.workshopName}</h1>
          <div class="sm muted">${s.tagline || ''}</div>
          <div class="sm muted">${s.address || ''}${U.raw(s.phone ? ' · ' + U.esc(s.phone) : '')}</div>
        </div>
        <div class="meta">
          <strong>${title}</strong><br>
          ${job.no}<br>
          ${U.raw(U.fmtDate(job.date))}
        </div>
      </div>`;
  }

  function partyBoxes(job) {
    var c = S.customer(job.customerId), v = S.vehicle(job.vehicleId);
    return U.html`
      <div class="grid2">
        <div class="box">
          <h3>Customer</h3>
          <div>${c ? c.name : 'Walk-in'}</div>
          <div class="sm muted">${c && c.phone ? c.phone : ''}</div>
          <div class="sm muted">${c && c.address ? c.address : ''}</div>
        </div>
        <div class="box">
          <h3>Vehicle</h3>
          <div>${v ? [v.make, v.model].filter(Boolean).join(' ') : '—'}</div>
          <div class="sm muted">${v ? v.reg : ''} ${U.raw(v ? '· ' + U.esc(v.size) : '')} ${U.raw(v && v.color ? '· ' + U.esc(v.color) : '')}</div>
          <div class="sm muted">Odometer ${job.odometer ? U.numFmt(job.odometer, 0) + ' km' : '—'} · Fuel ${job.fuel || '—'}</div>
        </div>
      </div>`;
  }

  function printJobCard(job) {
    var it = job.intake || {};
    var checks = [['spare', 'Spare wheel'], ['tools', 'Tool kit'], ['stereo', 'Stereo / speakers'],
      ['mats', 'Floor mats'], ['scratches', 'Existing scratches'], ['dents', 'Existing dents']];
    var t = S.totals(job);
    U.print('Job card ' + job.no, U.html`
      <div class="doc">
        ${U.raw(docHead('JOB CARD', job))}
        ${U.raw(partyBoxes(job))}
        <div class="grid2">
          <div class="box"><h3>Promised</h3>
            <div>${U.raw(U.fmtDate(job.promisedDate || job.date))} ${U.raw(U.fmtTime(job.promisedTime))}</div>
            <div class="sm muted">Bay: ${job.bay || '—'}</div>
          </div>
          <div class="box"><h3>Intake check</h3>
            <div class="sm">${U.raw(checks.map(function (k) {
              return (it[k[0]] ? '☑ ' : '☐ ') + U.esc(k[1]);
            }).join(' &nbsp; '))}</div>
          </div>
        </div>
        <h2>Work to be done</h2>
        <table>
          <thead><tr><th>#</th><th>Service</th><th>Technician</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">Amount</th></tr></thead>
          <tbody>
            ${U.raw(job.items.map(function (i, n) {
              return U.html`<tr><td>${U.raw(String(n + 1))}</td><td>${i.name}</td>
                <td>${S.staffName(i.staffId)}</td>
                <td class="num">${U.raw(String(U.n(i.qty) || 1))}</td>
                <td class="num">${U.raw(U.money(i.price))}</td>
                <td class="num">${U.raw(U.money(U.n(i.price) * (U.n(i.qty) || 1)))}</td></tr>`;
            }).join(''))}
            <tr class="tot"><td colspan="5">Estimate total</td><td class="num">${U.raw(U.money(t.total))}</td></tr>
          </tbody>
        </table>
        ${U.raw(job.notes ? U.html`<div class="box"><h3>Customer complaint / notes</h3><div class="sm">${job.notes}</div></div>` : '')}
        <div class="sign">
          <div>Customer signature</div>
          <div>Supervisor</div>
        </div>
        <div class="foot">Vehicle accepted for the work listed above. The workshop is not responsible for
        valuables left in the vehicle. Estimate may change if extra work is approved.</div>
      </div>`);
  }

  function printInvoice(job) {
    var t = S.totals(job);
    var s = S.db.settings;
    var warranties = job.items.filter(function (i) { return U.n(i.warrantyMonths); });
    U.print('Invoice ' + job.no, U.html`
      <div class="doc">
        ${U.raw(docHead('INVOICE', job))}
        ${U.raw(partyBoxes(job))}
        <table>
          <thead><tr><th>#</th><th>Service</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">Amount</th></tr></thead>
          <tbody>
            ${U.raw(job.items.map(function (i, n) {
              return U.html`<tr><td>${U.raw(String(n + 1))}</td><td>${i.name}</td>
                <td class="num">${U.raw(String(U.n(i.qty) || 1))}</td>
                <td class="num">${U.raw(U.money(i.price))}</td>
                <td class="num">${U.raw(U.money(U.n(i.price) * (U.n(i.qty) || 1)))}</td></tr>`;
            }).join(''))}
            <tr><td colspan="4" class="num">Subtotal</td><td class="num">${U.raw(U.money(t.sub))}</td></tr>
            ${U.raw(t.discount ? U.html`<tr><td colspan="4" class="num">Discount</td><td class="num">− ${U.raw(U.money(t.discount))}</td></tr>` : '')}
            ${U.raw(t.tax ? U.html`<tr><td colspan="4" class="num">${s.taxLabel} ${U.raw(String(t.taxPct))}%</td><td class="num">${U.raw(U.money(t.tax))}</td></tr>` : '')}
            <tr class="tot"><td colspan="4" class="num">Total</td><td class="num">${U.raw(U.money(t.total))}</td></tr>
            <tr><td colspan="4" class="num">Received</td><td class="num">${U.raw(U.money(t.paid))}</td></tr>
            <tr class="tot"><td colspan="4" class="num">Balance</td><td class="num">${U.raw(U.money(t.balance))}</td></tr>
          </tbody>
        </table>
        ${U.raw(job.payments.length ? U.html`<h2>Payments</h2><table>
          <thead><tr><th>Date</th><th>Mode</th><th>Note</th><th class="num">Amount</th></tr></thead>
          <tbody>${U.raw(job.payments.map(function (p) {
            return U.html`<tr><td>${U.raw(U.fmtDate(p.date))}</td><td>${p.mode}</td><td>${p.note || ''}</td>
              <td class="num">${U.raw(U.money(p.amount))}</td></tr>`;
          }).join(''))}</tbody></table>` : '')}
        ${U.raw(warranties.length ? U.html`<div class="box"><h3>Warranty</h3>${U.raw(warranties.map(function (i) {
          return U.html`<div class="kv sm"><span>${i.name}</span><span>${U.raw(String(i.warrantyMonths))} months · valid till ${U.raw(U.fmtDate(S.itemWarrantyEnd(job, i)))}</span></div>`;
        }).join(''))}<div class="sm muted">Warranty covers workmanship only. Damage from accidents, harsh
        chemicals or automatic brush washes is not covered.</div></div>` : '')}
        <div class="sign"><div>Customer signature</div><div>For ${U.esc(s.workshopName)}</div></div>
        <div class="foot">Thank you for choosing ${U.esc(s.workshopName)} — your feedback helps us improve.
        ${U.raw(s.phone ? 'Call or WhatsApp ' + U.esc(s.phone) + '.' : '')}</div>
      </div>`);
  }

  function whatsappBill(job) {
    var c = S.customer(job.customerId);
    if (!c || !c.phone) { U.toast('No phone number saved for this customer', 'warn'); return; }
    var t = S.totals(job);
    var lines = [
      S.db.settings.workshopName,
      'Job card: ' + job.no,
      'Vehicle: ' + S.vehicleLabel(job.vehicleId),
      'Work: ' + job.items.map(function (i) { return i.name; }).join(', '),
      'Total: ' + U.money(t.total),
      t.balance > 0.5 ? 'Balance: ' + U.money(t.balance) : 'Payment received — thank you!',
      '',
      'Thank you for your visit. Please reply with a rating out of 5 so we can serve you better.'
    ];
    window.open(U.waLink(c.phone, lines.join('\n')), '_blank', 'noopener');
  }

  Jobs.printInvoice = printInvoice;
  Jobs.paymentDialog = paymentDialog;

  App.register('jobs', Jobs);
  global.Jobs = Jobs;
})(window);

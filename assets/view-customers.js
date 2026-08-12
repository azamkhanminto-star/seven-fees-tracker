/* ============================================================
   3M Detailing — customers & vehicles
   Who they are, what they drive, everything ever done to it.
   ============================================================ */
(function (global) {
  'use strict';

  var Customers = {};
  var q = '', sort = 'recent';

  Customers.render = function (host) {
    var rows = S.db.customers.map(function (c) {
      return { c: c, stats: S.customerStats(c.id), vehicles: S.vehiclesOf(c.id) };
    }).filter(function (r) {
      if (!q) return true;
      var hay = [r.c.name, r.c.phone, r.c.email].concat(r.vehicles.map(function (v) {
        return [v.reg, v.make, v.model].join(' ');
      })).join(' ');
      return U.matches(hay, q);
    });

    rows.sort(function (a, b) {
      if (sort === 'spend') return b.stats.spend - a.stats.spend;
      if (sort === 'due') return b.stats.due - a.stats.due;
      if (sort === 'visits') return b.stats.visits - a.stats.visits;
      if (sort === 'name') return a.c.name.localeCompare(b.c.name);
      return (b.stats.last || '').localeCompare(a.stats.last || '');
    });

    var totalSpend = U.sum(rows, function (r) { return r.stats.spend; });
    var repeat = rows.filter(function (r) { return r.stats.visits > 1; }).length;

    host.innerHTML = U.html`
      ${U.raw(App.page('Customers',
        S.db.customers.length + ' customers · ' + S.db.vehicles.length + ' vehicles · ' +
        repeat + ' repeat (' + (rows.length ? Math.round(repeat / rows.length * 100) : 0) + '%)',
        U.html`<button class="btn ghost" type="button" id="exportCust">Export CSV</button>
               <button class="btn primary" type="button" id="newCust">+ New customer</button>`))}

      <div class="filterbar card">
        <input type="search" id="cq" class="grow" placeholder="Name, phone or vehicle number…" value="${q}">
        <select id="csort">
          ${U.raw(App.options([
            { value: 'recent', label: 'Recent visit first' }, { value: 'spend', label: 'Highest spend' },
            { value: 'visits', label: 'Most visits' }, { value: 'due', label: 'Highest dues' },
            { value: 'name', label: 'Name A–Z' }], sort))}
        </select>
        <span class="filter-note muted sm">${rows.length} shown · lifetime value ${U.raw(U.money(totalSpend))}</span>
      </div>

      ${U.raw(rows.length ? U.html`<div class="card table-card"><div class="table-scroll">
        <table>
          <thead><tr><th>Customer</th><th>Phone</th><th>Vehicles</th><th class="num">Visits</th>
            <th class="num">Lifetime spend</th><th class="num">Avg ticket</th><th class="num">Dues</th>
            <th>Rating</th><th>Last visit</th></tr></thead>
          <tbody>${U.raw(rows.map(function (r) {
            return U.html`<tr class="clickable" data-cust="${r.c.id}">
              <td><span class="avatar">${U.raw(U.initials(r.c.name))}</span> <strong>${r.c.name}</strong>
                ${U.raw(r.c.source ? U.html`<span class="muted sm"> · ${r.c.source}</span>` : '')}</td>
              <td class="nowrap sm">${r.c.phone || '—'}</td>
              <td class="sm">${r.vehicles.map(function (v) { return v.reg || (v.make + ' ' + v.model); }).join(', ') || '—'}</td>
              <td class="num">${U.raw(String(r.stats.visits))}</td>
              <td class="num">${U.raw(U.money(r.stats.spend))}</td>
              <td class="num">${U.raw(U.money(r.stats.avgTicket))}</td>
              <td class="num ${U.raw(r.stats.due > 0 ? 'is-due' : '')}">${U.raw(r.stats.due > 0 ? U.money(r.stats.due) : '—')}</td>
              <td>${U.raw(r.stats.feedbackCount ? U.stars(r.stats.rating) : '<span class="muted sm">—</span>')}</td>
              <td class="nowrap sm muted">${U.raw(r.stats.last ? U.fmtDateShort(r.stats.last) : '—')}</td>
            </tr>`;
          }).join(''))}</tbody>
        </table>
      </div></div>` : App.empty('No customers yet.',
        U.html`<button class="btn primary" type="button" id="newCust2">Add the first customer</button>`))}`;

    U.$('#cq', host).addEventListener('input', function () {
      q = this.value;
      var pos = this.selectionStart;
      App.render();
      var f = U.$('#cq'); f.focus(); f.setSelectionRange(pos, pos);
    });
    U.$('#csort', host).addEventListener('change', function () { sort = this.value; App.render(); });
    U.$$('[data-cust]', host).forEach(function (el) {
      el.addEventListener('click', function () { Customers.openCustomer(this.dataset.cust); });
    });
    U.$('#newCust', host).addEventListener('click', function () { Customers.editCustomer(null); });
    var alt = U.$('#newCust2', host);
    if (alt) alt.addEventListener('click', function () { Customers.editCustomer(null); });
    U.$('#exportCust', host).addEventListener('click', function () {
      var out = [['Name', 'Phone', 'Email', 'Address', 'Source', 'Vehicles', 'Visits',
        'Lifetime spend', 'Average ticket', 'Dues', 'Rating', 'Last visit']];
      rows.forEach(function (r) {
        out.push([r.c.name, r.c.phone, r.c.email || '', r.c.address || '', r.c.source || '',
          r.vehicles.map(function (v) { return (v.reg || '') + ' ' + v.make + ' ' + v.model; }).join(' | '),
          r.stats.visits, r.stats.spend, r.stats.avgTicket, r.stats.due,
          r.stats.feedbackCount ? r.stats.rating.toFixed(1) : '', r.stats.last || '']);
      });
      U.csv('customers-' + U.today() + '.csv', out);
    });
  };

  /* ── customer detail ───────────────────────────────────── */
  Customers.openCustomer = function (id) {
    var c = S.customer(id);
    if (!c) return;
    var stats = S.customerStats(id);
    var vehicles = S.vehiclesOf(id);
    var jobs = S.jobsOfCustomer(id);
    var fb = S.db.feedback.filter(function (f) { return f.customerId === id; }).sort(U.desc('date'));

    U.modal({
      title: c.name,
      size: 'lg',
      body: U.html`
        <div class="detail-grid">
          <section class="detail-box">
            <h3>Contact</h3>
            <p class="sm">${U.raw(c.phone ? U.html`<a href="${U.raw(U.telLink(c.phone))}">${c.phone}</a> ·
              <a href="${U.raw(U.waLink(c.phone, 'Hello ' + c.name + ', '))}" target="_blank" rel="noopener">WhatsApp</a>` : 'No phone saved')}</p>
            <p class="muted sm">${c.email || ''}</p>
            <p class="muted sm">${c.address || ''}</p>
            <p class="muted sm">Since ${U.raw(U.fmtDate(c.createdAt))}${U.raw(c.source ? ' · ' + U.esc(c.source) : '')}</p>
          </section>
          <section class="detail-box">
            <h3>Value</h3>
            <div class="kv"><span>Visits</span><span class="num">${U.raw(String(stats.visits))}</span></div>
            <div class="kv"><span>Lifetime spend</span><span class="num">${U.raw(U.money(stats.spend))}</span></div>
            <div class="kv"><span>Average ticket</span><span class="num">${U.raw(U.money(stats.avgTicket))}</span></div>
            <div class="kv ${U.raw(stats.due > 0 ? 'is-due' : '')}"><span>Outstanding</span><span class="num">${U.raw(U.money(stats.due))}</span></div>
          </section>
          <section class="detail-box">
            <h3>Satisfaction</h3>
            <p>${U.raw(stats.feedbackCount ? U.stars(stats.rating) + ' <span class="muted sm">' + stats.rating.toFixed(1) + ' from ' + stats.feedbackCount + '</span>' : '<span class="muted sm">No feedback yet</span>')}</p>
            <p class="muted sm">${c.notes || ''}</p>
          </section>
        </div>

        <h3 class="section-title">Vehicles
          <button class="linkbtn" type="button" id="addVeh">+ add vehicle</button></h3>
        ${U.raw(vehicles.length ? U.html`<div class="table-scroll"><table class="tight">
          <thead><tr><th>Reg no</th><th>Vehicle</th><th>Size</th><th>Colour</th><th class="num">Odometer</th><th class="num">Jobs</th><th></th></tr></thead>
          <tbody>${U.raw(vehicles.map(function (v) {
            return U.html`<tr>
              <td><strong>${v.reg || '—'}</strong></td>
              <td>${[v.make, v.model, v.year].filter(Boolean).join(' ')}</td>
              <td>${v.size}</td><td>${v.color || '—'}</td>
              <td class="num">${U.raw(v.odometer ? U.numFmt(v.odometer, 0) + ' km' : '—')}</td>
              <td class="num">${U.raw(String(S.jobsOfVehicle(v.id).length))}</td>
              <td><button class="linkbtn" type="button" data-editveh="${v.id}">Edit</button></td>
            </tr>`;
          }).join(''))}</tbody></table></div>` : U.html`<p class="muted sm">No vehicle saved yet.</p>`)}

        <h3 class="section-title">Service history</h3>
        ${U.raw(jobs.length ? U.html`<div class="table-scroll"><table class="tight">
          <thead><tr><th>Job</th><th>Date</th><th>Vehicle</th><th>Work</th><th>Status</th><th class="num">Total</th><th class="num">Balance</th></tr></thead>
          <tbody>${U.raw(jobs.map(function (j) {
            var t = S.totals(j);
            return U.html`<tr class="clickable" data-job="${j.id}">
              <td><strong>${j.no}</strong></td>
              <td class="nowrap">${U.raw(U.fmtDateShort(j.date))}</td>
              <td class="nowrap sm">${S.vehicleLabel(j.vehicleId)}</td>
              <td class="cell-services sm">${j.items.map(function (i) { return i.name; }).join(', ')}</td>
              <td>${U.raw(App.statusChip(j.status))}</td>
              <td class="num">${U.raw(U.money(t.total))}</td>
              <td class="num ${U.raw(t.balance > 0.5 ? 'is-due' : '')}">${U.raw(t.balance > 0.5 ? U.money(t.balance) : '—')}</td>
            </tr>`;
          }).join(''))}</tbody></table></div>` : U.html`<p class="muted sm">No job cards yet.</p>`)}

        ${U.raw(fb.length ? U.html`
          <h3 class="section-title">Feedback given</h3>
          <ul class="list">${U.raw(fb.map(function (f) {
            return U.html`<li>
              <span class="list-lead">${U.raw(U.stars(f.rating))} ${U.raw(U.fmtDate(f.date))}</span>
              <span class="muted sm">${f.comment || 'No comment'}</span>
            </li>`;
          }).join(''))}</ul>` : '')}`,
      footer: U.html`
        <button class="btn ghost danger" type="button" id="delCust">Delete</button>
        <button class="btn ghost" type="button" id="followCust">+ Follow-up</button>
        <span class="spacer"></span>
        <button class="btn ghost" type="button" id="editCust">Edit</button>
        <button class="btn primary" type="button" id="jobForCust">+ Job card</button>`,
      onMount: function (wrap) {
        wrap.querySelector('#editCust').addEventListener('click', function () {
          U.closeModal(); Customers.editCustomer(c.id);
        });
        wrap.querySelector('#addVeh').addEventListener('click', function () {
          U.closeModal(); Customers.editVehicle(null, c.id);
        });
        U.$$('[data-editveh]', wrap).forEach(function (b) {
          b.addEventListener('click', function () {
            U.closeModal(); Customers.editVehicle(this.dataset.editveh, c.id);
          });
        });
        U.$$('[data-job]', wrap).forEach(function (el) {
          el.addEventListener('click', function () {
            U.closeModal(); Jobs.openJob(this.dataset.job);
          });
        });
        wrap.querySelector('#jobForCust').addEventListener('click', function () {
          U.closeModal();
          App.go('jobs');
          Jobs.openEditor(null, { customerId: c.id, vehicleId: vehicles[0] ? vehicles[0].id : '' });
        });
        wrap.querySelector('#followCust').addEventListener('click', function () {
          U.closeModal(); Followups.add(c.id);
        });
        wrap.querySelector('#delCust').addEventListener('click', function () {
          var count = jobs.length;
          U.confirm('Delete ' + c.name + (count ? ' along with ' + count + ' job card(s)?' : '?'),
            { danger: true, ok: 'Delete' }).then(function (ok) {
              if (!ok) return;
              S.db.jobs = S.db.jobs.filter(function (j) { return j.customerId !== c.id; });
              S.db.vehicles = S.db.vehicles.filter(function (v) { return v.customerId !== c.id; });
              S.db.feedback = S.db.feedback.filter(function (f) { return f.customerId !== c.id; });
              S.db.customers = S.db.customers.filter(function (x) { return x.id !== c.id; });
              U.closeModal(); App.refresh(); U.toast('Customer deleted');
            });
        });
      }
    });
  };

  /* ── edit customer ─────────────────────────────────────── */
  Customers.editCustomer = function (id) {
    var c = S.customer(id);
    var draft = c || { id: '', name: '', phone: '', email: '', address: '', notes: '', source: 'Walk-in' };
    U.modal({
      title: c ? 'Edit customer' : 'New customer',
      body: U.html`
        <div class="form-grid two">
          <label>Name<input type="text" name="name" value="${draft.name}" placeholder="Customer name"></label>
          <label>Phone<input type="tel" name="phone" value="${draft.phone}" placeholder="03xx-xxxxxxx"></label>
          <label>Email<input type="email" name="email" value="${draft.email || ''}"></label>
          <label>How did they find us?
            <select name="source">${U.raw(App.options(['Walk-in', 'Reference', 'Facebook', 'Instagram', 'Google', 'Repeat', 'Corporate'], draft.source))}</select>
          </label>
        </div>
        <label class="block">Address<input type="text" name="address" value="${draft.address || ''}"></label>
        <label class="block">Notes<textarea name="notes" rows="2" placeholder="Prefers evening delivery, corporate account…">${draft.notes || ''}</textarea></label>`,
      footer: U.html`
        <button class="btn ghost" type="button" data-close="1">Cancel</button>
        <span class="spacer"></span>
        <button class="btn primary" type="button" id="saveCust">${c ? 'Save' : 'Add customer'}</button>`,
      onMount: function (wrap) {
        wrap.querySelector('#saveCust').addEventListener('click', function () {
          var f = U.formData(wrap);
          if (!String(f.name || '').trim()) { U.toast('Name is required', 'warn'); return; }
          var rec = c || { id: U.uid('cu'), createdAt: U.today() };
          Object.assign(rec, {
            name: f.name.trim(), phone: f.phone, email: f.email,
            address: f.address, notes: f.notes, source: f.source
          });
          if (!c) S.db.customers.push(rec);
          U.closeModal(); App.refresh();
          U.toast(c ? 'Customer updated' : 'Customer added');
          if (!c) Customers.editVehicle(null, rec.id);
        });
      }
    });
  };

  /* ── edit vehicle ──────────────────────────────────────── */
  Customers.editVehicle = function (id, customerId) {
    var v = S.vehicle(id);
    var draft = v || {
      id: '', customerId: customerId, reg: '', make: '', model: '',
      size: 'Sedan', color: '', year: '', odometer: '', vin: ''
    };
    U.modal({
      title: v ? 'Edit vehicle' : 'Add vehicle',
      body: U.html`
        <div class="form-grid three">
          <label>Registration no<input type="text" name="reg" value="${draft.reg}" placeholder="ABC-1234"></label>
          <label>Make<input type="text" name="make" value="${draft.make}" placeholder="Toyota"></label>
          <label>Model<input type="text" name="model" value="${draft.model}" placeholder="Corolla"></label>
          <label>Size (sets the price)
            <select name="size">${U.raw(App.options(S.db.settings.sizes, draft.size))}</select>
          </label>
          <label>Colour<input type="text" name="color" value="${draft.color || ''}"></label>
          <label>Year<input type="number" name="year" value="${draft.year || ''}" min="1950" max="2100"></label>
          <label>Odometer (km)<input type="number" name="odometer" value="${draft.odometer || ''}" min="0"></label>
          <label>Chassis / VIN<input type="text" name="vin" value="${draft.vin || ''}"></label>
          <label>Owner
            <select name="customerId">${U.raw(App.options(S.db.customers.slice().sort(U.by('name')).map(function (x) {
              return { value: x.id, label: x.name };
            }), draft.customerId))}</select>
          </label>
        </div>`,
      footer: U.html`
        ${U.raw(v ? U.html`<button class="btn ghost danger" type="button" id="delVeh">Delete</button>` : '')}
        <span class="spacer"></span>
        <button class="btn ghost" type="button" data-close="1">Cancel</button>
        <button class="btn primary" type="button" id="saveVeh">${v ? 'Save' : 'Add vehicle'}</button>`,
      onMount: function (wrap) {
        wrap.querySelector('#saveVeh').addEventListener('click', function () {
          var f = U.formData(wrap);
          if (!String(f.reg || '').trim() && !String(f.model || '').trim()) {
            U.toast('Enter a registration number or model', 'warn'); return;
          }
          var rec = v || { id: U.uid('vh') };
          Object.assign(rec, {
            customerId: f.customerId, reg: String(f.reg || '').toUpperCase().trim(),
            make: f.make, model: f.model, size: f.size, color: f.color,
            year: f.year, odometer: U.n(f.odometer), vin: f.vin
          });
          if (!v) S.db.vehicles.push(rec);
          U.closeModal(); App.refresh();
          U.toast(v ? 'Vehicle updated' : 'Vehicle added');
        });
        var del = wrap.querySelector('#delVeh');
        if (del) del.addEventListener('click', function () {
          U.confirm('Delete this vehicle? Job cards stay but lose the link.', { danger: true, ok: 'Delete' })
            .then(function (ok) {
              if (!ok) return;
              S.db.vehicles = S.db.vehicles.filter(function (x) { return x.id !== v.id; });
              U.closeModal(); App.refresh(); U.toast('Vehicle deleted');
            });
        });
      }
    });
  };

  App.register('customers', Customers);
  global.Customers = Customers;
})(window);

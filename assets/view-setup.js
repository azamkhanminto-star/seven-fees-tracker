/* ============================================================
   3M Detailing — setup
   Service menu and prices, staff, workshop details, and the
   backup / restore controls.
   ============================================================ */
(function (global) {
  'use strict';

  var Setup = {};
  var tab = 'services';

  Setup.render = function (host) {
    host.innerHTML = U.html`
      ${U.raw(App.page('Setup', 'Prices, people and workshop settings', ''))}
      <div class="tabs-inline">
        ${U.raw([['services', 'Services & prices'], ['staff', 'Staff'],
          ['workshop', 'Workshop'], ['data', 'Data & backup']].map(function (t) {
            return U.html`<button class="btn ghost sm ${U.raw(tab === t[0] ? 'is-on' : '')}" type="button" data-tab="${t[0]}">${t[1]}</button>`;
          }).join(''))}
      </div>
      <div id="setupBody"></div>`;

    var body = U.$('#setupBody', host);
    if (tab === 'services') services(body);
    else if (tab === 'staff') staff(body);
    else if (tab === 'workshop') workshop(body);
    else data(body);

    U.$$('[data-tab]', host).forEach(function (b) {
      b.addEventListener('click', function () { tab = this.dataset.tab; App.render(); });
    });
  };

  /* ── services ──────────────────────────────────────────── */
  function services(host) {
    var sizes = S.db.settings.sizes;
    var groups = U.groupBy(S.db.services, function (s) { return s.group || 'Other'; });

    host.innerHTML = U.html`
      <div class="filterbar card">
        <span class="filter-note muted sm">${S.db.services.length} services in ${Object.keys(groups).length} groups.
          Prices are per vehicle size — the job card picks the right one automatically.</span>
        <span class="spacer"></span>
        <button class="btn primary" type="button" id="newSvc">+ New service</button>
      </div>
      ${U.raw(Object.keys(groups).map(function (g) {
        return U.html`
          <section class="card">
            <div class="card-head"><h2>${g}</h2><span class="muted sm">${U.raw(String(groups[g].length))} services</span></div>
            <div class="table-scroll"><table class="tight">
              <thead><tr><th>Service</th>
                ${U.raw(sizes.map(function (s) { return U.html`<th class="num">${s}</th>`; }).join(''))}
                <th class="num">Time</th><th class="num">Warranty</th><th class="num">Repeat</th><th>Materials</th><th></th></tr></thead>
              <tbody>${U.raw(groups[g].map(function (sv) {
                return U.html`<tr class="${U.raw(sv.active === false ? 'row-off' : '')}">
                  <td><strong>${sv.name}</strong>${U.raw(sv.active === false ? ' <span class="chip chip-cancelled">off</span>' : '')}</td>
                  ${U.raw(sizes.map(function (sz) {
                    var p = U.n(sv.price && sv.price[sz]);
                    return U.html`<td class="num ${U.raw(p ? '' : 'muted')}">${U.raw(p ? U.money(p) : '—')}</td>`;
                  }).join(''))}
                  <td class="num muted sm">${U.raw(sv.minutes ? Math.round(sv.minutes / 60 * 10) / 10 + ' h' : '—')}</td>
                  <td class="num muted sm">${U.raw(sv.warrantyMonths ? sv.warrantyMonths + ' mo' : '—')}</td>
                  <td class="num muted sm">${U.raw(sv.repeatDays ? sv.repeatDays + ' d' : '—')}</td>
                  <td class="muted sm">${U.raw(String((sv.materials || []).length) + ' linked')}</td>
                  <td><button class="linkbtn" type="button" data-svc="${sv.id}">Edit</button></td>
                </tr>`;
              }).join(''))}</tbody>
            </table></div>
          </section>`;
      }).join(''))}`;

    U.$('#newSvc', host).addEventListener('click', function () { editService(null); });
    U.$$('[data-svc]', host).forEach(function (b) {
      b.addEventListener('click', function () { editService(this.dataset.svc); });
    });
  }

  function editService(id) {
    var sv = S.service(id);
    var sizes = S.db.settings.sizes;
    var groupNames = U.uniq(S.db.services.map(function (s) { return s.group || 'Other'; }));
    var draft = sv || {
      id: '', name: '', group: groupNames[0] || 'Washing', price: {}, minutes: 60,
      warrantyMonths: 0, repeatDays: 0, materials: [], active: true, notes: ''
    };
    var materials = (draft.materials || []).slice();

    U.modal({
      title: sv ? 'Edit service' : 'New service',
      size: 'md',
      body: U.html`
        <div class="form-grid two">
          <label>Service name<input type="text" name="name" value="${draft.name}" placeholder="Ceramic coating 9H (1 year)"></label>
          <label>Group
            <input type="text" name="group" value="${draft.group}" list="svcGroups" placeholder="Washing / Detailing / PPF…">
            <datalist id="svcGroups">${U.raw(groupNames.map(function (g) {
              return U.html`<option value="${g}"></option>`;
            }).join(''))}</datalist>
          </label>
        </div>

        <h3 class="section-title">Price per vehicle size</h3>
        <div class="form-grid ${U.raw(sizes.length > 4 ? 'five' : 'four')}">
          ${U.raw(sizes.map(function (sz) {
            return U.html`<label>${sz}
              <input type="number" name="p_${U.raw(sz.replace(/\W/g, '_'))}" min="0" step="1" value="${U.raw(String(U.n(draft.price && draft.price[sz])))}">
            </label>`;
          }).join(''))}
        </div>

        <div class="form-grid three">
          <label>Time needed (minutes)<input type="number" name="minutes" min="0" step="5" value="${U.raw(String(U.n(draft.minutes)))}"></label>
          <label>Warranty (months)<input type="number" name="warrantyMonths" min="0" step="1" value="${U.raw(String(U.n(draft.warrantyMonths)))}"></label>
          <label>Remind again after (days)<input type="number" name="repeatDays" min="0" step="1" value="${U.raw(String(U.n(draft.repeatDays)))}"></label>
        </div>
        <p class="muted sm">Warranty drives the “warranty ending” follow-ups (use it for coating, PPF and paint).
          “Remind again after” drives repeat-service reminders (wash 15 days, detailing 120 days…).</p>

        <h3 class="section-title">Materials used <button class="linkbtn" type="button" id="addMat">+ add</button></h3>
        <div id="matList"></div>
        <p class="muted sm">Linked materials are deducted from stock automatically when the job card is delivered.</p>

        <label class="check"><input type="checkbox" name="active" ${U.raw(draft.active !== false ? 'checked' : '')}> Offer this service</label>`,
      footer: U.html`
        ${U.raw(sv ? U.html`<button class="btn ghost danger" type="button" id="delSvc">Delete</button>` : '')}
        <span class="spacer"></span>
        <button class="btn ghost" type="button" data-close="1">Cancel</button>
        <button class="btn primary" type="button" id="saveSvc">${sv ? 'Save' : 'Add service'}</button>`,
      onMount: function (wrap) {
        function paintMats() {
          var host2 = wrap.querySelector('#matList');
          if (!materials.length) {
            host2.innerHTML = U.html`<p class="muted sm">No materials linked.</p>`;
            return;
          }
          host2.innerHTML = materials.map(function (m, idx) {
            return U.html`<div class="mat-row">
              <select data-mi="${idx}" data-mf="itemId">
                ${U.raw(App.options(S.db.inventory.slice().sort(U.by('name')).map(function (i) {
                  return { value: i.id, label: i.name + ' (' + i.unit + ')' };
                }), m.itemId, { blank: '— choose item —' }))}
              </select>
              <input type="number" step="0.01" min="0" data-mi="${idx}" data-mf="qty" value="${U.raw(String(U.n(m.qty)))}" placeholder="qty">
              <button class="linkbtn danger-text" type="button" data-mdel="${idx}">✕</button>
            </div>`;
          }).join('');
          U.$$('[data-mi]', host2).forEach(function (el) {
            el.addEventListener('input', function () {
              materials[+this.dataset.mi][this.dataset.mf] =
                this.dataset.mf === 'qty' ? U.n(this.value) : this.value;
            });
            el.addEventListener('change', function () {
              materials[+this.dataset.mi][this.dataset.mf] =
                this.dataset.mf === 'qty' ? U.n(this.value) : this.value;
            });
          });
          U.$$('[data-mdel]', host2).forEach(function (b) {
            b.addEventListener('click', function () {
              materials.splice(+this.dataset.mdel, 1); paintMats();
            });
          });
        }
        wrap.querySelector('#addMat').addEventListener('click', function () {
          materials.push({ itemId: '', qty: 1 }); paintMats();
        });
        paintMats();

        wrap.querySelector('#saveSvc').addEventListener('click', function () {
          var f = U.formData(wrap);
          if (!String(f.name || '').trim()) { U.toast('Service name is required', 'warn'); return; }
          var rec = sv || { id: U.uid('sv') };
          var price = {};
          sizes.forEach(function (sz) { price[sz] = U.n(f['p_' + sz.replace(/\W/g, '_')]); });
          Object.assign(rec, {
            name: f.name.trim(), group: String(f.group || 'Other').trim(), price: price,
            minutes: U.n(f.minutes), warrantyMonths: U.n(f.warrantyMonths),
            repeatDays: U.n(f.repeatDays), materials: materials.filter(function (m) { return m.itemId; }),
            active: !!f.active
          });
          if (!sv) S.db.services.push(rec);
          U.closeModal(); App.refresh(); U.toast(sv ? 'Service updated' : 'Service added');
        });
        var del = wrap.querySelector('#delSvc');
        if (del) del.addEventListener('click', function () {
          U.confirm('Delete ' + sv.name + '? Past job cards keep the line but lose the link.',
            { danger: true, ok: 'Delete' }).then(function (ok) {
              if (!ok) return;
              S.db.services = S.db.services.filter(function (x) { return x.id !== sv.id; });
              U.closeModal(); App.refresh(); U.toast('Service deleted');
            });
        });
      }
    });
  }

  /* ── staff ─────────────────────────────────────────────── */
  function staff(host) {
    var stats = S.staffStats(U.monthStart(), U.today());
    host.innerHTML = U.html`
      <div class="filterbar card">
        <span class="filter-note muted sm">${S.db.staff.length} people · performance shown for ${U.raw(U.fmtMonth(U.monthKey(U.today())))}</span>
        <span class="spacer"></span>
        <button class="btn primary" type="button" id="newStaff">+ Add staff</button>
      </div>
      ${U.raw(S.db.staff.length ? U.html`<div class="card table-card"><div class="table-scroll">
        <table>
          <thead><tr><th>Name</th><th>Role</th><th>Phone</th><th class="num">Salary</th>
            <th class="num">Commission</th><th class="num">Jobs (month)</th><th class="num">Revenue (month)</th>
            <th class="num">Earned commission</th><th>Rating</th><th></th></tr></thead>
          <tbody>${U.raw(stats.map(function (r) {
            var s = r.staff;
            return U.html`<tr class="${U.raw(s.active === false ? 'row-off' : '')}">
              <td><span class="avatar">${U.raw(U.initials(s.name))}</span> <strong>${s.name}</strong></td>
              <td class="muted sm">${s.role}</td>
              <td class="sm nowrap">${s.phone || '—'}</td>
              <td class="num">${U.raw(s.salary ? U.money(s.salary) : '—')}</td>
              <td class="num muted">${U.raw(U.n(s.commissionPct) + '%')}</td>
              <td class="num">${U.raw(String(r.jobs))}</td>
              <td class="num">${U.raw(U.money(r.revenue))}</td>
              <td class="num">${U.raw(U.money(r.commission))}</td>
              <td>${U.raw(r.ratingCount ? U.stars(r.rating) : '<span class="muted sm">—</span>')}</td>
              <td><button class="linkbtn" type="button" data-staff="${s.id}">Edit</button></td>
            </tr>`;
          }).join(''))}</tbody>
        </table>
      </div></div>` : App.empty('No staff added yet.',
        U.html`<button class="btn primary" type="button" id="newStaff2">Add your first technician</button>`))}`;

    var open = function () { editStaff(null); };
    U.$('#newStaff', host).addEventListener('click', open);
    var alt = U.$('#newStaff2', host);
    if (alt) alt.addEventListener('click', open);
    U.$$('[data-staff]', host).forEach(function (b) {
      b.addEventListener('click', function () { editStaff(this.dataset.staff); });
    });
  }

  function editStaff(id) {
    var s = S.staffMember(id);
    var draft = s || {
      id: '', name: '', role: 'Detailer', phone: '', salary: '', commissionPct: 0,
      joinedAt: U.today(), active: true, notes: ''
    };
    U.modal({
      title: s ? 'Edit staff' : 'Add staff',
      body: U.html`
        <div class="form-grid two">
          <label>Name<input type="text" name="name" value="${draft.name}"></label>
          <label>Role
            <select name="role">${U.raw(App.options(['Washer', 'Detailer', 'Painter', 'Denter',
              'Coating specialist', 'PPF installer', 'Service technician', 'Helper', 'Manager', 'Receptionist'], draft.role))}</select>
          </label>
          <label>Phone<input type="tel" name="phone" value="${draft.phone || ''}"></label>
          <label>Monthly salary<input type="number" name="salary" min="0" step="500" value="${draft.salary || ''}"></label>
          <label>Commission on work done (%)<input type="number" name="commissionPct" min="0" max="100" step="0.5" value="${U.raw(String(U.n(draft.commissionPct)))}"></label>
          <label>Joined on<input type="date" name="joinedAt" value="${draft.joinedAt || U.today()}"></label>
        </div>
        <label class="block">Notes<input type="text" name="notes" value="${draft.notes || ''}" placeholder="Expert in paint correction"></label>
        <label class="check"><input type="checkbox" name="active" ${U.raw(draft.active !== false ? 'checked' : '')}> Currently working here</label>`,
      footer: U.html`
        ${U.raw(s ? U.html`<button class="btn ghost danger" type="button" id="delStaff">Delete</button>` : '')}
        <span class="spacer"></span>
        <button class="btn ghost" type="button" data-close="1">Cancel</button>
        <button class="btn primary" type="button" id="saveStaff">${s ? 'Save' : 'Add'}</button>`,
      onMount: function (wrap) {
        wrap.querySelector('#saveStaff').addEventListener('click', function () {
          var f = U.formData(wrap);
          if (!String(f.name || '').trim()) { U.toast('Name is required', 'warn'); return; }
          var rec = s || { id: U.uid('st') };
          Object.assign(rec, {
            name: f.name.trim(), role: f.role, phone: f.phone, salary: U.n(f.salary),
            commissionPct: U.n(f.commissionPct), joinedAt: f.joinedAt, notes: f.notes,
            active: !!f.active
          });
          if (!s) S.db.staff.push(rec);
          U.closeModal(); App.refresh(); U.toast(s ? 'Staff updated' : 'Staff added');
        });
        var del = wrap.querySelector('#delStaff');
        if (del) del.addEventListener('click', function () {
          U.confirm('Delete ' + s.name + '? Job cards keep the name but lose the link.',
            { danger: true, ok: 'Delete' }).then(function (ok) {
              if (!ok) return;
              S.db.staff = S.db.staff.filter(function (x) { return x.id !== s.id; });
              U.closeModal(); App.refresh(); U.toast('Staff removed');
            });
        });
      }
    });
  }

  /* ── workshop settings ─────────────────────────────────── */
  function workshop(host) {
    var s = S.db.settings;
    host.innerHTML = U.html`
      <section class="card">
        <div class="card-head"><h2>Workshop details</h2></div>
        <div class="form-grid two">
          <label>Workshop name<input type="text" name="workshopName" value="${s.workshopName}"></label>
          <label>Tagline<input type="text" name="tagline" value="${s.tagline || ''}"></label>
          <label>Phone / WhatsApp<input type="tel" name="phone" value="${s.phone || ''}"></label>
          <label>Address<input type="text" name="address" value="${s.address || ''}"></label>
        </div>
      </section>

      <section class="card">
        <div class="card-head"><h2>Billing</h2></div>
        <div class="form-grid four">
          <label>Currency symbol<input type="text" name="currency" value="${s.currency}" maxlength="6"></label>
          <label>Tax label<input type="text" name="taxLabel" value="${s.taxLabel}" placeholder="GST / VAT"></label>
          <label>Default tax %<input type="number" name="taxPercent" min="0" step="0.1" value="${U.raw(String(U.n(s.taxPercent)))}"></label>
          <label>Opening cash balance<input type="number" name="openingBalance" step="1" value="${U.raw(String(U.n(s.openingBalance)))}"></label>
          <label>Job card prefix<input type="text" name="jobPrefix" value="${s.jobPrefix}"></label>
          <label>Next job number<input type="number" name="nextJobNo" min="1" step="1" value="${U.raw(String(U.n(s.nextJobNo)))}"></label>
          <label>Theme
            <select name="theme">${U.raw(App.options([
              { value: 'auto', label: 'Match device' }, { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' }], s.theme))}</select>
          </label>
        </div>
      </section>

      <section class="card">
        <div class="card-head"><h2>Lists</h2></div>
        <label class="block">Work bays <span class="muted sm">(comma separated)</span>
          <input type="text" name="bays" value="${s.bays.join(', ')}">
        </label>
        <label class="block">Vehicle sizes used for pricing <span class="muted sm">(comma separated)</span>
          <input type="text" name="sizes" value="${s.sizes.join(', ')}">
        </label>
        <label class="block">Expense categories <span class="muted sm">(comma separated)</span>
          <input type="text" name="expenseCategories" value="${s.expenseCategories.join(', ')}">
        </label>
      </section>

      <div class="form-actions">
        <button class="btn primary" type="button" id="saveSettings">Save settings</button>
      </div>`;

    U.$('#saveSettings', host).addEventListener('click', function () {
      var f = U.formData(host);
      var list = function (v) {
        return String(v || '').split(',').map(function (x) { return x.trim(); })
          .filter(Boolean);
      };
      Object.assign(S.db.settings, {
        workshopName: f.workshopName || '3M Detailing', tagline: f.tagline,
        phone: f.phone, address: f.address, currency: f.currency || 'Rs',
        taxLabel: f.taxLabel || 'Tax', taxPercent: U.n(f.taxPercent),
        openingBalance: U.n(f.openingBalance), jobPrefix: f.jobPrefix || 'JC-',
        nextJobNo: Math.max(1, U.n(f.nextJobNo)), theme: f.theme
      });
      var bays = list(f.bays), sizes = list(f.sizes), cats = list(f.expenseCategories);
      if (bays.length) S.db.settings.bays = bays;
      if (sizes.length) S.db.settings.sizes = sizes;
      if (cats.length) S.db.settings.expenseCategories = cats;
      App.applyTheme();
      App.refresh();
      U.toast('Settings saved');
    });
  }

  /* ── data ──────────────────────────────────────────────── */
  function data(host) {
    var size = 0;
    try { size = (localStorage.getItem('3m_detailing_v1') || '').length; } catch (e) { size = 0; }
    var counts = [
      ['Job cards', S.db.jobs.length], ['Customers', S.db.customers.length],
      ['Vehicles', S.db.vehicles.length], ['Feedback', S.db.feedback.length],
      ['Bookings', S.db.appointments.length], ['Expenses', S.db.expenses.length],
      ['Services', S.db.services.length], ['Staff', S.db.staff.length],
      ['Inventory items', S.db.inventory.length]
    ];

    host.innerHTML = U.html`
      <section class="card">
        <div class="card-head"><h2>What is stored</h2>
          <span class="muted sm">${U.raw(U.numFmt(Math.round(size / 1024), 0))} KB on this device</span></div>
        <div class="mini-tiles">
          ${U.raw(counts.map(function (c) {
            return U.html`<div><span class="muted sm">${c[0]}</span><strong>${U.raw(String(c[1]))}</strong></div>`;
          }).join(''))}
        </div>
        <p class="muted sm">Everything lives in this browser only — nothing is sent anywhere. Take a backup
        regularly, and always before clearing browser data or changing device.</p>
      </section>

      <section class="card">
        <div class="card-head"><h2>Backup &amp; restore</h2></div>
        <div class="row-actions">
          <button class="btn primary" type="button" id="backup">Download backup</button>
          <label class="btn ghost file-btn">Restore from backup<input type="file" id="restore" accept="application/json,.json" hidden></label>
          <button class="btn ghost" type="button" id="exportAll">Export everything as CSV</button>
        </div>
        <p class="muted sm">Restoring replaces all current data with the contents of the backup file.</p>
      </section>

      <section class="card">
        <div class="card-head"><h2>Sample data</h2></div>
        <div class="row-actions">
          <button class="btn ghost" type="button" id="seed">Load sample workshop</button>
          <button class="btn ghost danger" type="button" id="erase">Erase all data</button>
        </div>
        <p class="muted sm">Sample data fills the app with three months of realistic job cards, feedback and
        expenses so you can try every screen. Erasing gives you a clean workshop with the default service menu.</p>
      </section>`;

    U.$('#backup', host).addEventListener('click', function () {
      U.download('3m-detailing-backup-' + U.today() + '.json', S.exportJSON(), 'application/json');
      U.toast('Backup downloaded');
    });
    U.$('#restore', host).addEventListener('change', function () {
      var file = this.files && this.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        U.confirm('Replace all current data with this backup?', { danger: true, ok: 'Restore' })
          .then(function (ok) {
            if (!ok) return;
            try {
              S.importJSON(String(reader.result));
              App.applyTheme();
              App.refresh();
              U.toast('Backup restored');
            } catch (err) {
              U.toast('Could not read that file', 'warn');
            }
          });
      };
      reader.readAsText(file);
      this.value = '';
    });
    U.$('#exportAll', host).addEventListener('click', exportEverything);
    U.$('#seed', host).addEventListener('click', function () {
      U.confirm('Replace everything with sample data?', { danger: true, ok: 'Load sample' })
        .then(function (ok) {
          if (!ok) return;
          S.seed(); App.refresh(); U.toast('Sample workshop loaded');
        });
    });
    U.$('#erase', host).addEventListener('click', function () {
      U.confirm('Erase every job card, customer, payment and review? Download a backup first if you might need it.',
        { danger: true, ok: 'Erase everything' }).then(function (ok) {
          if (!ok) return;
          S.reset(); App.applyTheme(); App.refresh(); U.toast('All data erased');
        });
    });
  }

  function exportEverything() {
    var rows = [['JOB CARDS'], ['Job no', 'Date', 'Customer', 'Vehicle', 'Services', 'Status', 'Total', 'Paid', 'Balance']];
    S.db.jobs.forEach(function (j) {
      var t = S.totals(j);
      rows.push([j.no, j.date, S.customerName(j.customerId), S.vehicleLabel(j.vehicleId),
        j.items.map(function (i) { return i.name; }).join(' | '), j.status, t.total, t.paid, t.balance]);
    });
    rows.push([], ['CUSTOMERS'], ['Name', 'Phone', 'Visits', 'Spend', 'Dues']);
    S.db.customers.forEach(function (c) {
      var st = S.customerStats(c.id);
      rows.push([c.name, c.phone, st.visits, st.spend, st.due]);
    });
    rows.push([], ['FEEDBACK'], ['Date', 'Customer', 'Rating', 'Comment', 'Status']);
    S.db.feedback.forEach(function (f) {
      rows.push([f.date, S.customerName(f.customerId), f.rating, f.comment || '', f.status]);
    });
    rows.push([], ['EXPENSES'], ['Date', 'Category', 'Amount', 'Note']);
    S.db.expenses.forEach(function (e) { rows.push([e.date, e.category, e.amount, e.note || '']); });
    rows.push([], ['INVENTORY'], ['Item', 'Unit', 'Stock', 'Re-order', 'Cost']);
    S.db.inventory.forEach(function (i) { rows.push([i.name, i.unit, i.stock, i.reorder, i.cost]); });
    U.csv('3m-detailing-everything-' + U.today() + '.csv', rows);
  }

  App.register('setup', Setup);
  global.Setup = Setup;
})(window);

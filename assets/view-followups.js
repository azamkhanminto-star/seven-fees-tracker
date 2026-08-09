/* ============================================================
   3M Detailing — follow-ups
   The daily call list: coatings and PPF nearing warranty end,
   washes and services falling due, money to collect, cars ready
   for delivery, plus anything the owner jots down by hand.
   ============================================================ */
(function (global) {
  'use strict';

  var Followups = {};
  var kind = 'all', horizon = 30;

  var KINDS = [
    { value: 'all', label: 'Everything' },
    { value: 'service-due', label: 'Service due' },
    { value: 'warranty', label: 'Warranty ending' },
    { value: 'payment', label: 'Payment pending' },
    { value: 'delivery', label: 'Ready for delivery' },
    { value: 'manual', label: 'My reminders' }
  ];

  Followups.render = function (host) {
    var all = S.reminders(horizon);
    var list = kind === 'all' ? all : all.filter(function (r) { return r.kind === kind; });
    var counts = {};
    all.forEach(function (r) { counts[r.kind] = (counts[r.kind] || 0) + 1; });
    var overdue = list.filter(function (r) { return r.days < 0; });

    host.innerHTML = U.html`
      ${U.raw(App.page('Follow-ups',
        all.length + ' things to chase · ' + overdue.length + ' overdue',
        U.html`<button class="btn ghost" type="button" id="exportFu">Export call list</button>
               <button class="btn primary" type="button" id="addFu">+ Add reminder</button>`))}

      <div class="filterbar card">
        ${U.raw(KINDS.map(function (k) {
          var c = k.value === 'all' ? all.length : (counts[k.value] || 0);
          return U.html`<button class="btn ghost sm ${U.raw(kind === k.value ? 'is-on' : '')}" type="button" data-kind="${k.value}">${k.label} <span class="pill">${U.raw(String(c))}</span></button>`;
        }).join(''))}
        <select id="horizon">
          ${U.raw(App.options([
            { value: '7', label: 'Next 7 days' }, { value: '30', label: 'Next 30 days' },
            { value: '90', label: 'Next 90 days' }], String(horizon)))}
        </select>
      </div>

      ${U.raw(list.length ? U.html`<div class="card table-card"><div class="table-scroll">
        <table>
          <thead><tr><th>Due</th><th>What</th><th>Customer</th><th>Details</th><th>Phone</th><th></th></tr></thead>
          <tbody>${U.raw(list.map(function (r, i) {
            var c = S.customer(r.customerId);
            return U.html`<tr class="${U.raw(r.days < 0 ? 'row-late' : '')}">
              <td class="nowrap">
                <strong>${U.raw(U.fmtDateShort(r.due))}</strong>
                <span class="muted sm"> ${U.raw(r.days < 0 ? Math.abs(r.days) + 'd late' : U.relDay(r.due))}</span>
              </td>
              <td>${U.raw(kindChip(r.kind))} ${r.title}</td>
              <td>${c ? c.name : 'Walk-in'}</td>
              <td class="sm muted">${r.detail}</td>
              <td class="nowrap sm">${U.raw(c && c.phone ? U.html`<a href="${U.raw(U.telLink(c.phone))}">${c.phone}</a>` : '—')}</td>
              <td class="row-actions">
                ${U.raw(c && c.phone ? U.html`<button class="btn ghost sm" type="button" data-wa="${i}">WhatsApp</button>` : '')}
                ${U.raw(r.jobId ? U.html`<button class="linkbtn" type="button" data-openjob="${r.jobId}">Job</button>` : '')}
                ${U.raw(r.kind === 'service-due' || r.kind === 'warranty' ? U.html`<button class="linkbtn" type="button" data-book="${i}">Book</button>` : '')}
                ${U.raw(r.followupId ? U.html`<button class="linkbtn" type="button" data-done="${r.followupId}">Done</button>` : '')}
              </td>
            </tr>`;
          }).join(''))}</tbody>
        </table>
      </div></div>` : App.empty('Nothing to follow up in this window.'))}

      ${U.raw(S.db.followups.filter(function (f) { return f.done; }).length ? U.html`
      <section class="card">
        <div class="card-head"><h2>Completed reminders</h2></div>
        <ul class="list">${U.raw(S.db.followups.filter(function (f) { return f.done; }).slice(-8).reverse().map(function (f) {
          return U.html`<li>
            <span class="list-lead">${f.note}</span>
            <span class="muted sm">${S.customerName(f.customerId)} · ${U.raw(U.fmtDate(f.date))}</span>
            <button class="linkbtn" type="button" data-undone="${f.id}">Reopen</button>
          </li>`;
        }).join(''))}</ul>
      </section>` : '')}`;

    U.$$('[data-kind]', host).forEach(function (b) {
      b.addEventListener('click', function () { kind = this.dataset.kind; App.render(); });
    });
    U.$('#horizon', host).addEventListener('change', function () { horizon = +this.value; App.render(); });
    U.$('#addFu', host).addEventListener('click', function () { Followups.add(''); });
    U.$$('[data-wa]', host).forEach(function (b) {
      b.addEventListener('click', function () { whatsapp(list[+this.dataset.wa]); });
    });
    U.$$('[data-openjob]', host).forEach(function (b) {
      b.addEventListener('click', function () { Jobs.openJob(this.dataset.openjob); });
    });
    U.$$('[data-book]', host).forEach(function (b) {
      b.addEventListener('click', function () {
        var r = list[+this.dataset.book];
        App.go('bookings');
        Bookings.openEditor(null);
        setTimeout(function () {
          var wrap = U.$('#modal');
          if (!wrap) return;
          var cust = wrap.querySelector('#bkCust');
          if (cust && r.customerId) {
            cust.value = r.customerId;
            cust.dispatchEvent(new Event('change'));
          }
        }, 60);
      });
    });
    U.$$('[data-done]', host).forEach(function (b) {
      b.addEventListener('click', function () {
        var f = U.pick(S.db.followups, this.dataset.done);
        if (f) { f.done = true; f.doneAt = U.today(); App.refresh(); U.toast('Marked done'); }
      });
    });
    U.$$('[data-undone]', host).forEach(function (b) {
      b.addEventListener('click', function () {
        var f = U.pick(S.db.followups, this.dataset.undone);
        if (f) { f.done = false; App.refresh(); }
      });
    });
    U.$('#exportFu', host).addEventListener('click', function () {
      var rows = [['Due', 'Type', 'What', 'Customer', 'Phone', 'Details']];
      list.forEach(function (r) {
        var c = S.customer(r.customerId);
        rows.push([r.due, r.kind, r.title, c ? c.name : '', c ? c.phone : '', r.detail]);
      });
      U.csv('follow-ups-' + U.today() + '.csv', rows);
    });
  };

  function kindChip(k) {
    var map = {
      'warranty': ['chip-booked', 'Warranty'], 'service-due': ['chip-progress', 'Due'],
      'payment': ['chip-unpaid', 'Payment'], 'delivery': ['chip-ready', 'Delivery'],
      'manual': ['chip-soft', 'Reminder']
    };
    var m = map[k] || ['chip-soft', k];
    return U.html`<span class="chip ${U.raw(m[0])}">${m[1]}</span>`;
  }

  function whatsapp(r) {
    var c = S.customer(r.customerId);
    if (!c || !c.phone) { U.toast('No phone number saved', 'warn'); return; }
    var shop = S.db.settings.workshopName;
    var veh = r.vehicleId ? S.vehicleLabel(r.vehicleId) : '';
    var msg;
    if (r.kind === 'service-due') {
      msg = 'Hello ' + c.name + ', this is ' + shop + '. ' + (veh ? veh + ' is ' : 'Your vehicle is ') +
        'due for ' + r.title.replace(/ due.*$/, '') + '. Shall we book a slot for you this week?';
    } else if (r.kind === 'warranty') {
      msg = 'Hello ' + c.name + ', ' + shop + ' here. ' + r.title +
        '. Bring the vehicle in for a free inspection and we will advise on a top-up.';
    } else if (r.kind === 'payment') {
      msg = 'Hello ' + c.name + ', a gentle reminder from ' + shop + ': ' + r.title +
        '. You can pay by cash or transfer at your convenience. Thank you.';
    } else if (r.kind === 'delivery') {
      msg = 'Hello ' + c.name + ', ' + shop + ': your vehicle ' + veh +
        ' is ready for delivery. Let us know when you would like to collect it.';
    } else {
      msg = 'Hello ' + c.name + ', ' + shop + ': ' + r.title;
    }
    window.open(U.waLink(c.phone, msg), '_blank', 'noopener');
  }

  Followups.add = function (customerId) {
    U.modal({
      title: 'New reminder',
      body: U.html`
        <div class="form-grid two">
          <label>Remind me on<input type="date" name="date" value="${U.addDays(U.today(), 1)}"></label>
          <label>Customer
            <select name="customerId">${U.raw(App.options(S.db.customers.slice().sort(U.by('name')).map(function (c) {
              return { value: c.id, label: c.name };
            }), customerId, { blank: '— none —' }))}</select>
          </label>
        </div>
        <label class="block">What to do
          <input type="text" name="note" placeholder="Call about ceramic coating offer">
        </label>`,
      footer: U.html`
        <button class="btn ghost" type="button" data-close="1">Cancel</button>
        <button class="btn primary" type="button" id="saveFu">Add reminder</button>`,
      onMount: function (wrap) {
        wrap.querySelector('#saveFu').addEventListener('click', function () {
          var f = U.formData(wrap);
          if (!String(f.note || '').trim()) { U.toast('Write what to do', 'warn'); return; }
          S.db.followups.push({
            id: U.uid('fu'), date: f.date || U.today(), customerId: f.customerId,
            note: f.note.trim(), done: false, createdAt: U.today()
          });
          U.closeModal(); App.refresh(); U.toast('Reminder added');
        });
      }
    });
  };

  App.register('followups', Followups);
  global.Followups = Followups;
})(window);

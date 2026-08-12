/* ============================================================
   3M Detailing — bookings
   Slot bookings for wash / detailing / coating, and the one-click
   hand-off into a job card when the vehicle actually arrives.
   ============================================================ */
(function (global) {
  'use strict';

  var Bookings = {};
  var span = '7';

  var STATUS = ['Booked', 'Confirmed', 'Arrived', 'Done', 'No show', 'Cancelled'];

  function visible() {
    var from = U.today(), to;
    if (span === 'today') to = U.today();
    else if (span === '7') to = U.addDays(U.today(), 6);
    else if (span === '30') to = U.addDays(U.today(), 29);
    else { from = ''; to = ''; }
    return S.db.appointments.filter(function (a) {
      if (from && a.date < from) return false;
      if (to && a.date > to) return false;
      return true;
    }).sort(function (x, y) {
      return (x.date + x.time) < (y.date + y.time) ? -1 : 1;
    });
  }

  Bookings.render = function (host) {
    var list = visible();
    var byDate = U.groupBy(list, function (a) { return a.date; });
    var dates = Object.keys(byDate).sort();
    var missed = S.db.appointments.filter(function (a) {
      return a.date < U.today() && (a.status === 'Booked' || a.status === 'Confirmed');
    });

    host.innerHTML = U.html`
      ${U.raw(App.page('Bookings',
        list.length + ' upcoming slot' + (list.length === 1 ? '' : 's'),
        U.html`<button class="btn ghost" type="button" id="exportBk">Export CSV</button>
               <button class="btn primary" type="button" id="newBk">+ New booking</button>`))}

      <div class="filterbar card">
        ${U.raw(['today', '7', '30', 'all'].map(function (r) {
          var label = { today: 'Today', '7': 'Next 7 days', '30': 'Next 30 days', all: 'Everything' }[r];
          return U.html`<button class="btn ghost sm ${U.raw(span === r ? 'is-on' : '')}" type="button" data-span="${r}">${label}</button>`;
        }).join(''))}
        <span class="filter-note muted sm">Bays: ${S.db.settings.bays.join(' · ')}</span>
      </div>

      ${U.raw(missed.length ? U.html`
        <section class="card alert-card">
          <div class="card-head"><h2>⚠︎ Past bookings not closed</h2></div>
          <ul class="list">${U.raw(missed.slice(0, 6).map(function (a) {
            return U.html`<li class="clickable" data-bk="${a.id}">
              <span class="list-lead">${U.raw(U.fmtDate(a.date))} ${U.raw(U.fmtTime(a.time))} · ${a.name || S.customerName(a.customerId)}</span>
              <span class="muted sm">${a.vehicle || S.vehicleLabel(a.vehicleId)}</span>
              <span class="chip chip-unpaid">${a.status}</span>
            </li>`;
          }).join(''))}</ul>
        </section>` : '')}

      ${U.raw(dates.length ? dates.map(function (d) {
        var day = byDate[d];
        var load = U.groupBy(day.filter(function (a) { return a.status !== 'Cancelled'; }), function (a) { return a.bay || '—'; });
        return U.html`
          <section class="card">
            <div class="card-head">
              <h2>${U.raw(U.dayName(d))}, ${U.raw(U.fmtDate(d))} ${U.raw(d === U.today() ? '<span class="chip chip-soft">today</span>' : '')}</h2>
              <span class="muted sm">${U.raw(Object.keys(load).map(function (k) { return U.esc(k) + ': ' + load[k].length; }).join(' · '))}</span>
            </div>
            <div class="table-scroll"><table class="tight">
              <thead><tr><th>Time</th><th>Customer</th><th>Vehicle</th><th>Services</th><th>Bay</th><th>Technician</th><th>Status</th><th></th></tr></thead>
              <tbody>${U.raw(day.map(function (a) {
                return U.html`<tr class="${U.raw(a.status === 'Cancelled' ? 'row-off' : '')}">
                  <td class="nowrap"><strong>${U.raw(U.fmtTime(a.time))}</strong></td>
                  <td class="clickable" data-bk="${a.id}">${a.name || S.customerName(a.customerId)}
                    ${U.raw(a.phone ? U.html`<br><a class="sm" href="${U.raw(U.telLink(a.phone))}">${a.phone}</a>` : '')}</td>
                  <td class="nowrap">${a.vehicle || S.vehicleLabel(a.vehicleId)}</td>
                  <td class="cell-services">${a.serviceIds.map(function (s) { var sv = S.service(s); return sv ? sv.name : ''; }).filter(Boolean).join(', ')}</td>
                  <td class="muted sm">${a.bay || '—'}</td>
                  <td class="muted sm">${S.staffName(a.staffId)}</td>
                  <td>${U.raw(chip(a.status))}</td>
                  <td class="row-actions">
                    ${U.raw(a.status === 'Booked' || a.status === 'Confirmed' ? U.html`<button class="btn ghost sm" type="button" data-arrive="${a.id}">Arrived</button>` : '')}
                    <button class="linkbtn" type="button" data-bk="${a.id}">Edit</button>
                  </td>
                </tr>`;
              }).join(''))}</tbody>
            </table></div>
          </section>`;
      }).join('') : App.empty('No bookings in this window.',
        U.html`<button class="btn primary" type="button" id="newBk2">Take a booking</button>`))}`;

    U.$$('[data-span]', host).forEach(function (b) {
      b.addEventListener('click', function () { span = this.dataset.span; App.render(); });
    });
    U.$$('[data-bk]', host).forEach(function (el) {
      el.addEventListener('click', function (e) {
        if (e.target.closest('[data-arrive]')) return;
        Bookings.openEditor(this.dataset.bk);
      });
    });
    U.$$('[data-arrive]', host).forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        arrive(this.dataset.arrive);
      });
    });
    U.$('#newBk', host).addEventListener('click', function () { Bookings.openEditor(null); });
    var alt = U.$('#newBk2', host);
    if (alt) alt.addEventListener('click', function () { Bookings.openEditor(null); });
    U.$('#exportBk', host).addEventListener('click', function () {
      var rows = [['Date', 'Time', 'Customer', 'Phone', 'Vehicle', 'Services', 'Bay', 'Technician', 'Status', 'Note']];
      list.forEach(function (a) {
        rows.push([a.date, a.time, a.name || S.customerName(a.customerId), a.phone || '',
          a.vehicle || S.vehicleLabel(a.vehicleId),
          a.serviceIds.map(function (s) { var sv = S.service(s); return sv ? sv.name : ''; }).join(' | '),
          a.bay || '', S.staffName(a.staffId), a.status, a.note || '']);
      });
      U.csv('bookings-' + U.today() + '.csv', rows);
    });
  };

  function chip(status) {
    var cls = status === 'Cancelled' || status === 'No show' ? 'chip-cancelled'
      : status === 'Done' ? 'chip-delivered'
        : status === 'Arrived' ? 'chip-progress' : 'chip-booked';
    return U.html`<span class="chip ${U.raw(cls)}">${status}</span>`;
  }

  function arrive(id) {
    var a = U.pick(S.db.appointments, id);
    if (!a) return;
    a.status = 'Arrived';
    S.save();
    Jobs.openEditor(null, {
      customerId: a.customerId, vehicleId: a.vehicleId, serviceIds: a.serviceIds
    });
    U.toast('Booking marked arrived — job card started');
  }

  Bookings.openEditor = function (id) {
    var a = U.pick(S.db.appointments, id);
    var draft = a || {
      id: '', date: U.today(), time: '10:00', customerId: '', name: '', phone: '',
      vehicle: '', vehicleId: '', serviceIds: [], bay: S.db.settings.bays[0] || '',
      staffId: '', status: 'Booked', note: ''
    };

    U.modal({
      title: a ? 'Booking · ' + U.fmtDate(a.date) : 'New booking',
      size: 'md',
      body: U.html`
        <div class="form-grid three">
          <label>Date<input type="date" name="date" value="${draft.date}"></label>
          <label>Time<input type="time" name="time" value="${draft.time}"></label>
          <label>Status<select name="status">${U.raw(App.options(STATUS, draft.status))}</select></label>
        </div>
        <div class="form-grid three">
          <label>Existing customer
            <select name="customerId" id="bkCust">
              ${U.raw(App.options(S.db.customers.slice().sort(U.by('name')).map(function (c) {
                return { value: c.id, label: c.name + (c.phone ? ' · ' + c.phone : '') };
              }), draft.customerId, { blank: '— new / walk-in —' }))}
            </select>
          </label>
          <label>Name<input type="text" name="name" value="${draft.name || ''}" placeholder="Customer name"></label>
          <label>Phone<input type="tel" name="phone" value="${draft.phone || ''}" placeholder="03xx-xxxxxxx"></label>
        </div>
        <div class="form-grid three">
          <label>Vehicle (saved)
            <select name="vehicleId" id="bkVeh">${U.raw(App.options([], draft.vehicleId, { blank: '— type below —' }))}</select>
          </label>
          <label>Vehicle (free text)<input type="text" name="vehicle" value="${draft.vehicle || ''}" placeholder="ABC-123 Toyota Corolla"></label>
          <label>Bay<select name="bay">${U.raw(App.options(S.db.settings.bays, draft.bay, { blank: '—' }))}</select></label>
        </div>
        <label class="block">Services
          <select name="serviceIds" id="bkSvc" multiple size="6">
            ${U.raw(S.db.services.filter(function (s) { return s.active !== false; }).map(function (s) {
              return U.html`<option value="${s.id}" ${U.raw(draft.serviceIds.indexOf(s.id) >= 0 ? 'selected' : '')}>${s.group} · ${s.name}</option>`;
            }).join(''))}
          </select>
          <span class="muted sm">Hold Ctrl / Cmd (or drag) to pick more than one.</span>
        </label>
        <div class="form-grid two">
          <label>Technician
            <select name="staffId">${U.raw(App.options(S.db.staff.map(function (s) {
              return { value: s.id, label: s.name + ' · ' + s.role };
            }), draft.staffId, { blank: '— not assigned —' }))}</select>
          </label>
          <label>Note<input type="text" name="note" value="${draft.note || ''}" placeholder="Wants delivery before 6 pm"></label>
        </div>`,
      footer: U.html`
        ${U.raw(a ? U.html`<button class="btn ghost danger" type="button" id="delBk">Delete</button>` : '')}
        ${U.raw(a && a.phone ? U.html`<button class="btn ghost" type="button" id="waBk">Remind on WhatsApp</button>` : '')}
        <span class="spacer"></span>
        <button class="btn ghost" type="button" data-close="1">Cancel</button>
        ${U.raw(a ? U.html`<button class="btn ghost" type="button" id="toJob">Convert to job card</button>` : '')}
        <button class="btn primary" type="button" id="saveBk">${a ? 'Save' : 'Add booking'}</button>`,
      onMount: function (wrap) {
        var custSel = wrap.querySelector('#bkCust');
        var vehSel = wrap.querySelector('#bkVeh');
        function paintVeh() {
          var list = custSel.value ? S.vehiclesOf(custSel.value) : [];
          vehSel.innerHTML = App.options(list.map(function (v) {
            return { value: v.id, label: (v.reg || '—') + ' · ' + [v.make, v.model].filter(Boolean).join(' ') };
          }), draft.vehicleId, { blank: '— type below —' });
        }
        custSel.addEventListener('change', function () {
          var c = S.customer(this.value);
          if (c) {
            wrap.querySelector('[name="name"]').value = c.name;
            wrap.querySelector('[name="phone"]').value = c.phone || '';
          }
          paintVeh();
        });
        paintVeh();

        wrap.querySelector('#saveBk').addEventListener('click', function () {
          var f = U.formData(wrap);
          var chosen = U.$$('#bkSvc option', wrap).filter(function (o) { return o.selected; })
            .map(function (o) { return o.value; });
          var rec = a || { id: U.uid('ap') };
          rec.date = f.date; rec.time = f.time; rec.status = f.status;
          rec.customerId = f.customerId; rec.name = f.name; rec.phone = f.phone;
          rec.vehicleId = f.vehicleId; rec.vehicle = f.vehicle;
          rec.bay = f.bay; rec.staffId = f.staffId; rec.note = f.note;
          rec.serviceIds = chosen;
          if (!rec.name && rec.customerId) rec.name = S.customerName(rec.customerId);
          if (!a) S.db.appointments.push(rec);
          U.closeModal(); App.refresh();
          U.toast(a ? 'Booking updated' : 'Booking added');
        });

        var del = wrap.querySelector('#delBk');
        if (del) del.addEventListener('click', function () {
          U.confirm('Delete this booking?', { danger: true, ok: 'Delete' }).then(function (ok) {
            if (!ok) return;
            S.db.appointments = S.db.appointments.filter(function (x) { return x.id !== a.id; });
            U.closeModal(); App.refresh(); U.toast('Booking deleted');
          });
        });
        var toJob = wrap.querySelector('#toJob');
        if (toJob) toJob.addEventListener('click', function () {
          U.closeModal(); arrive(a.id);
        });
        var wa = wrap.querySelector('#waBk');
        if (wa) wa.addEventListener('click', function () {
          var msg = [S.db.settings.workshopName,
            'Reminder: your booking is on ' + U.fmtDate(a.date) + ' at ' + U.fmtTime(a.time) + '.',
            a.serviceIds.length ? 'Service: ' + a.serviceIds.map(function (s) {
              var sv = S.service(s); return sv ? sv.name : '';
            }).filter(Boolean).join(', ') : '',
            'Please reply to confirm.'].filter(Boolean).join('\n');
          window.open(U.waLink(a.phone, msg), '_blank', 'noopener');
        });
      }
    });
  };

  App.register('bookings', Bookings);
  global.Bookings = Bookings;
})(window);

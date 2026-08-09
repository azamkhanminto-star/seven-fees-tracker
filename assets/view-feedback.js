/* ============================================================
   3M Detailing — customer feedback centre
   Ratings per job, per aspect and per technician, open complaints
   that need a reply, and a tablet form the customer fills in.
   ============================================================ */
(function (global) {
  'use strict';

  var Feedback = {};
  var filter = { rating: '', status: 'all', q: '', range: 'all' };

  function visible() {
    var from = '';
    if (filter.range === '30') from = U.addDays(U.today(), -29);
    else if (filter.range === '90') from = U.addDays(U.today(), -89);
    else if (filter.range === 'month') from = U.monthStart();

    return S.db.feedback.filter(function (f) {
      if (from && f.date < from) return false;
      if (filter.rating && Math.round(U.n(f.rating)) !== +filter.rating) return false;
      if (filter.status === 'open' && !(U.n(f.rating) <= 3 && f.status !== 'resolved')) return false;
      if (filter.status === 'resolved' && f.status !== 'resolved') return false;
      if (filter.q) {
        var job = S.job(f.jobId);
        var hay = [f.comment, S.customerName(f.customerId), job && job.no, S.staffName(f.staffId)].join(' ');
        if (!U.matches(hay, filter.q)) return false;
      }
      return true;
    }).sort(U.desc('date'));
  }

  Feedback.render = function (host) {
    var list = visible();
    var stats = S.feedbackStats(list);
    var all = S.feedbackStats();
    var pending = S.feedbackPending();
    var staffRatings = S.staffRatings();

    host.innerHTML = U.html`
      ${U.raw(App.page('Customer feedback',
        all.count ? all.avg.toFixed(1) + ' ★ average from ' + all.count + ' reviews · ' + all.open + ' open complaint' + (all.open === 1 ? '' : 's')
          : 'No feedback collected yet — start with the tablet form',
        U.html`<button class="btn ghost" type="button" id="exportFb">Export CSV</button>
               <button class="btn ghost" type="button" id="kioskFb">Tablet mode</button>
               <button class="btn primary" type="button" id="newFb">+ Record feedback</button>`))}

      <div class="tiles">
        ${U.raw(App.tile('Average rating', (stats.count ? stats.avg.toFixed(1) : '0.0') + ' ★',
          stats.count + ' reviews in view', 'star'))}
        ${U.raw(App.tile('Happy customers', Math.round(stats.satisfaction) + '%', '4 ★ and above', 'good'))}
        ${U.raw(App.tile('Recommend score', String(stats.nps),
          stats.promoters + ' promoters · ' + stats.detractors + ' unhappy', stats.nps >= 50 ? 'good' : stats.nps >= 0 ? 'work' : 'bad'))}
        ${U.raw(App.tile('Open complaints', String(stats.open), '3 ★ or less, not resolved', stats.open ? 'bad' : 'good'))}
        ${U.raw(App.tile('Feedback pending', String(pending.length), 'delivered, not yet reviewed', 'work'))}
        ${U.raw(App.tile('Response rate', (S.db.jobs.filter(function (j) { return j.status === 'Delivered'; }).length
          ? Math.round(all.count / S.db.jobs.filter(function (j) { return j.status === 'Delivered'; }).length * 100) : 0) + '%',
          'of delivered job cards', 'in'))}
      </div>

      <div class="cols">
        <section class="card">
          <div class="card-head"><h2>Rating spread</h2><span class="muted sm">${stats.count} reviews</span></div>
          <div class="dist">
            ${U.raw([5, 4, 3, 2, 1].map(function (r) {
              var c = stats.dist[r - 1];
              var pct = stats.count ? (c / stats.count) * 100 : 0;
              return U.html`<div class="dist-row">
                <span class="dist-label">${U.raw(String(r))} ★</span>
                <span class="share-track"><span class="share-fill ${U.raw(r >= 4 ? 'good' : r === 3 ? 'warn' : 'bad')}" style="width:${U.raw(pct.toFixed(1))}%"></span></span>
                <span class="num sm">${U.raw(String(c))}</span>
              </div>`;
            }).join(''))}
          </div>
        </section>
        <section class="card">
          <div class="card-head"><h2>What they rate us on</h2><span class="muted sm">average out of 5</span></div>
          <div class="dist">
            ${U.raw(stats.aspects.map(function (a) {
              return U.html`<div class="dist-row">
                <span class="dist-label wide">${a.label}</span>
                <span class="share-track"><span class="share-fill ${U.raw(a.avg >= 4 ? 'good' : a.avg >= 3 ? 'warn' : 'bad')}" style="width:${U.raw((a.avg / 5 * 100).toFixed(1))}%"></span></span>
                <span class="num sm">${U.raw(a.avg ? a.avg.toFixed(1) : '—')}</span>
              </div>`;
            }).join(''))}
          </div>
        </section>
      </div>

      ${U.raw(staffRatings.length ? U.html`
      <section class="card">
        <div class="card-head"><h2>Technician ratings</h2><span class="muted sm">from linked job cards</span></div>
        <div class="table-scroll"><table class="tight">
          <thead><tr><th>Technician</th><th>Rating</th><th class="num">Reviews</th></tr></thead>
          <tbody>${U.raw(staffRatings.map(function (r) {
            return U.html`<tr><td>${r.name}</td>
              <td>${U.raw(U.stars(r.avg))} <span class="muted sm">${U.raw(r.avg.toFixed(1))}</span></td>
              <td class="num">${U.raw(String(r.count))}</td></tr>`;
          }).join(''))}</tbody>
        </table></div>
      </section>` : '')}

      ${U.raw(pending.length ? U.html`
      <section class="card">
        <div class="card-head"><h2>Ask these customers for feedback</h2>
          <span class="muted sm">${pending.length} delivered job cards with no review</span></div>
        <div class="table-scroll"><table class="tight">
          <thead><tr><th>Job</th><th>Delivered</th><th>Customer</th><th>Vehicle</th><th class="num">Bill</th><th></th></tr></thead>
          <tbody>${U.raw(pending.slice(0, 10).map(function (j) {
            return U.html`<tr>
              <td><strong>${j.no}</strong></td>
              <td class="nowrap sm">${U.raw(U.fmtDateShort(j.deliveredAt || j.date))}</td>
              <td>${S.customerName(j.customerId)}</td>
              <td class="sm">${S.vehicleLabel(j.vehicleId)}</td>
              <td class="num">${U.raw(U.money(S.totals(j).total))}</td>
              <td class="row-actions">
                <button class="btn ghost sm" type="button" data-ask="${j.id}">Ask on WhatsApp</button>
                <button class="btn ghost sm" type="button" data-take="${j.id}">Record</button>
              </td>
            </tr>`;
          }).join(''))}</tbody>
        </table></div>
      </section>` : '')}

      <div class="filterbar card">
        <input type="search" id="fq" class="grow" placeholder="Search comments, customer, job no…" value="${filter.q}">
        <select id="frating">${U.raw(App.options([
          { value: '5', label: '5 ★ only' }, { value: '4', label: '4 ★ only' }, { value: '3', label: '3 ★ only' },
          { value: '2', label: '2 ★ only' }, { value: '1', label: '1 ★ only' }], filter.rating, { blank: 'All ratings' }))}</select>
        <select id="fstatus">${U.raw(App.options([
          { value: 'all', label: 'All feedback' }, { value: 'open', label: 'Open complaints' },
          { value: 'resolved', label: 'Resolved' }], filter.status))}</select>
        <select id="frange">${U.raw(App.options([
          { value: 'all', label: 'All time' }, { value: 'month', label: 'This month' },
          { value: '30', label: 'Last 30 days' }, { value: '90', label: 'Last 90 days' }], filter.range))}</select>
        <span class="filter-note muted sm">${list.length} shown</span>
      </div>

      ${U.raw(list.length ? U.html`<div class="fb-list">${U.raw(list.map(card).join(''))}</div>`
        : App.empty('No feedback matches this filter.',
          U.html`<button class="btn primary" type="button" id="newFb2">Record feedback</button>`))}`;

    U.$('#fq', host).addEventListener('input', function () {
      filter.q = this.value;
      var pos = this.selectionStart;
      App.render();
      var f = U.$('#fq'); f.focus(); f.setSelectionRange(pos, pos);
    });
    ['frating', 'fstatus', 'frange'].forEach(function (id) {
      U.$('#' + id, host).addEventListener('change', function () {
        filter[id.slice(1)] = this.value;
        App.render();
      });
    });
    U.$('#newFb', host).addEventListener('click', function () { Feedback.openForm({}); });
    var alt = U.$('#newFb2', host);
    if (alt) alt.addEventListener('click', function () { Feedback.openForm({}); });
    U.$('#kioskFb', host).addEventListener('click', function () { Feedback.openForm({ kiosk: true }); });
    U.$('#exportFb', host).addEventListener('click', function () { exportCSV(list); });

    U.$$('[data-ask]', host).forEach(function (b) {
      b.addEventListener('click', function () { askOnWhatsApp(this.dataset.ask); });
    });
    U.$$('[data-take]', host).forEach(function (b) {
      b.addEventListener('click', function () { Feedback.openForm({ jobId: this.dataset.take }); });
    });
    U.$$('[data-fb]', host).forEach(function (el) {
      el.addEventListener('click', function (e) {
        if (e.target.closest('button')) return;
        Feedback.openForm({ id: this.dataset.fb });
      });
    });
    U.$$('[data-resolve]', host).forEach(function (b) {
      b.addEventListener('click', function () { resolveDialog(this.dataset.resolve); });
    });
    U.$$('[data-reply]', host).forEach(function (b) {
      b.addEventListener('click', function () { replyOnWhatsApp(this.dataset.reply); });
    });
  };

  function card(f) {
    var job = S.job(f.jobId);
    var cust = S.customer(f.customerId);
    var open = U.n(f.rating) <= 3 && f.status !== 'resolved';
    return U.html`
      <article class="fb-card ${U.raw(open ? 'is-open' : '')} clickable" data-fb="${f.id}">
        <header>
          <span class="fb-stars">${U.raw(U.stars(f.rating))}</span>
          <strong>${cust ? cust.name : 'Walk-in customer'}</strong>
          <span class="muted sm">${U.raw(U.fmtDate(f.date))}${U.raw(job ? ' · ' + U.esc(job.no) : '')}${U.raw(f.source ? ' · via ' + U.esc(f.source) : '')}</span>
          ${U.raw(open ? U.html`<span class="chip chip-unpaid">needs attention</span>`
            : f.status === 'resolved' ? U.html`<span class="chip chip-paid">resolved</span>` : '')}
        </header>
        ${U.raw(f.comment ? U.html`<p class="fb-comment">“${f.comment}”</p>` : U.html`<p class="muted sm">No comment left.</p>`)}
        <div class="fb-aspects sm muted">
          ${U.raw(S.ASPECTS.map(function (a) {
            var v = U.n(f.aspects && f.aspects[a.key]);
            return v ? U.html`<span>${a.label}: <strong>${U.raw(String(v))}</strong>/5</span>` : '';
          }).join(''))}
          ${U.raw(f.staffId ? U.html`<span>Technician: <strong>${S.staffName(f.staffId)}</strong></span>` : '')}
          ${U.raw(job ? U.html`<span>Work: ${job.items.map(function (i) { return i.name; }).join(', ')}</span>` : '')}
        </div>
        ${U.raw(f.reply ? U.html`<p class="fb-reply sm"><strong>Our reply:</strong> ${f.reply}</p>` : '')}
        <footer class="row-actions">
          ${U.raw(cust && cust.phone ? U.html`<button class="btn ghost sm" type="button" data-reply="${f.id}">Reply on WhatsApp</button>` : '')}
          ${U.raw(open ? U.html`<button class="btn ghost sm" type="button" data-resolve="${f.id}">Mark resolved</button>` : '')}
        </footer>
      </article>`;
  }

  /* ── record / edit feedback ────────────────────────────── */
  Feedback.openForm = function (opts) {
    opts = opts || {};
    var existing = opts.id ? U.pick(S.db.feedback, opts.id) : null;
    var job = S.job(existing ? existing.jobId : opts.jobId);
    var draft = existing || {
      id: '', date: U.today(), jobId: job ? job.id : '',
      customerId: job ? job.customerId : (opts.customerId || ''),
      staffId: job && job.items[0] ? job.items[0].staffId : '',
      rating: 5, aspects: { quality: 5, time: 5, staff: 5, value: 5 },
      comment: '', recommend: true, source: opts.kiosk ? 'form' : 'staff', status: 'new', reply: ''
    };
    var kiosk = !!opts.kiosk;

    var recentJobs = S.db.jobs.slice().sort(U.desc('date')).slice(0, 200);

    U.modal({
      title: kiosk ? 'How did we do?' : (existing ? 'Feedback · ' + S.customerName(draft.customerId) : 'Record customer feedback'),
      size: kiosk ? 'lg' : 'md',
      noAutofocus: kiosk,
      body: U.html`
        ${U.raw(kiosk ? U.html`<p class="kiosk-lead">Please rate your experience at ${S.db.settings.workshopName}.
          It takes ten seconds and helps us serve you better.</p>` : '')}

        <div class="form-grid ${U.raw(kiosk ? 'two' : 'three')}">
          <label>Job card
            <select name="jobId" id="fbJob">
              ${U.raw(App.options(recentJobs.map(function (j) {
                return { value: j.id, label: j.no + ' · ' + S.customerName(j.customerId) + ' · ' + S.vehicleLabel(j.vehicleId) };
              }), draft.jobId, { blank: '— not linked —' }))}
            </select>
          </label>
          <label>Customer
            <select name="customerId" id="fbCust">
              ${U.raw(App.options(S.db.customers.slice().sort(U.by('name')).map(function (c) {
                return { value: c.id, label: c.name };
              }), draft.customerId, { blank: '— walk-in —' }))}
            </select>
          </label>
          ${U.raw(kiosk ? '' : U.html`<label>Date<input type="date" name="date" value="${draft.date}"></label>`)}
        </div>

        <div class="rating-block">
          <span class="rating-title">Overall experience</span>
          ${U.raw(starPicker('rating', draft.rating, true))}
        </div>

        <div class="aspect-grid">
          ${U.raw(S.ASPECTS.map(function (a) {
            return U.html`<div class="rating-block small">
              <span class="rating-title">${a.label}</span>
              ${U.raw(starPicker('asp_' + a.key, (draft.aspects && draft.aspects[a.key]) || 0, false))}
            </div>`;
          }).join(''))}
        </div>

        <label class="block">Comments
          <textarea name="comment" rows="3" placeholder="What did you like? What should we improve?">${draft.comment || ''}</textarea>
        </label>

        <div class="form-grid ${U.raw(kiosk ? 'one' : 'three')}">
          <label class="check"><input type="checkbox" name="recommend" ${U.raw(draft.recommend ? 'checked' : '')}> Would recommend us to others</label>
          ${U.raw(kiosk ? '' : U.html`
          <label>Technician
            <select name="staffId">${U.raw(App.options(S.db.staff.map(function (s) {
              return { value: s.id, label: s.name };
            }), draft.staffId, { blank: '—' }))}</select>
          </label>
          <label>Collected via
            <select name="source">${U.raw(App.options(['form', 'staff', 'phone', 'whatsapp', 'google'], draft.source))}</select>
          </label>`)}
        </div>

        ${U.raw(existing ? U.html`<label class="block">Our reply / action taken
          <textarea name="reply" rows="2" placeholder="Called the customer, redone the polish free of cost…">${existing.reply || ''}</textarea></label>` : '')}`,
      footer: U.html`
        ${U.raw(existing ? U.html`<button class="btn ghost danger" type="button" id="delFb">Delete</button>` : '')}
        <span class="spacer"></span>
        <button class="btn ghost" type="button" data-close="1">${kiosk ? 'Close' : 'Cancel'}</button>
        <button class="btn primary" type="button" id="saveFb">${kiosk ? 'Submit feedback' : (existing ? 'Save' : 'Save feedback')}</button>`,
      onMount: function (wrap) {
        wireStars(wrap);
        var jobSel = wrap.querySelector('#fbJob');
        jobSel.addEventListener('change', function () {
          var j = S.job(this.value);
          if (j) {
            wrap.querySelector('#fbCust').value = j.customerId || '';
            var st = wrap.querySelector('[name="staffId"]');
            if (st && j.items[0]) st.value = j.items[0].staffId || '';
          }
        });
        wrap.querySelector('#saveFb').addEventListener('click', function () {
          var f = U.formData(wrap);
          var rec = existing || { id: U.uid('fb'), status: 'new' };
          rec.date = f.date || U.today();
          rec.jobId = f.jobId || '';
          rec.customerId = f.customerId || (S.job(f.jobId) ? S.job(f.jobId).customerId : '');
          rec.rating = U.n(f.rating) || 5;
          rec.aspects = {
            quality: U.n(f.asp_quality), time: U.n(f.asp_time),
            staff: U.n(f.asp_staff), value: U.n(f.asp_value)
          };
          rec.comment = f.comment || '';
          rec.recommend = !!f.recommend;
          rec.staffId = f.staffId || rec.staffId || '';
          rec.source = f.source || (kiosk ? 'form' : 'staff');
          if (f.reply !== undefined) rec.reply = f.reply;
          if (rec.rating >= 4) rec.status = 'resolved';
          if (!existing) S.db.feedback.push(rec);
          U.closeModal();
          App.refresh();
          U.toast(kiosk ? 'Thank you for your feedback!' : 'Feedback saved');
          if (kiosk) setTimeout(function () { Feedback.openForm({ kiosk: true }); }, 1200);
        });
        var del = wrap.querySelector('#delFb');
        if (del) del.addEventListener('click', function () {
          U.confirm('Delete this feedback?', { danger: true, ok: 'Delete' }).then(function (ok) {
            if (!ok) return;
            S.db.feedback = S.db.feedback.filter(function (x) { return x.id !== existing.id; });
            U.closeModal(); App.refresh(); U.toast('Feedback deleted');
          });
        });
      }
    });
  };

  function starPicker(name, value, big) {
    var out = '<div class="star-picker ' + (big ? 'big' : '') + '" data-name="' + U.esc(name) + '">';
    for (var i = 1; i <= 5; i++) {
      out += '<button type="button" class="star ' + (i <= U.n(value) ? 'on' : '') + '" data-v="' + i + '" aria-label="' + i + ' star">★</button>';
    }
    out += '<input type="hidden" name="' + U.esc(name) + '" value="' + U.n(value) + '">';
    out += '</div>';
    return out;
  }

  function wireStars(wrap) {
    U.$$('.star-picker', wrap).forEach(function (pick) {
      var input = pick.querySelector('input');
      U.$$('.star', pick).forEach(function (btn) {
        btn.addEventListener('click', function () {
          var v = +this.dataset.v;
          input.value = v;
          U.$$('.star', pick).forEach(function (b) {
            b.classList.toggle('on', +b.dataset.v <= v);
          });
        });
      });
    });
  }

  /* ── actions ───────────────────────────────────────────── */
  function resolveDialog(id) {
    var f = U.pick(S.db.feedback, id);
    if (!f) return;
    U.modal({
      title: 'Close this complaint',
      body: U.html`
        <p class="sm">${U.raw(U.stars(f.rating))} — “${f.comment || 'no comment'}”</p>
        <label class="block">What did you do about it?
          <textarea name="reply" rows="3" placeholder="Called the customer and re-polished the bonnet free of charge.">${f.reply || ''}</textarea>
        </label>`,
      footer: U.html`
        <button class="btn ghost" type="button" data-close="1">Cancel</button>
        <button class="btn primary" type="button" id="doResolve">Mark resolved</button>`,
      onMount: function (wrap) {
        wrap.querySelector('#doResolve').addEventListener('click', function () {
          f.reply = U.formData(wrap).reply;
          f.status = 'resolved';
          f.resolvedAt = U.today();
          U.closeModal(); App.refresh(); U.toast('Complaint closed');
        });
      }
    });
  }

  function askOnWhatsApp(jobId) {
    var job = S.job(jobId);
    if (!job) return;
    var c = S.customer(job.customerId);
    if (!c || !c.phone) { U.toast('No phone number for this customer', 'warn'); return; }
    var msg = [
      S.db.settings.workshopName,
      'Thank you for visiting us on ' + U.fmtDate(job.deliveredAt || job.date) + '.',
      'Work done: ' + job.items.map(function (i) { return i.name; }).join(', '),
      '',
      'How was your experience? Please reply with a rating out of 5 (5 = excellent) and any suggestion.',
      'Your feedback decides what we fix next.'
    ].join('\n');
    window.open(U.waLink(c.phone, msg), '_blank', 'noopener');
  }

  function replyOnWhatsApp(id) {
    var f = U.pick(S.db.feedback, id);
    var c = f && S.customer(f.customerId);
    if (!c || !c.phone) { U.toast('No phone number saved', 'warn'); return; }
    var msg = U.n(f.rating) >= 4
      ? 'Thank you for the ' + Math.round(f.rating) + '-star rating! We are glad you liked the work. — ' + S.db.settings.workshopName
      : 'We are sorry your experience was not up to the mark. Please tell us what went wrong and we will make it right. — ' + S.db.settings.workshopName;
    window.open(U.waLink(c.phone, msg), '_blank', 'noopener');
  }

  function exportCSV(list) {
    var rows = [['Date', 'Job no', 'Customer', 'Phone', 'Rating', 'Quality', 'On time',
      'Staff behaviour', 'Value', 'Recommend', 'Technician', 'Source', 'Status', 'Comment', 'Reply']];
    list.forEach(function (f) {
      var job = S.job(f.jobId), c = S.customer(f.customerId);
      rows.push([f.date, job ? job.no : '', c ? c.name : '', c ? c.phone : '', f.rating,
        f.aspects && f.aspects.quality, f.aspects && f.aspects.time,
        f.aspects && f.aspects.staff, f.aspects && f.aspects.value,
        f.recommend ? 'Yes' : 'No', S.staffName(f.staffId), f.source, f.status,
        f.comment || '', f.reply || '']);
    });
    U.csv('feedback-' + U.today() + '.csv', rows);
  }

  App.register('feedback', Feedback);
  global.Feedback = Feedback;
})(window);

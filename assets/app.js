/* ============================================================
   3M Detailing — shell
   Boots the store, renders the tab bar, routes to a view and
   owns the bits every view shares (search, theme, headers).
   ============================================================ */
(function (global) {
  'use strict';

  var App = { views: {}, state: { view: 'dashboard' } };

  App.register = function (name, view) { App.views[name] = view; };

  /* ── layout helpers used by every view ─────────────────── */
  App.page = function (title, subtitle, actionsHtml) {
    return U.html`
      <div class="page-head">
        <div>
          <h1>${title}</h1>
          ${U.raw(subtitle ? U.html`<p class="muted sm">${subtitle}</p>` : '')}
        </div>
        <div class="page-actions">${U.raw(actionsHtml || '')}</div>
      </div>`;
  };

  App.empty = function (message, actionHtml) {
    return U.html`<div class="empty">
      <p>${message}</p>${U.raw(actionHtml || '')}
    </div>`;
  };

  App.tile = function (label, value, sub, accent) {
    return U.html`
      <div class="tile ${U.raw(accent ? 'accent-' + accent : '')}">
        <span class="tile-label">${label}</span>
        <strong class="tile-value">${U.raw(value)}</strong>
        <span class="tile-sub muted sm">${U.raw(sub || '')}</span>
      </div>`;
  };

  App.statusChip = function (status) {
    var map = {
      'Booked': 'chip-booked', 'Received': 'chip-received', 'In Progress': 'chip-progress',
      'Ready': 'chip-ready', 'Delivered': 'chip-delivered', 'Cancelled': 'chip-cancelled'
    };
    return U.html`<span class="chip ${U.raw(map[status] || '')}">${status}</span>`;
  };

  App.payChip = function (job) {
    var st = S.payStatus(job);
    var cls = st === 'Paid' ? 'chip-paid' : st === 'Part paid' ? 'chip-part' : st === 'Unpaid' ? 'chip-unpaid' : '';
    return U.html`<span class="chip ${U.raw(cls)}">${st}</span>`;
  };

  /* Select options helper. */
  App.options = function (list, selected, opts) {
    opts = opts || {};
    var out = opts.blank ? U.html`<option value="">${opts.blank}</option>` : '';
    list.forEach(function (o) {
      var value = typeof o === 'string' ? o : o.value;
      var label = typeof o === 'string' ? o : o.label;
      out += U.html`<option value="${value}" ${U.raw(String(value) === String(selected) ? 'selected' : '')}>${label}</option>`;
    });
    return out;
  };

  /* ── routing ───────────────────────────────────────────── */
  App.go = function (view, opts) {
    if (!App.views[view]) view = 'dashboard';
    App.state.view = view;
    App.state.params = (opts && opts.params) || null;
    if (location.hash.slice(1).split('/')[0] !== view) {
      history.replaceState(null, '', '#' + view);
    }
    U.$$('#tabs .tab').forEach(function (t) {
      t.classList.toggle('is-active', t.dataset.view === view);
    });
    App.render();
  };

  App.render = function () {
    var host = U.$('#app');
    var view = App.views[App.state.view];
    host.innerHTML = '';
    host.scrollTop = 0;
    if (!view) { host.innerHTML = App.empty('View not found.'); return; }
    view.render(host, App.state.params || {});
    App.state.params = null;
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  /* Re-render the current view in place (after a data change). */
  App.refresh = function () {
    S.save();
    App.paintChrome();
    App.render();
  };

  App.paintChrome = function () {
    var s = S.db.settings;
    U.$('#shopName').textContent = s.workshopName || '3M Detailing';
    var open = S.db.jobs.filter(S.isOpen).length;
    U.$('#shopSub').textContent = U.fmtDate(U.today()) + ' · ' + open + ' vehicle' + (open === 1 ? '' : 's') + ' in workshop';
    document.title = (s.workshopName || '3M Detailing') + ' — Workshop Management';
  };

  /* ── theme ─────────────────────────────────────────────── */
  App.applyTheme = function () {
    var t = S.db.settings.theme || 'auto';
    if (t === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
  };

  /* ── global search ─────────────────────────────────────── */
  function runSearch(q) {
    var box = U.$('#searchResults');
    q = String(q || '').trim();
    if (q.length < 2) { box.hidden = true; box.innerHTML = ''; return; }

    var hits = [];
    S.db.jobs.forEach(function (j) {
      if (hits.length > 40) return;
      var veh = S.vehicle(j.vehicleId);
      var hay = [j.no, S.customerName(j.customerId), veh && veh.reg, veh && veh.make, veh && veh.model].join(' ');
      if (U.matches(hay, q)) {
        hits.push({
          type: 'Job card', label: j.no + ' · ' + S.customerName(j.customerId),
          sub: S.vehicleLabel(j.vehicleId) + ' · ' + j.status + ' · ' + U.fmtDate(j.date),
          go: function () { App.go('jobs'); Jobs.openJob(j.id); }
        });
      }
    });
    S.db.customers.forEach(function (c) {
      if (U.matches(c.name + ' ' + c.phone + ' ' + (c.email || ''), q)) {
        var st = S.customerStats(c.id);
        hits.push({
          type: 'Customer', label: c.name,
          sub: (c.phone || 'no phone') + ' · ' + st.visits + ' visits · ' + U.money(st.spend),
          go: function () { App.go('customers'); Customers.openCustomer(c.id); }
        });
      }
    });
    S.db.vehicles.forEach(function (v) {
      if (U.matches([v.reg, v.make, v.model, v.color].join(' '), q)) {
        hits.push({
          type: 'Vehicle', label: (v.reg || '—') + ' · ' + v.make + ' ' + v.model,
          sub: S.customerName(v.customerId) + ' · ' + v.size,
          go: function () { App.go('customers'); Customers.openCustomer(v.customerId); }
        });
      }
    });

    if (!hits.length) {
      box.innerHTML = U.html`<div class="search-empty muted sm">No match for “${q}”.</div>`;
      box.hidden = false;
      return;
    }
    box.innerHTML = hits.slice(0, 12).map(function (h, i) {
      return U.html`<button class="search-hit" type="button" data-i="${i}">
        <span class="hit-type">${h.type}</span>
        <span class="hit-label">${h.label}</span>
        <span class="hit-sub muted sm">${h.sub}</span>
      </button>`;
    }).join('');
    box.hidden = false;
    U.$$('.search-hit', box).forEach(function (btn, i) {
      btn.addEventListener('click', function () {
        box.hidden = true;
        U.$('#globalSearch').value = '';
        hits[i].go();
      });
    });
  }

  /* ── boot ──────────────────────────────────────────────── */
  function boot() {
    S.load();
    App.applyTheme();
    App.paintChrome();

    U.$('#tabs').addEventListener('click', function (e) {
      var tab = e.target.closest('.tab');
      if (tab) App.go(tab.dataset.view);
    });

    document.addEventListener('click', function (e) {
      var nav = e.target.closest('[data-nav]');
      if (nav) { e.preventDefault(); App.go(nav.dataset.nav); return; }
      if (e.target.closest('[data-close]')) { U.closeModal(); return; }
      if (!e.target.closest('.topbar-search')) {
        var box = U.$('#searchResults');
        if (box) box.hidden = true;
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (U.$('#modal').classList.contains('open')) U.closeModal();
        else U.$('#searchResults').hidden = true;
      }
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT' &&
        document.activeElement.tagName !== 'TEXTAREA' && document.activeElement.tagName !== 'SELECT') {
        e.preventDefault();
        U.$('#globalSearch').focus();
      }
    });

    U.$('#globalSearch').addEventListener('input', function () { runSearch(this.value); });
    U.$('#globalSearch').addEventListener('focus', function () { if (this.value) runSearch(this.value); });

    U.$('#btnNewJob').addEventListener('click', function () {
      App.go('jobs');
      Jobs.openJob(null);
    });

    U.$('#themeToggle').addEventListener('click', function () {
      var order = ['auto', 'light', 'dark'];
      var cur = S.db.settings.theme || 'auto';
      var next = order[(order.indexOf(cur) + 1) % order.length];
      S.db.settings.theme = next;
      S.save();
      App.applyTheme();
      U.toast('Theme: ' + next);
    });

    window.addEventListener('hashchange', function () {
      var v = location.hash.slice(1).split('/')[0];
      if (v && v !== App.state.view) App.go(v);
    });

    var start = location.hash.slice(1).split('/')[0] || 'dashboard';
    App.go(start);

    if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
      navigator.serviceWorker.register('sw.js').catch(function () { /* offline support is optional */ });
    }

    if (!S.db.seeded && !S.db.jobs.length) {
      setTimeout(firstRunPrompt, 400);
    }
  }

  function firstRunPrompt() {
    U.modal({
      title: 'Welcome to 3M Detailing',
      body: U.html`
        <p>This is your workshop manager — job cards, bookings, customers,
        feedback, stock and accounts, all stored on this device.</p>
        <p class="muted sm">Want to look around with sample data first? You can erase it
        any time from <strong>Setup → Data</strong>.</p>`,
      footer: U.html`
        <button class="btn ghost" type="button" data-close="1">Start empty</button>
        <button class="btn primary" type="button" id="seedNow">Load sample data</button>`,
      onMount: function (wrap) {
        wrap.querySelector('#seedNow').addEventListener('click', function () {
          S.seed();
          U.closeModal();
          App.refresh();
          U.toast('Sample workshop loaded');
        });
      },
      onClose: function () { S.db.seeded = true; S.save(); }
    });
  }

  global.App = App;
  document.addEventListener('DOMContentLoaded', boot);
})(window);

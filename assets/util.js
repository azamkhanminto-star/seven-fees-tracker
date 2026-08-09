/* ============================================================
   3M Detailing — shared helpers
   Formatting, DOM, dialogs, CSV, printing and small SVG charts.
   Everything hangs off the global `U`.
   ============================================================ */
(function (global) {
  'use strict';

  var U = {};

  /* ── DOM ───────────────────────────────────────────────── */
  U.$ = function (sel, root) { return (root || document).querySelector(sel); };
  U.$$ = function (sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  };

  U.esc = function (v) {
    if (v === null || v === undefined) return '';
    return String(v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  /* Tagged template that escapes every interpolated value.
     Use U.raw(x) to opt a fragment out of escaping. */
  function Raw(s) { this.s = s; }
  U.raw = function (s) { return new Raw(s); };
  U.html = function (strings) {
    var out = strings[0];
    for (var i = 1; i < arguments.length; i++) {
      var v = arguments[i];
      if (v instanceof Raw) out += v.s;
      else if (Array.isArray(v)) {
        out += v.map(function (x) { return x instanceof Raw ? x.s : U.esc(x); }).join('');
      } else out += U.esc(v);
      out += strings[i];
    }
    return out;
  };

  /* ── ids ───────────────────────────────────────────────── */
  U.uid = function (prefix) {
    return (prefix || 'id') + '_' +
      Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  };

  /* ── numbers & money ───────────────────────────────────── */
  U.n = function (v) {
    var x = typeof v === 'number' ? v : parseFloat(String(v || '').replace(/,/g, ''));
    return isFinite(x) ? x : 0;
  };
  U.round2 = function (v) { return Math.round(U.n(v) * 100) / 100; };

  U.currency = 'Rs';
  U.money = function (v, opts) {
    var x = U.round2(v);
    var neg = x < 0;
    var s = Math.abs(x).toLocaleString('en-US', {
      minimumFractionDigits: (opts && opts.decimals) || 0,
      maximumFractionDigits: (opts && opts.decimals) || 0
    });
    return (neg ? '-' : '') + U.currency + ' ' + s;
  };
  U.numFmt = function (v, d) {
    return U.n(v).toLocaleString('en-US', {
      minimumFractionDigits: d || 0, maximumFractionDigits: d === undefined ? 2 : d
    });
  };
  U.compact = function (v) {
    var x = U.n(v), a = Math.abs(x);
    if (a >= 10000000) return (x / 10000000).toFixed(2) + ' Cr';
    if (a >= 100000) return (x / 100000).toFixed(2) + ' L';
    if (a >= 1000) return (x / 1000).toFixed(1) + 'k';
    return String(Math.round(x));
  };

  /* ── dates (all stored as YYYY-MM-DD) ──────────────────── */
  U.today = function () { return U.iso(new Date()); };
  U.iso = function (d) {
    var p = function (x) { return (x < 10 ? '0' : '') + x; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  };
  U.parse = function (s) {
    if (!s) return null;
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s));
    if (!m) return null;
    return new Date(+m[1], +m[2] - 1, +m[3]);
  };
  U.addDays = function (s, days) {
    var d = U.parse(s) || new Date();
    d.setDate(d.getDate() + days);
    return U.iso(d);
  };
  U.addMonths = function (s, months) {
    var d = U.parse(s) || new Date();
    var day = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + months);
    var last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(day, last));
    return U.iso(d);
  };
  U.daysBetween = function (a, b) {
    var da = U.parse(a), db = U.parse(b);
    if (!da || !db) return 0;
    return Math.round((db - da) / 86400000);
  };
  U.monthKey = function (s) { return String(s || '').slice(0, 7); };
  U.monthStart = function (s) { return U.monthKey(s || U.today()) + '-01'; };
  U.MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  U.fmtDate = function (s) {
    var d = U.parse(s);
    if (!d) return '—';
    return d.getDate() + ' ' + U.MONTHS[d.getMonth()] + ' ' + d.getFullYear();
  };
  U.fmtDateShort = function (s) {
    var d = U.parse(s);
    if (!d) return '—';
    return d.getDate() + ' ' + U.MONTHS[d.getMonth()];
  };
  U.fmtMonth = function (key) {
    var p = String(key || '').split('-');
    if (p.length < 2) return key || '—';
    return U.MONTHS[+p[1] - 1] + ' ' + p[0];
  };
  U.dayName = function (s) {
    var d = U.parse(s);
    return d ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()] : '';
  };
  U.fmtTime = function (t) {
    if (!t) return '';
    var p = String(t).split(':'); var h = +p[0]; var m = p[1] || '00';
    var ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12; if (h === 0) h = 12;
    return h + ':' + m + ' ' + ap;
  };
  U.nowTime = function () {
    var d = new Date(), p = function (x) { return (x < 10 ? '0' : '') + x; };
    return p(d.getHours()) + ':' + p(d.getMinutes());
  };
  U.relDay = function (s) {
    var diff = U.daysBetween(U.today(), s);
    if (diff === 0) return 'today';
    if (diff === 1) return 'tomorrow';
    if (diff === -1) return 'yesterday';
    if (diff < 0) return Math.abs(diff) + ' days ago';
    return 'in ' + diff + ' days';
  };

  /* ── phone / links ─────────────────────────────────────── */
  U.digits = function (p) { return String(p || '').replace(/[^\d+]/g, ''); };
  U.waLink = function (phone, text) {
    var p = U.digits(phone).replace(/^\+/, '');
    return 'https://wa.me/' + p + (text ? '?text=' + encodeURIComponent(text) : '');
  };
  U.telLink = function (phone) { return 'tel:' + U.digits(phone); };

  /* ── toast ─────────────────────────────────────────────── */
  var toastTimer = null;
  U.toast = function (msg, kind) {
    var box = U.$('#toast');
    if (!box) return;
    box.textContent = msg;
    box.className = 'toast show' + (kind ? ' ' + kind : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { box.className = 'toast'; }, 2600);
  };

  /* ── modal ─────────────────────────────────────────────── */
  var modalOnClose = null;
  U.modal = function (opts) {
    var wrap = U.$('#modal');
    var size = opts.size ? ' modal-' + opts.size : '';
    wrap.innerHTML = U.html`
      <div class="modal-backdrop" data-close="1"></div>
      <div class="modal-card${U.raw(size)}" role="dialog" aria-modal="true">
        <div class="modal-head">
          <h2>${opts.title || ''}</h2>
          <button class="btn ghost icon" type="button" data-close="1" aria-label="Close">✕</button>
        </div>
        <div class="modal-body">${U.raw(opts.body || '')}</div>
        <div class="modal-foot">${U.raw(opts.footer || '')}</div>
      </div>`;
    wrap.classList.add('open');
    document.body.classList.add('modal-open');
    modalOnClose = opts.onClose || null;
    if (opts.onMount) opts.onMount(wrap);
    var first = wrap.querySelector('input,select,textarea');
    if (first && !opts.noAutofocus) setTimeout(function () { first.focus(); }, 30);
    return wrap;
  };
  U.closeModal = function () {
    var wrap = U.$('#modal');
    if (!wrap.classList.contains('open')) return;
    wrap.classList.remove('open');
    document.body.classList.remove('modal-open');
    wrap.innerHTML = '';
    var cb = modalOnClose; modalOnClose = null;
    if (cb) cb();
  };
  U.confirm = function (message, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      U.modal({
        title: opts.title || 'Please confirm',
        body: U.html`<p class="confirm-text">${message}</p>`,
        footer: U.html`
          <button class="btn ghost" type="button" data-close="1">Cancel</button>
          <button class="btn ${U.raw(opts.danger ? 'danger' : 'primary')}" type="button" id="confirmYes">${opts.ok || 'Yes, continue'}</button>`,
        onMount: function (wrap) {
          wrap.querySelector('#confirmYes').addEventListener('click', function () {
            U.closeModal(); resolve(true);
          });
        },
        onClose: function () { resolve(false); }
      });
    });
  };

  /* ── files ─────────────────────────────────────────────── */
  U.download = function (filename, text, mime) {
    var blob = new Blob([text], { type: (mime || 'text/plain') + ';charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 400);
  };
  U.csv = function (filename, rows) {
    var body = rows.map(function (r) {
      return r.map(function (c) {
        var s = c === null || c === undefined ? '' : String(c);
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      }).join(',');
    }).join('\n');
    U.download(filename, body, 'text/csv');
    U.toast('Exported ' + filename);
  };

  /* ── printing ──────────────────────────────────────────── */
  U.print = function (title, bodyHtml) {
    var w = window.open('', '_blank', 'width=820,height=900');
    if (!w) { U.toast('Allow pop-ups to print', 'warn'); return; }
    w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>' +
      U.esc(title) + '</title><style>' + U.printCSS + '</style></head><body>' +
      bodyHtml + '</body></html>');
    w.document.close();
    w.focus();
    setTimeout(function () { w.print(); }, 350);
  };
  U.printCSS = [
    'body{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#111;margin:26px;font-size:13px;}',
    '.doc{max-width:760px;margin:0 auto;}',
    '.doc-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;',
    'border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:16px;}',
    '.doc-head h1{margin:0 0 2px;font-size:20px;letter-spacing:-.02em;}',
    '.doc-head .meta{text-align:right;font-size:12px;color:#444;}',
    '.doc h2{font-size:14px;margin:18px 0 6px;}',
    'table{width:100%;border-collapse:collapse;margin:8px 0 14px;font-size:12.5px;}',
    'th,td{border-bottom:1px solid #ddd;padding:7px 6px;text-align:left;vertical-align:top;}',
    'th{background:#f3f3f1;font-weight:600;}',
    '.num{text-align:right;font-variant-numeric:tabular-nums;}',
    '.tot td{font-weight:700;border-top:2px solid #111;border-bottom:none;}',
    '.grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:10px;}',
    '.box{border:1px solid #ddd;border-radius:8px;padding:10px 12px;}',
    '.box h3{margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#555;}',
    '.kv{display:flex;justify-content:space-between;gap:10px;padding:2px 0;}',
    '.muted{color:#666;}.sm{font-size:11.5px;}',
    '.sign{margin-top:34px;display:flex;justify-content:space-between;gap:30px;}',
    '.sign div{border-top:1px solid #999;padding-top:5px;width:210px;text-align:center;font-size:11.5px;color:#555;}',
    '.foot{margin-top:22px;border-top:1px dashed #bbb;padding-top:8px;font-size:11px;color:#666;text-align:center;}',
    '@media print{body{margin:12mm;} .noprint{display:none;}}'
  ].join('');

  /* ── tiny SVG charts ───────────────────────────────────── */
  /* data: [{label, value, value2}] — grouped bars, no library. */
  U.barChart = function (data, opts) {
    opts = opts || {};
    var w = 100, h = opts.height || 34, pad = 0.5;
    var max = 0;
    data.forEach(function (d) {
      max = Math.max(max, U.n(d.value), U.n(d.value2 || 0));
    });
    if (max <= 0) max = 1;
    var n = Math.max(data.length, 1);
    var slot = w / n;
    var two = data.some(function (d) { return d.value2 !== undefined; });
    var bw = two ? (slot - pad * 2) / 2 : slot - pad * 2;
    var bars = data.map(function (d, i) {
      var x = i * slot + pad;
      var hv = (U.n(d.value) / max) * (h - 1);
      var s = '<rect x="' + x.toFixed(2) + '" y="' + (h - hv).toFixed(2) +
        '" width="' + bw.toFixed(2) + '" height="' + Math.max(hv, 0.4).toFixed(2) +
        '" rx="0.4" fill="var(--series-1)"><title>' + U.esc(d.label + ': ' + U.money(d.value)) + '</title></rect>';
      if (two) {
        var hv2 = (U.n(d.value2) / max) * (h - 1);
        s += '<rect x="' + (x + bw).toFixed(2) + '" y="' + (h - hv2).toFixed(2) +
          '" width="' + bw.toFixed(2) + '" height="' + Math.max(hv2, 0.4).toFixed(2) +
          '" rx="0.4" fill="var(--series-2)"><title>' + U.esc(d.label + ': ' + U.money(d.value2)) + '</title></rect>';
      }
      return s;
    }).join('');
    var labels = data.map(function (d, i) {
      if (data.length > 16 && i % 2) return '';
      return '<span>' + U.esc(d.short || d.label) + '</span>';
    }).join('');
    return '<div class="chart"><svg viewBox="0 0 ' + w + ' ' + h +
      '" preserveAspectRatio="none" role="img" aria-label="' + U.esc(opts.title || 'chart') + '">' +
      bars + '</svg><div class="chart-axis" style="--cols:' + n + '">' + labels + '</div></div>';
  };

  /* Horizontal share bars — good for "revenue by service". */
  U.shareBars = function (rows, opts) {
    opts = opts || {};
    var total = rows.reduce(function (a, r) { return a + U.n(r.value); }, 0);
    if (!rows.length) return '<p class="empty">Nothing to show yet.</p>';
    return '<div class="share-list">' + rows.map(function (r, i) {
      var pct = total > 0 ? (U.n(r.value) / total) * 100 : 0;
      return U.html`
        <div class="share-row">
          <span class="share-label" title="${r.label}">${r.label}</span>
          <span class="share-track"><span class="share-fill" style="width:${U.raw(pct.toFixed(1))}%;background:var(--series-${U.raw(String((i % 8) + 1))})"></span></span>
          <span class="share-val num">${U.raw(opts.raw ? U.numFmt(r.value, 0) : U.money(r.value))}</span>
          <span class="share-pct num muted sm">${U.raw(pct.toFixed(0))}%</span>
        </div>`;
    }).join('') + '</div>';
  };

  /* ── ratings ───────────────────────────────────────────── */
  U.stars = function (rating, cls) {
    var r = Math.round(U.n(rating));
    var s = '';
    for (var i = 1; i <= 5; i++) s += i <= r ? '★' : '☆';
    return '<span class="stars ' + (cls || '') + '" title="' + U.n(rating).toFixed(1) + ' of 5">' + s + '</span>';
  };

  /* ── misc ──────────────────────────────────────────────── */
  U.by = function (key) {
    return function (a, b) { return a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0; };
  };
  U.desc = function (key) {
    return function (a, b) { return a[key] < b[key] ? 1 : a[key] > b[key] ? -1 : 0; };
  };
  U.sum = function (arr, fn) {
    return arr.reduce(function (a, x) { return a + U.n(fn ? fn(x) : x); }, 0);
  };
  U.groupBy = function (arr, fn) {
    var out = {};
    arr.forEach(function (x) {
      var k = fn(x);
      (out[k] = out[k] || []).push(x);
    });
    return out;
  };
  U.uniq = function (arr) {
    return arr.filter(function (x, i) { return arr.indexOf(x) === i; });
  };
  U.pick = function (arr, id) {
    for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i];
    return null;
  };
  U.matches = function (text, q) {
    if (!q) return true;
    return String(text || '').toLowerCase().indexOf(String(q).toLowerCase()) >= 0;
  };
  U.initials = function (name) {
    var p = String(name || '?').trim().split(/\s+/);
    return ((p[0] || '')[0] || '?').toUpperCase() + (p[1] ? p[1][0].toUpperCase() : '');
  };

  /* Form field values out of a container, by [name]. */
  U.formData = function (root) {
    var out = {};
    U.$$('[name]', root).forEach(function (el) {
      if (el.type === 'checkbox') out[el.name] = el.checked;
      else if (el.type === 'radio') { if (el.checked) out[el.name] = el.value; }
      else out[el.name] = el.value;
    });
    return out;
  };

  global.U = U;
})(window);

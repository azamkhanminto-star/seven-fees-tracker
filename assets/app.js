/* ============================================================
   Seven Fees Tracker
   Fee collection (in), refunds (out), expenses, dues and a
   day-by-day ledger for a coaching institute.
   Everything is stored locally in the browser (localStorage).
   ============================================================ */
(function () {
  'use strict';

  var STORE_KEY = 'sevenFees.v1';

  var DEFAULT_CATEGORIES = [
    'Rent', 'Teacher salary', 'Staff salary', 'Electricity', 'Internet',
    'Stationery', 'Books', 'Marketing', 'Maintenance', 'Transport', 'Other'
  ];

  var state = {
    settings: {
      instituteName: 'Seven Coaching Institute',
      currency: '₹',
      openingBalance: 0,
      expenseCategories: DEFAULT_CATEGORIES.slice()
    },
    students: [],
    txns: [],
    receiptSeq: 0
  };

  /* ── tiny helpers ──────────────────────────────────────── */

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function todayISO() {
    var d = new Date();
    return isoOf(d);
  }

  function isoOf(d) {
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }

  function parseISO(s) {
    var p = String(s).split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }

  function addDays(iso, n) {
    var d = parseISO(iso);
    d.setDate(d.getDate() + n);
    return isoOf(d);
  }

  function money(n) {
    var v = Number(n) || 0;
    var neg = v < 0;
    var s = Math.abs(v).toLocaleString('en-IN', {
      minimumFractionDigits: v % 1 ? 2 : 0,
      maximumFractionDigits: 2
    });
    return (neg ? '-' : '') + state.settings.currency + s;
  }

  function shortMoney(n) {
    var v = Math.abs(Number(n) || 0);
    if (v >= 1e7) return (v / 1e7).toFixed(1).replace(/\.0$/, '') + 'Cr';
    if (v >= 1e5) return (v / 1e5).toFixed(1).replace(/\.0$/, '') + 'L';
    if (v >= 1000) return (v / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return String(Math.round(v));
  }

  function dateLabel(iso) {
    var d = parseISO(iso);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
  }

  function shortDate(iso) {
    var d = parseISO(iso);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var toastTimer;
  function toast(msg) {
    var el = $('#toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, 2600);
  }

  /* ── persistence ───────────────────────────────────────── */

  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return;
      var data = JSON.parse(raw);
      if (data.settings) {
        Object.keys(state.settings).forEach(function (k) {
          if (data.settings[k] !== undefined) state.settings[k] = data.settings[k];
        });
      }
      if (Array.isArray(data.students)) state.students = data.students;
      if (Array.isArray(data.txns)) state.txns = data.txns;
      state.receiptSeq = data.receiptSeq || 0;
    } catch (e) {
      console.error('Could not read saved data', e);
      toast('Saved data looked corrupt and was ignored.');
    }
  }

  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch (e) {
      toast('Could not save — browser storage is full or blocked.');
    }
  }

  /* ── derived data ──────────────────────────────────────── */

  function studentById(id) {
    for (var i = 0; i < state.students.length; i++) {
      if (state.students[i].id === id) return state.students[i];
    }
    return null;
  }

  function studentName(id) {
    var s = studentById(id);
    return s ? s.name : 'Unknown student';
  }

  function paidBy(studentId) {
    return state.txns.reduce(function (sum, t) {
      return t.type === 'in' && t.studentId === studentId ? sum + t.amount : sum;
    }, 0);
  }

  function dueOf(student) {
    var total = Number(student.totalFee) || 0;
    if (!total) return 0;
    return Math.max(0, total - paidBy(student.id));
  }

  function inRange(t, from, to) {
    return (!from || t.date >= from) && (!to || t.date <= to);
  }

  function totalsOf(list) {
    var t = { in: 0, out: 0, expense: 0, count: list.length };
    list.forEach(function (x) { t[x.type] += x.amount; });
    t.net = t.in - t.out - t.expense;
    return t;
  }

  function sortedTxns() {
    return state.txns.slice().sort(function (a, b) {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  }

  /* Groups every transaction by calendar day, oldest first,
     with a running cash balance that starts at the opening balance. */
  function dailyLedger(from, to) {
    var byDay = {};
    state.txns.forEach(function (t) {
      if (!byDay[t.date]) byDay[t.date] = { date: t.date, in: 0, out: 0, expense: 0, count: 0 };
      byDay[t.date][t.type] += t.amount;
      byDay[t.date].count++;
    });
    var days = Object.keys(byDay).sort().map(function (d) { return byDay[d]; });
    var running = Number(state.settings.openingBalance) || 0;
    days.forEach(function (d) {
      d.net = d.in - d.out - d.expense;
      running += d.net;
      d.balance = running;
    });
    return days.filter(function (d) { return inRange(d, from, to); });
  }

  /* ── view switching ────────────────────────────────────── */

  function showView(name) {
    $$('.tab').forEach(function (b) { b.classList.toggle('is-active', b.dataset.view === name); });
    $$('.view').forEach(function (v) { v.classList.toggle('is-active', v.id === 'view-' + name); });
    window.scrollTo({ top: 0 });
    // the chart can only measure itself once its view is on screen
    if (name === 'dashboard') renderDashboard();
  }

  /* ── dashboard ─────────────────────────────────────────── */

  var dashRange = { from: '', to: '' };

  function renderDashboard() {
    var from = dashRange.from, to = dashRange.to;
    var list = state.txns.filter(function (t) { return inRange(t, from, to); });
    var t = totalsOf(list);

    var today = todayISO();
    var todayList = state.txns.filter(function (x) { return x.date === today && x.type === 'in'; });
    var todayTotal = todayList.reduce(function (s, x) { return s + x.amount; }, 0);

    var allTime = totalsOf(state.txns);
    var cashInHand = (Number(state.settings.openingBalance) || 0) + allTime.net;

    $('#kpiToday').textContent = money(todayTotal);
    $('#kpiTodayCount').textContent = todayList.length
      ? todayList.length + (todayList.length === 1 ? ' receipt' : ' receipts') + ' today'
      : 'no collection yet today';

    $('#kpiIn').textContent = money(t.in);
    $('#kpiOut').textContent = money(t.out);
    $('#kpiExpense').textContent = money(t.expense);

    $('#kpiNet').textContent = money(t.net);
    $('#kpiNet').className = 'tile-value ' + (t.net < 0 ? 'neg' : '');
    $('#kpiNet').nextElementSibling.textContent = 'Cash in hand (all time): ' + money(cashInHand);

    var dues = state.students.filter(function (s) { return s.active !== 0; })
      .map(dueOf).filter(function (d) { return d > 0; });
    var dueTotal = dues.reduce(function (a, b) { return a + b; }, 0);
    $('#kpiDue').textContent = money(dueTotal);
    $('#kpiDueSub').textContent = dues.length
      ? dues.length + (dues.length === 1 ? ' student pending' : ' students pending')
      : 'everyone is clear';

    renderFlowChart(from, to);
    renderExpenseSplit(list);
    renderRecent();
  }

  /* Grouped bar chart: collection vs money going out, per day. */
  function renderFlowChart(from, to) {
    var host = $('#flowChart');
    var days = dailyLedger(from, to);
    // keep the chart readable: show at most the last 45 days of the range
    if (days.length > 45) days = days.slice(days.length - 45);

    $('#flowEmpty').hidden = days.length > 0;
    $('#flowLegend').style.visibility = days.length ? 'visible' : 'hidden';
    if (!days.length) { host.innerHTML = ''; return; }

    var padL = 46, padR = 10, padT = 12, padB = 26;
    // host.clientWidth is 0 while the dashboard is hidden; fall back so the
    // chart is not laid out at its minimum size and then left stale
    var avail = (host.clientWidth || 900) - padL - padR;
    // never below 30px per day (chart scrolls instead); otherwise fill the card
    var slot = Math.max(30, Math.floor(avail / days.length));
    var w = padL + padR + slot * days.length;
    var h = 230;
    var plotH = h - padT - padB;

    var max = 0;
    days.forEach(function (d) {
      max = Math.max(max, d.in, d.out + d.expense);
    });
    if (max <= 0) max = 1;
    var ticks = niceTicks(max, 4);
    var top = ticks[ticks.length - 1];
    var y = function (v) { return padT + plotH - (v / top) * plotH; };

    var barW = Math.min(26, Math.max(6, Math.floor((slot - 8) / 2) - 1));
    var svg = ['<svg viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h +
      '" role="img" aria-label="Daily collection against money going out">'];

    svg.push('<g class="grid">');
    ticks.forEach(function (v) {
      svg.push('<line x1="' + padL + '" x2="' + (w - padR) + '" y1="' + y(v) + '" y2="' + y(v) + '"/>');
      svg.push('<text x="' + (padL - 7) + '" y="' + (y(v) + 3.5) + '" text-anchor="end">' + shortMoney(v) + '</text>');
    });
    svg.push('</g>');
    svg.push('<line class="axis-line" x1="' + padL + '" x2="' + (w - padR) + '" y1="' + y(0) + '" y2="' + y(0) + '"/>');

    var every = Math.ceil(days.length / Math.max(1, Math.floor((w - padL - padR) / 52)));

    days.forEach(function (d, i) {
      var x0 = padL + i * slot;
      var cx = x0 + slot / 2;
      var outTotal = d.out + d.expense;
      // 2px surface gap between the two bars of a day
      var xIn = cx - barW - 1;
      var xOut = cx + 1;
      svg.push(roundedBar(xIn, y(d.in), barW, y(0) - y(d.in), 'bar-in'));
      svg.push(roundedBar(xOut, y(outTotal), barW, y(0) - y(outTotal), 'bar-out'));

      if (i % every === 0) {
        svg.push('<text x="' + cx + '" y="' + (h - 8) + '" text-anchor="middle">' + esc(shortDate(d.date)) + '</text>');
      }
      svg.push('<rect class="hit" x="' + x0 + '" y="' + padT + '" width="' + slot + '" height="' + plotH +
        '" data-i="' + i + '"></rect>');
    });
    svg.push('</svg>');
    host.innerHTML = svg.join('');

    attachChartHover(host, days);
  }

  function roundedBar(x, yTop, w, height, cls) {
    if (height <= 0.5) return '';
    var r = Math.min(4, w / 2, height);
    var yBottom = yTop + height;
    return '<path class="' + cls + '" d="M' + x + ' ' + yBottom +
      ' L' + x + ' ' + (yTop + r) +
      ' Q' + x + ' ' + yTop + ' ' + (x + r) + ' ' + yTop +
      ' L' + (x + w - r) + ' ' + yTop +
      ' Q' + (x + w) + ' ' + yTop + ' ' + (x + w) + ' ' + (yTop + r) +
      ' L' + (x + w) + ' ' + yBottom + ' Z"/>';
  }

  function niceTicks(max, count) {
    var raw = max / count;
    var mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
    var norm = raw / mag;
    var step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
    var out = [];
    for (var v = 0; v <= max + step * 0.001; v += step) out.push(Math.round(v * 100) / 100);
    if (out[out.length - 1] < max) out.push(out[out.length - 1] + step);
    return out;
  }

  var tip;
  function attachChartHover(host, days) {
    if (!tip) {
      tip = document.createElement('div');
      tip.className = 'tooltip';
      tip.hidden = true;
      document.body.appendChild(tip);
    }
    $$('.hit', host).forEach(function (rect) {
      rect.addEventListener('mousemove', function (ev) {
        var d = days[+rect.dataset.i];
        tip.innerHTML =
          '<div><b>' + esc(dateLabel(d.date)) + '</b></div>' +
          row('s1', 'Collection', d.in) +
          row('s2', 'Out + expense', d.out + d.expense) +
          '<div class="row"><span class="key">Net</span><b>' + esc(money(d.net)) + '</b></div>';
        tip.hidden = false;
        var x = Math.min(ev.clientX + 14, window.innerWidth - tip.offsetWidth - 8);
        tip.style.left = x + 'px';
        tip.style.top = Math.max(8, ev.clientY - tip.offsetHeight - 12) + 'px';
      });
      rect.addEventListener('mouseleave', function () { tip.hidden = true; });
    });

    function row(cls, label, val) {
      return '<div class="row"><span class="key"><i class="swatch ' + cls + '"></i>' + label +
        '</span><b>' + esc(money(val)) + '</b></div>';
    }
  }

  function renderExpenseSplit(list) {
    var host = $('#expenseSplit');
    var byCat = {};
    list.forEach(function (t) {
      if (t.type !== 'expense') return;
      byCat[t.category || 'Other'] = (byCat[t.category || 'Other'] || 0) + t.amount;
    });
    var rows = Object.keys(byCat).map(function (k) { return { name: k, value: byCat[k] }; })
      .sort(function (a, b) { return b.value - a.value; });

    if (!rows.length) {
      host.innerHTML = '<p class="muted sm">No expenses in this range.</p>';
      return;
    }
    var max = rows[0].value;
    host.innerHTML = rows.slice(0, 8).map(function (r) {
      var pct = Math.max(2, Math.round((r.value / max) * 100));
      return '<div class="split-row">' +
        '<span class="name">' + esc(r.name) + '</span>' +
        '<span class="val">' + esc(money(r.value)) + '</span>' +
        '<span class="track"><span class="fill" style="width:' + pct + '%"></span></span>' +
        '</div>';
    }).join('');
  }

  function renderRecent() {
    var body = $('#recentTable tbody');
    var rows = sortedTxns().slice(0, 8);
    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="4" class="muted sm">Nothing recorded yet.</td></tr>';
      return;
    }
    body.innerHTML = rows.map(function (t) {
      return '<tr>' +
        '<td>' + esc(shortDate(t.date)) + '</td>' +
        '<td>' + esc(detailOf(t)) + '</td>' +
        '<td>' + typePill(t.type) + '</td>' +
        '<td class="num ' + (t.type === 'in' ? 'pos' : 'neg') + '">' +
          (t.type === 'in' ? '+' : '−') + esc(money(t.amount)) + '</td>' +
        '</tr>';
    }).join('');
  }

  function detailOf(t) {
    if (t.type === 'in') return studentName(t.studentId) + (t.period ? ' · ' + t.period : '');
    return (t.category || 'Other') + (t.party ? ' · ' + t.party : '');
  }

  function typePill(type) {
    if (type === 'in') return '<span class="pill in"><i></i>Fee in</span>';
    if (type === 'out') return '<span class="pill out"><i></i>Out</span>';
    return '<span class="pill exp"><i></i>Expense</span>';
  }

  /* ── fee collection view ───────────────────────────────── */

  function renderStudentOptions() {
    var sel = $('#feeStudent');
    var keep = sel.value;
    var active = state.students.filter(function (s) { return s.active !== 0; });
    if (!active.length) {
      sel.innerHTML = '<option value="">— add a student first —</option>';
      $('#feeHint').textContent = 'Add students in the Students tab, then collect fees against them.';
      return;
    }
    $('#feeHint').textContent = '';
    sel.innerHTML = active.map(function (s) {
      var due = dueOf(s);
      return '<option value="' + esc(s.id) + '">' + esc(s.name) +
        (s.batch ? ' — ' + esc(s.batch) : '') +
        (due > 0 ? ' (due ' + esc(money(due)) + ')' : '') + '</option>';
    }).join('');
    if (keep) sel.value = keep;
  }

  function renderFeeTable() {
    var q = $('#feeSearch').value.trim().toLowerCase();
    var body = $('#feeTable tbody');
    var rows = sortedTxns().filter(function (t) { return t.type === 'in'; })
      .filter(function (t) {
        if (!q) return true;
        return (studentName(t.studentId) + ' ' + (t.note || '') + ' ' + (t.period || '') + ' ' +
          (t.receiptNo || '')).toLowerCase().indexOf(q) > -1;
      });

    $('#feeEmpty').hidden = rows.length > 0;
    body.innerHTML = rows.map(function (t) {
      return '<tr>' +
        '<td>' + esc(t.receiptNo || '—') + '</td>' +
        '<td>' + esc(dateLabel(t.date)) + '</td>' +
        '<td>' + esc(studentName(t.studentId)) + '</td>' +
        '<td>' + esc(t.period || '—') + '</td>' +
        '<td>' + esc(t.mode || '—') + '</td>' +
        '<td class="num">' + esc(money(t.amount)) + '</td>' +
        '<td class="num">' +
          '<button class="btn link" data-receipt="' + esc(t.id) + '">Receipt</button>' +
          '<button class="btn link del" data-del="' + esc(t.id) + '">Delete</button>' +
        '</td></tr>';
    }).join('');
  }

  /* ── out & expense view ────────────────────────────────── */

  function renderCategoryOptions() {
    var sel = $('#outCategory');
    var isExpense = $('#outType').value === 'expense';
    var list = isExpense ? state.settings.expenseCategories
      : ['Fee refund', 'Owner withdrawal', 'Advance return', 'Other'];
    sel.innerHTML = list.map(function (c) { return '<option>' + esc(c) + '</option>'; }).join('');
  }

  function renderOutTable() {
    var q = $('#outSearch').value.trim().toLowerCase();
    var body = $('#outTable tbody');
    var rows = sortedTxns().filter(function (t) { return t.type !== 'in'; })
      .filter(function (t) {
        if (!q) return true;
        return ((t.category || '') + ' ' + (t.party || '') + ' ' + (t.note || '')).toLowerCase().indexOf(q) > -1;
      });

    $('#outEmpty').hidden = rows.length > 0;
    body.innerHTML = rows.map(function (t) {
      return '<tr>' +
        '<td>' + esc(dateLabel(t.date)) + '</td>' +
        '<td>' + typePill(t.type) + '</td>' +
        '<td>' + esc(t.category || '—') + '</td>' +
        '<td>' + esc(t.party || '—') + '</td>' +
        '<td>' + esc(t.note || '—') + '</td>' +
        '<td class="num">' + esc(money(t.amount)) + '</td>' +
        '<td class="num"><button class="btn link del" data-del="' + esc(t.id) + '">Delete</button></td>' +
        '</tr>';
    }).join('');
  }

  /* ── students view ─────────────────────────────────────── */

  function renderStudentTable() {
    var q = $('#studentSearch').value.trim().toLowerCase();
    var body = $('#studentTable tbody');
    var rows = state.students.slice().sort(function (a, b) { return a.name.localeCompare(b.name); })
      .filter(function (s) {
        if (!q) return true;
        return (s.name + ' ' + (s.batch || '') + ' ' + (s.phone || '')).toLowerCase().indexOf(q) > -1;
      });

    $('#studentEmpty').hidden = rows.length > 0;
    body.innerHTML = rows.map(function (s) {
      var paid = paidBy(s.id);
      var due = dueOf(s);
      return '<tr>' +
        '<td>' + esc(s.name) + '</td>' +
        '<td>' + esc(s.batch || '—') + '</td>' +
        '<td>' + esc(s.phone || '—') + '</td>' +
        '<td class="num">' + esc(s.totalFee ? money(s.totalFee) : '—') + '</td>' +
        '<td class="num">' + esc(money(paid)) + '</td>' +
        '<td class="num ' + (due > 0 ? 'neg' : 'pos') + '">' + esc(due > 0 ? money(due) : 'Clear') + '</td>' +
        '<td>' + (s.active === 0 ? 'Inactive' : 'Active') + '</td>' +
        '<td class="num">' +
          '<button class="btn link" data-edit="' + esc(s.id) + '">Edit</button>' +
          '<button class="btn link del" data-delstu="' + esc(s.id) + '">Delete</button>' +
        '</td></tr>';
    }).join('');
  }

  /* ── daily report ──────────────────────────────────────── */

  function renderDaily() {
    var month = $('#dailyMonth').value;
    var from = '', to = '';
    if (month) {
      from = month + '-01';
      var d = parseISO(from);
      d.setMonth(d.getMonth() + 1);
      d.setDate(0);
      to = isoOf(d);
    }
    var days = dailyLedger(from, to).slice().reverse();
    var body = $('#dailyTable tbody');
    var foot = $('#dailyTable tfoot');

    $('#dailyEmpty').hidden = days.length > 0;
    body.innerHTML = days.map(function (d) {
      return '<tr>' +
        '<td>' + esc(dateLabel(d.date)) + '</td>' +
        '<td class="num">' + d.count + '</td>' +
        '<td class="num ' + (d.in ? 'pos' : '') + '">' + esc(d.in ? money(d.in) : '—') + '</td>' +
        '<td class="num">' + esc(d.out ? money(d.out) : '—') + '</td>' +
        '<td class="num">' + esc(d.expense ? money(d.expense) : '—') + '</td>' +
        '<td class="num ' + (d.net < 0 ? 'neg' : 'pos') + '">' + esc(money(d.net)) + '</td>' +
        '<td class="num">' + esc(money(d.balance)) + '</td>' +
        '</tr>';
    }).join('');

    if (!days.length) { foot.innerHTML = ''; return; }
    var sum = days.reduce(function (a, d) {
      a.in += d.in; a.out += d.out; a.expense += d.expense; a.count += d.count;
      return a;
    }, { in: 0, out: 0, expense: 0, count: 0 });
    foot.innerHTML = '<tr>' +
      '<td>Total (' + days.length + (days.length === 1 ? ' day' : ' days') + ')</td>' +
      '<td class="num">' + sum.count + '</td>' +
      '<td class="num">' + esc(money(sum.in)) + '</td>' +
      '<td class="num">' + esc(money(sum.out)) + '</td>' +
      '<td class="num">' + esc(money(sum.expense)) + '</td>' +
      '<td class="num">' + esc(money(sum.in - sum.out - sum.expense)) + '</td>' +
      '<td class="num">' + esc(money(days[0].balance)) + '</td>' +
      '</tr>';
  }

  /* ── CSV ───────────────────────────────────────────────── */

  function toCSV(header, rows) {
    var lines = [header].concat(rows).map(function (r) {
      return r.map(function (cell) {
        var s = String(cell == null ? '' : cell);
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      }).join(',');
    });
    return lines.join('\r\n');
  }

  function download(name, text, mime) {
    var blob = new Blob([text], { type: (mime || 'text/csv') + ';charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  /* ── receipt ───────────────────────────────────────────── */

  function printReceipt(txn) {
    var s = studentById(txn.studentId);
    var due = s ? dueOf(s) : 0;
    var el = $('#receipt');
    el.innerHTML =
      '<h1>' + esc(state.settings.instituteName) + '</h1>' +
      '<p class="muted sm">Fee receipt</p>' +
      '<div class="r-line"><span>Receipt no.</span><span>' + esc(txn.receiptNo || '—') + '</span></div>' +
      '<div class="r-line"><span>Date</span><span>' + esc(dateLabel(txn.date)) + '</span></div>' +
      '<div class="r-line"><span>Student</span><span>' + esc(s ? s.name : 'Unknown') + '</span></div>' +
      (s && s.batch ? '<div class="r-line"><span>Batch</span><span>' + esc(s.batch) + '</span></div>' : '') +
      '<div class="r-line"><span>Fee for</span><span>' + esc(txn.period || '—') + '</span></div>' +
      '<div class="r-line"><span>Mode</span><span>' + esc(txn.mode || '—') + '</span></div>' +
      (txn.note ? '<div class="r-line"><span>Note</span><span>' + esc(txn.note) + '</span></div>' : '') +
      '<div class="r-line r-total"><span>Amount paid</span><span>' + esc(money(txn.amount)) + '</span></div>' +
      (due > 0 ? '<div class="r-line"><span>Balance due</span><span>' + esc(money(due)) + '</span></div>' : '') +
      '<p class="muted sm" style="margin-top:26px">Signature: ______________________</p>';

    document.body.classList.add('printing-receipt');
    el.hidden = false;
    window.print();
    document.body.classList.remove('printing-receipt');
    el.hidden = true;
  }

  /* ── re-render everything that depends on data ─────────── */

  function renderAll() {
    $('#instituteName').textContent = state.settings.instituteName;
    renderDashboard();
    renderStudentOptions();
    renderFeeTable();
    renderOutTable();
    renderStudentTable();
    renderDaily();
    $('#dataStats').textContent = state.students.length + ' students · ' +
      state.txns.length + ' entries stored in this browser.';
  }

  function commit() { save(); renderAll(); }

  /* ── event wiring ──────────────────────────────────────── */

  function setPreset(preset) {
    var today = todayISO();
    if (preset === 'today') { dashRange = { from: today, to: today }; }
    else if (preset === '7') { dashRange = { from: addDays(today, -6), to: today }; }
    else if (preset === '30') { dashRange = { from: addDays(today, -29), to: today }; }
    else if (preset === 'mtd') { dashRange = { from: today.slice(0, 8) + '01', to: today }; }
    else { dashRange = { from: '', to: '' }; }
    $('#dashFrom').value = dashRange.from;
    $('#dashTo').value = dashRange.to;
    renderDashboard();
  }

  function wire() {
    $$('.tab').forEach(function (b) {
      b.addEventListener('click', function () { showView(b.dataset.view); });
    });

    $('#themeToggle').addEventListener('click', function () {
      var next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      localStorage.setItem('sevenFees.theme', next);
      renderDashboard();
    });

    /* dashboard range */
    $$('[data-preset]').forEach(function (b) {
      b.addEventListener('click', function () { setPreset(b.dataset.preset); });
    });
    $('#dashFrom').addEventListener('change', function () {
      dashRange.from = this.value; renderDashboard();
    });
    $('#dashTo').addEventListener('change', function () {
      dashRange.to = this.value; renderDashboard();
    });

    /* fee form */
    $('#feeForm').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var f = ev.target;
      var studentId = f.studentId.value;
      if (!studentId) { toast('Add a student first.'); return; }
      var amount = Number(f.amount.value);
      if (!(amount > 0)) { toast('Enter an amount greater than zero.'); return; }

      state.receiptSeq++;
      state.txns.push({
        id: uid(), type: 'in', date: f.date.value, studentId: studentId,
        amount: amount, period: f.period.value.trim(), mode: f.mode.value,
        note: f.note.value.trim(), receiptNo: 'R' + String(state.receiptSeq).padStart(4, '0'),
        createdAt: Date.now()
      });
      commit();
      f.reset();
      f.date.value = todayISO();
      renderStudentOptions();
      toast('Collection saved · ' + money(amount));
    });
    $('#feeSearch').addEventListener('input', renderFeeTable);
    $('#feeExport').addEventListener('click', function () {
      var rows = sortedTxns().filter(function (t) { return t.type === 'in'; }).map(function (t) {
        return [t.receiptNo, t.date, studentName(t.studentId), t.period, t.mode, t.amount, t.note];
      });
      download('fee-collections.csv',
        toCSV(['Receipt', 'Date', 'Student', 'Period', 'Mode', 'Amount', 'Note'], rows));
    });

    /* out / expense form */
    $('#outType').addEventListener('change', renderCategoryOptions);
    $('#outForm').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var f = ev.target;
      var amount = Number(f.amount.value);
      if (!(amount > 0)) { toast('Enter an amount greater than zero.'); return; }
      state.txns.push({
        id: uid(), type: f.type.value, date: f.date.value,
        amount: amount, category: f.category.value, party: f.party.value.trim(),
        note: f.note.value.trim(), createdAt: Date.now()
      });
      commit();
      var keptType = f.type.value;
      f.reset();
      f.date.value = todayISO();
      f.type.value = keptType;
      renderCategoryOptions();
      toast('Entry saved · ' + money(amount));
    });
    $('#outSearch').addEventListener('input', renderOutTable);
    $('#outExport').addEventListener('click', function () {
      var rows = sortedTxns().filter(function (t) { return t.type !== 'in'; }).map(function (t) {
        return [t.date, t.type === 'out' ? 'Out' : 'Expense', t.category, t.party, t.amount, t.note];
      });
      download('out-and-expenses.csv',
        toCSV(['Date', 'Kind', 'Category', 'Paid to', 'Amount', 'Note'], rows));
    });

    /* delete from either transaction table */
    document.addEventListener('click', function (ev) {
      var del = ev.target.closest('[data-del]');
      if (del) {
        var id = del.dataset.del;
        var t = state.txns.filter(function (x) { return x.id === id; })[0];
        if (t && confirm('Delete this entry of ' + money(t.amount) + '?')) {
          state.txns = state.txns.filter(function (x) { return x.id !== id; });
          commit();
          toast('Entry deleted.');
        }
        return;
      }
      var rec = ev.target.closest('[data-receipt]');
      if (rec) {
        var txn = state.txns.filter(function (x) { return x.id === rec.dataset.receipt; })[0];
        if (txn) printReceipt(txn);
        return;
      }
      var edit = ev.target.closest('[data-edit]');
      if (edit) { startEditStudent(edit.dataset.edit); return; }

      var delStu = ev.target.closest('[data-delstu]');
      if (delStu) {
        var s = studentById(delStu.dataset.delstu);
        if (!s) return;
        var n = state.txns.filter(function (x) { return x.studentId === s.id; }).length;
        var msg = n
          ? 'Delete ' + s.name + '? Their ' + n + ' fee entries will be kept in the ledger.'
          : 'Delete ' + s.name + '?';
        if (confirm(msg)) {
          state.students = state.students.filter(function (x) { return x.id !== s.id; });
          commit();
          toast('Student removed.');
        }
      }
    });

    /* student form */
    $('#studentForm').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var f = ev.target;
      var payload = {
        name: f.name.value.trim(),
        batch: f.batch.value.trim(),
        phone: f.phone.value.trim(),
        totalFee: Number(f.totalFee.value) || 0,
        admissionDate: f.admissionDate.value,
        active: Number(f.active.value)
      };
      if (!payload.name) { toast('Student name is required.'); return; }

      if (f.id.value) {
        var s = studentById(f.id.value);
        if (s) Object.keys(payload).forEach(function (k) { s[k] = payload[k]; });
        toast('Student updated.');
      } else {
        payload.id = uid();
        state.students.push(payload);
        toast('Student added.');
      }
      resetStudentForm();
      commit();
    });
    $('#studentCancel').addEventListener('click', resetStudentForm);
    $('#studentSearch').addEventListener('input', renderStudentTable);
    $('#studentExport').addEventListener('click', function () {
      var rows = state.students.map(function (s) {
        return [s.name, s.batch, s.phone, s.totalFee, paidBy(s.id), dueOf(s),
          s.admissionDate, s.active === 0 ? 'Inactive' : 'Active'];
      });
      download('students.csv',
        toCSV(['Name', 'Batch', 'Phone', 'Course fee', 'Paid', 'Due', 'Admission', 'Status'], rows));
    });

    /* daily report */
    $('#dailyMonth').addEventListener('change', renderDaily);
    $('#dailyAll').addEventListener('click', function () {
      $('#dailyMonth').value = '';
      renderDaily();
    });
    $('#dailyPrint').addEventListener('click', function () { window.print(); });
    $('#dailyExport').addEventListener('click', function () {
      var month = $('#dailyMonth').value;
      var from = '', to = '';
      if (month) {
        from = month + '-01';
        var d = parseISO(from); d.setMonth(d.getMonth() + 1); d.setDate(0); to = isoOf(d);
      }
      var rows = dailyLedger(from, to).map(function (d) {
        return [d.date, d.count, d.in, d.out, d.expense, d.net, d.balance];
      });
      download('daily-report' + (month ? '-' + month : '') + '.csv',
        toCSV(['Date', 'Entries', 'In', 'Out', 'Expense', 'Net of day', 'Running balance'], rows));
    });

    /* settings */
    $('#settingsForm').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var f = ev.target;
      state.settings.instituteName = f.instituteName.value.trim() || 'My Coaching Institute';
      state.settings.currency = f.currency.value || '₹';
      state.settings.openingBalance = Number(f.openingBalance.value) || 0;
      var cats = f.expenseCategories.value.split(',').map(function (c) { return c.trim(); })
        .filter(Boolean);
      state.settings.expenseCategories = cats.length ? cats : DEFAULT_CATEGORIES.slice();
      commit();
      fillSettingsForm();
      renderCategoryOptions();
      toast('Settings saved.');
    });

    $('#backupBtn').addEventListener('click', function () {
      download('seven-fees-backup-' + todayISO() + '.json',
        JSON.stringify(state, null, 2), 'application/json');
    });
    $('#restoreBtn').addEventListener('click', function () { $('#restoreFile').click(); });
    $('#restoreFile').addEventListener('change', function (ev) {
      var file = ev.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var data = JSON.parse(reader.result);
          if (!Array.isArray(data.txns) || !Array.isArray(data.students)) {
            throw new Error('not a Seven Fees backup');
          }
          if (!confirm('Replace all current data with this backup?')) return;
          state.students = data.students;
          state.txns = data.txns;
          state.receiptSeq = data.receiptSeq || 0;
          if (data.settings) {
            Object.keys(state.settings).forEach(function (k) {
              if (data.settings[k] !== undefined) state.settings[k] = data.settings[k];
            });
          }
          commit();
          fillSettingsForm();
          renderCategoryOptions();
          toast('Backup restored.');
        } catch (e) {
          toast('That file is not a valid backup.');
        }
      };
      reader.readAsText(file);
      ev.target.value = '';
    });
    $('#demoBtn').addEventListener('click', function () {
      if (state.txns.length && !confirm('Add sample students and entries to the current data?')) return;
      loadSample();
      commit();
      toast('Sample data loaded.');
    });
    $('#resetBtn').addEventListener('click', function () {
      if (!confirm('Erase every student and entry? This cannot be undone.')) return;
      if (!confirm('Really erase everything? Take a backup first if unsure.')) return;
      state.students = [];
      state.txns = [];
      state.receiptSeq = 0;
      commit();
      toast('All data erased.');
    });

    window.addEventListener('resize', debounce(function () {
      renderFlowChart(dashRange.from, dashRange.to);
    }, 180));
  }

  function debounce(fn, ms) {
    var t;
    return function () {
      clearTimeout(t);
      t = setTimeout(fn, ms);
    };
  }

  function startEditStudent(id) {
    var s = studentById(id);
    if (!s) return;
    var f = $('#studentForm');
    f.id.value = s.id;
    f.name.value = s.name;
    f.batch.value = s.batch || '';
    f.phone.value = s.phone || '';
    f.totalFee.value = s.totalFee || '';
    f.admissionDate.value = s.admissionDate || '';
    f.active.value = String(s.active === 0 ? 0 : 1);
    $('#studentFormTitle').textContent = 'Edit student';
    $('#studentSubmit').textContent = 'Save changes';
    $('#studentCancel').hidden = false;
    showView('students');
    f.name.focus();
  }

  function resetStudentForm() {
    var f = $('#studentForm');
    f.reset();
    f.id.value = '';
    $('#studentFormTitle').textContent = 'Add student';
    $('#studentSubmit').textContent = 'Add student';
    $('#studentCancel').hidden = true;
  }

  function fillSettingsForm() {
    var f = $('#settingsForm');
    f.instituteName.value = state.settings.instituteName;
    f.currency.value = state.settings.currency;
    f.openingBalance.value = state.settings.openingBalance;
    f.expenseCategories.value = state.settings.expenseCategories.join(', ');
  }

  /* ── sample data, so the app is explorable on first run ── */

  function loadSample() {
    var names = [
      ['Aarav Sharma', 'Class 10 — Morning', 24000],
      ['Diya Verma', 'Class 10 — Morning', 24000],
      ['Kabir Khan', 'Class 12 — Physics', 36000],
      ['Meera Iyer', 'Class 12 — Physics', 36000],
      ['Rohan Das', 'Class 9 — Evening', 18000],
      ['Sana Ali', 'Class 9 — Evening', 18000]
    ];
    var added = names.map(function (n) {
      var s = {
        id: uid(), name: n[0], batch: n[1], phone: '',
        totalFee: n[2], admissionDate: addDays(todayISO(), -120), active: 1
      };
      state.students.push(s);
      return s;
    });

    var modes = ['Cash', 'UPI', 'Bank transfer'];
    for (var d = 29; d >= 0; d--) {
      var date = addDays(todayISO(), -d);
      // always give today a couple of receipts so the "today" tile is alive
      var collections = d === 0 ? 2 : Math.floor(Math.random() * 3);
      for (var i = 0; i < collections; i++) {
        var s = added[Math.floor(Math.random() * added.length)];
        state.receiptSeq++;
        state.txns.push({
          id: uid(), type: 'in', date: date, studentId: s.id,
          amount: [2000, 3000, 4000, 6000][Math.floor(Math.random() * 4)],
          period: 'Monthly instalment', mode: modes[Math.floor(Math.random() * modes.length)],
          note: '', receiptNo: 'R' + String(state.receiptSeq).padStart(4, '0'),
          createdAt: Date.now()
        });
      }
      if (d % 7 === 3) {
        state.txns.push({
          id: uid(), type: 'expense', date: date, amount: 1200,
          category: 'Stationery', party: 'Local supplier', note: '', createdAt: Date.now()
        });
      }
      if (date.slice(-2) === '05') {
        state.txns.push({
          id: uid(), type: 'expense', date: date, amount: 15000,
          category: 'Rent', party: 'Landlord', note: 'Monthly rent', createdAt: Date.now()
        });
        state.txns.push({
          id: uid(), type: 'expense', date: date, amount: 22000,
          category: 'Teacher salary', party: 'Faculty', note: '', createdAt: Date.now()
        });
      }
    }
    state.txns.push({
      id: uid(), type: 'out', date: addDays(todayISO(), -9), amount: 2000,
      category: 'Fee refund', party: added[4].name, note: 'Batch changed', createdAt: Date.now()
    });
  }

  /* ── boot ──────────────────────────────────────────────── */

  function init() {
    var savedTheme = localStorage.getItem('sevenFees.theme');
    if (savedTheme) document.documentElement.dataset.theme = savedTheme;

    load();

    $('#todayLabel').textContent = new Date().toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

    $('#feeForm').date.value = todayISO();
    $('#outForm').date.value = todayISO();
    $('#dailyMonth').value = todayISO().slice(0, 7);

    fillSettingsForm();
    renderCategoryOptions();
    wire();
    setPreset('30');
    renderAll();

    if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
      navigator.serviceWorker.register('sw.js').catch(function () { /* offline cache is optional */ });
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();

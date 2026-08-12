/* ============================================================
   3M Detailing — inventory
   Shampoo, compound, coating bottles, PPF film: what is left,
   what needs re-ordering, and where it went.
   ============================================================ */
(function (global) {
  'use strict';

  var Inventory = {};
  var q = '', lowOnly = false;

  Inventory.render = function (host) {
    var items = S.db.inventory.filter(function (i) {
      if (lowOnly && !(U.n(i.reorder) > 0 && U.n(i.stock) <= U.n(i.reorder))) return false;
      return U.matches(i.name + ' ' + (i.supplier || ''), q);
    }).sort(U.by('name'));

    var low = S.lowStock();
    var monthMoves = S.db.stockMoves.filter(function (m) {
      return m.date >= U.monthStart() && U.n(m.qty) < 0;
    });
    var consumed = U.sum(monthMoves, function (m) { return m.cost; });

    host.innerHTML = U.html`
      ${U.raw(App.page('Inventory & materials',
        S.db.inventory.length + ' items · ' + low.length + ' need re-ordering',
        U.html`<button class="btn ghost" type="button" id="exportInv">Export CSV</button>
               <button class="btn ghost" type="button" id="stockIn">+ Stock in</button>
               <button class="btn primary" type="button" id="newItem">+ New item</button>`))}

      <div class="tiles">
        ${U.raw(App.tile('Stock value', U.money(S.stockValue()), 'at purchase cost', 'cash'))}
        ${U.raw(App.tile('Low stock', String(low.length), 'at or below re-order level', low.length ? 'bad' : 'good'))}
        ${U.raw(App.tile('Used this month', U.money(consumed), monthMoves.length + ' movements', 'out'))}
        ${U.raw(App.tile('Items tracked', String(S.db.inventory.length), 'consumables & materials', 'work'))}
      </div>

      ${U.raw(low.length ? U.html`
      <section class="card alert-card">
        <div class="card-head"><h2>⚠︎ Re-order these</h2></div>
        <div class="table-scroll"><table class="tight">
          <thead><tr><th>Item</th><th class="num">In stock</th><th class="num">Re-order at</th><th class="num">Suggested buy</th><th>Supplier</th></tr></thead>
          <tbody>${U.raw(low.map(function (i) {
            var suggest = Math.max(U.n(i.reorder) * 2 - U.n(i.stock), U.n(i.reorder));
            return U.html`<tr>
              <td><strong>${i.name}</strong></td>
              <td class="num is-due">${U.raw(U.numFmt(i.stock) + ' ' + U.esc(i.unit))}</td>
              <td class="num">${U.raw(U.numFmt(i.reorder))}</td>
              <td class="num">${U.raw(U.numFmt(suggest) + ' ' + U.esc(i.unit))}</td>
              <td class="muted sm">${i.supplier || '—'}</td>
            </tr>`;
          }).join(''))}</tbody>
        </table></div>
      </section>` : '')}

      <div class="filterbar card">
        <input type="search" id="iq" class="grow" placeholder="Search item or supplier…" value="${q}">
        <label class="check"><input type="checkbox" id="lowOnly" ${U.raw(lowOnly ? 'checked' : '')}> Low stock only</label>
        <span class="filter-note muted sm">${items.length} shown</span>
      </div>

      ${U.raw(items.length ? U.html`<div class="card table-card"><div class="table-scroll">
        <table>
          <thead><tr><th>Item</th><th class="num">In stock</th><th>Unit</th><th class="num">Re-order at</th>
            <th class="num">Cost / unit</th><th class="num">Value</th><th>Supplier</th><th></th></tr></thead>
          <tbody>${U.raw(items.map(function (i) {
            var isLow = U.n(i.reorder) > 0 && U.n(i.stock) <= U.n(i.reorder);
            return U.html`<tr>
              <td><strong>${i.name}</strong></td>
              <td class="num ${U.raw(isLow ? 'is-due' : '')}">${U.raw(U.numFmt(i.stock))}</td>
              <td class="muted sm">${i.unit}</td>
              <td class="num muted">${U.raw(U.numFmt(i.reorder))}</td>
              <td class="num">${U.raw(U.money(i.cost))}</td>
              <td class="num">${U.raw(U.money(U.n(i.stock) * U.n(i.cost)))}</td>
              <td class="muted sm">${i.supplier || '—'}</td>
              <td class="row-actions">
                <button class="btn ghost sm" type="button" data-in="${i.id}">In</button>
                <button class="btn ghost sm" type="button" data-out="${i.id}">Out</button>
                <button class="linkbtn" type="button" data-edit="${i.id}">Edit</button>
              </td>
            </tr>`;
          }).join(''))}</tbody>
        </table>
      </div></div>` : App.empty('No items match.',
        U.html`<button class="btn primary" type="button" id="newItem2">Add an item</button>`))}

      <section class="card">
        <div class="card-head"><h2>Recent stock movement</h2>
          <span class="muted sm">last 25 entries</span></div>
        ${U.raw(S.db.stockMoves.length ? U.html`<div class="table-scroll"><table class="tight">
          <thead><tr><th>Date</th><th>Item</th><th class="num">Change</th><th>Reason</th><th class="num">Value</th></tr></thead>
          <tbody>${U.raw(S.db.stockMoves.slice(-25).reverse().map(function (m) {
            var it = S.item(m.itemId);
            return U.html`<tr>
              <td class="nowrap sm">${U.raw(U.fmtDateShort(m.date))}</td>
              <td>${it ? it.name : '—'}</td>
              <td class="num ${U.raw(U.n(m.qty) < 0 ? 'is-due' : 'is-good')}">${U.raw((U.n(m.qty) > 0 ? '+' : '') + U.numFmt(m.qty))}</td>
              <td class="sm muted">${m.reason || '—'}</td>
              <td class="num sm">${U.raw(U.money(m.cost))}</td>
            </tr>`;
          }).join(''))}</tbody>
        </table></div>` : U.html`<p class="muted sm">No movement recorded yet.</p>`)}
      </section>`;

    U.$('#iq', host).addEventListener('input', function () {
      q = this.value;
      var pos = this.selectionStart;
      App.render();
      var f = U.$('#iq'); f.focus(); f.setSelectionRange(pos, pos);
    });
    U.$('#lowOnly', host).addEventListener('change', function () { lowOnly = this.checked; App.render(); });
    U.$('#newItem', host).addEventListener('click', function () { editItem(null); });
    var alt = U.$('#newItem2', host);
    if (alt) alt.addEventListener('click', function () { editItem(null); });
    U.$('#stockIn', host).addEventListener('click', function () { moveDialog(null, 1); });
    U.$$('[data-edit]', host).forEach(function (b) {
      b.addEventListener('click', function () { editItem(this.dataset.edit); });
    });
    U.$$('[data-in]', host).forEach(function (b) {
      b.addEventListener('click', function () { moveDialog(this.dataset.in, 1); });
    });
    U.$$('[data-out]', host).forEach(function (b) {
      b.addEventListener('click', function () { moveDialog(this.dataset.out, -1); });
    });
    U.$('#exportInv', host).addEventListener('click', function () {
      var rows = [['Item', 'Unit', 'Stock', 'Re-order level', 'Cost per unit', 'Value', 'Supplier']];
      items.forEach(function (i) {
        rows.push([i.name, i.unit, i.stock, i.reorder, i.cost, U.round2(U.n(i.stock) * U.n(i.cost)), i.supplier || '']);
      });
      U.csv('inventory-' + U.today() + '.csv', rows);
    });
  };

  function editItem(id) {
    var it = S.item(id);
    var draft = it || { id: '', name: '', unit: 'litre', stock: 0, reorder: 0, cost: 0, supplier: '' };
    U.modal({
      title: it ? 'Edit item' : 'New inventory item',
      body: U.html`
        <div class="form-grid two">
          <label>Item name<input type="text" name="name" value="${draft.name}" placeholder="Ceramic coating 9H"></label>
          <label>Unit
            <select name="unit">${U.raw(App.options(['litre', 'ml', 'kg', 'gram', 'piece', 'sq ft', 'metre', 'box'], draft.unit))}</select>
          </label>
          <label>Stock in hand<input type="number" name="stock" step="0.01" value="${U.raw(String(U.n(draft.stock)))}"></label>
          <label>Re-order level<input type="number" name="reorder" step="0.01" value="${U.raw(String(U.n(draft.reorder)))}"></label>
          <label>Cost per unit<input type="number" name="cost" step="0.01" value="${U.raw(String(U.n(draft.cost)))}"></label>
          <label>Supplier<input type="text" name="supplier" value="${draft.supplier || ''}"></label>
        </div>`,
      footer: U.html`
        ${U.raw(it ? U.html`<button class="btn ghost danger" type="button" id="delItem">Delete</button>` : '')}
        <span class="spacer"></span>
        <button class="btn ghost" type="button" data-close="1">Cancel</button>
        <button class="btn primary" type="button" id="saveItem">${it ? 'Save' : 'Add item'}</button>`,
      onMount: function (wrap) {
        wrap.querySelector('#saveItem').addEventListener('click', function () {
          var f = U.formData(wrap);
          if (!String(f.name || '').trim()) { U.toast('Item name is required', 'warn'); return; }
          var rec = it || { id: U.uid('it') };
          Object.assign(rec, {
            name: f.name.trim(), unit: f.unit, stock: U.n(f.stock),
            reorder: U.n(f.reorder), cost: U.n(f.cost), supplier: f.supplier
          });
          if (!it) S.db.inventory.push(rec);
          U.closeModal(); App.refresh(); U.toast(it ? 'Item updated' : 'Item added');
        });
        var del = wrap.querySelector('#delItem');
        if (del) del.addEventListener('click', function () {
          U.confirm('Delete ' + it.name + '?', { danger: true, ok: 'Delete' }).then(function (ok) {
            if (!ok) return;
            S.db.inventory = S.db.inventory.filter(function (x) { return x.id !== it.id; });
            S.db.services.forEach(function (sv) {
              sv.materials = (sv.materials || []).filter(function (m) { return m.itemId !== it.id; });
            });
            U.closeModal(); App.refresh(); U.toast('Item deleted');
          });
        });
      }
    });
  }

  function moveDialog(itemId, direction) {
    var isIn = direction > 0;
    U.modal({
      title: isIn ? 'Stock received' : 'Stock used / wasted',
      body: U.html`
        <div class="form-grid two">
          <label>Item
            <select name="itemId">${U.raw(App.options(S.db.inventory.slice().sort(U.by('name')).map(function (i) {
              return { value: i.id, label: i.name + ' (' + U.numFmt(i.stock) + ' ' + i.unit + ')' };
            }), itemId, { blank: '— choose —' }))}</select>
          </label>
          <label>Quantity<input type="number" name="qty" step="0.01" min="0" placeholder="0"></label>
          <label>Date<input type="date" name="date" value="${U.today()}"></label>
          <label>Reason
            <select name="reason">${U.raw(App.options(isIn
              ? ['Purchase', 'Return from job', 'Opening stock', 'Correction']
              : ['Used on job', 'Wastage', 'Damaged', 'Correction'], isIn ? 'Purchase' : 'Used on job'))}</select>
          </label>
        </div>
        ${U.raw(isIn ? U.html`
        <div class="form-grid two">
          <label>Total amount paid<input type="number" name="amount" step="1" min="0" placeholder="0"></label>
          <label class="check"><input type="checkbox" name="asExpense" checked> Also record as an expense</label>
        </div>
        <p class="muted sm">Recording the purchase as an expense keeps the accounts and the cash position correct.</p>` : '')}`,
      footer: U.html`
        <button class="btn ghost" type="button" data-close="1">Cancel</button>
        <button class="btn primary" type="button" id="saveMove">Save</button>`,
      onMount: function (wrap) {
        wrap.querySelector('#saveMove').addEventListener('click', function () {
          var f = U.formData(wrap);
          var it = S.item(f.itemId);
          if (!it) { U.toast('Choose an item', 'warn'); return; }
          if (U.n(f.qty) <= 0) { U.toast('Enter a quantity', 'warn'); return; }
          var qty = U.n(f.qty) * (isIn ? 1 : -1);
          it.stock = U.round2(U.n(it.stock) + qty);
          S.db.stockMoves.push({
            id: U.uid('mv'), date: f.date || U.today(), itemId: it.id, qty: qty,
            reason: f.reason, jobId: '',
            cost: isIn && U.n(f.amount) ? U.round2(f.amount) : U.round2(U.n(it.cost) * Math.abs(qty))
          });
          if (isIn && U.n(f.amount) > 0) {
            it.cost = U.round2(U.n(f.amount) / U.n(f.qty));
            if (f.asExpense) {
              S.db.expenses.push({
                id: U.uid('ex'), date: f.date || U.today(),
                category: 'Materials & consumables', amount: U.round2(f.amount),
                mode: 'Cash', note: it.name + ' × ' + U.numFmt(f.qty) + ' ' + it.unit, staffId: ''
              });
            }
          }
          U.closeModal(); App.refresh();
          U.toast(isIn ? 'Stock added' : 'Stock deducted');
        });
      }
    });
  }

  App.register('inventory', Inventory);
  global.Inventory = Inventory;
})(window);

// ── Receipt / Invoice builder ───────────────────────────────────────────────

let _docType    = 'Receipt';
let _editingId  = null;   // null = new, number = edit/duplicate

// ── Entry point ────────────────────────────────────────────────────────────

function startNewDoc(type) {
  _docType   = type || 'Receipt';
  _editingId = null;
  renderBuilder(null);
  navigate('builder');
}

function startEditDoc(doc) {
  _docType   = doc.docType;
  _editingId = doc.id;
  renderBuilder(doc);
  navigate('builder');
}

window.startNewDoc  = startNewDoc;
window.startEditDoc = startEditDoc;

// ── Number generation ──────────────────────────────────────────────────────

function genNumber(s) {
  return (s.numberPrefix || '') + zeroPad(s.nextNumber || 1, 4);
}

// ── Render builder ─────────────────────────────────────────────────────────

function renderBuilder(prefill) {
  const s    = getSettings() || {};
  const isNew = !prefill;
  const docNum = isNew ? genNumber(s) : prefill.number;
  const today  = new Date().toISOString().slice(0, 10);

  const items = prefill ? prefill.items : [{ description: '', qty: 1, unitPrice: '' }];

  document.getElementById('view-builder').innerHTML = `
    <div class="page-header" style="display:flex;align-items:center;gap:12px;">
      <button onclick="navigate('new')" style="background:none;border:none;color:#fff;padding:0;cursor:pointer;display:flex;align-items:center;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <div>
        <h1>${isNew ? 'New' : 'Edit'} ${_docType}</h1>
        <div class="subtitle">${docNum}</div>
      </div>
    </div>

    <div class="settings-list">

      <!-- Doc type + number -->
      <div class="field-group">
        <div class="field-group-label">Document</div>
        <div class="field-row toggle-row">
          <span class="toggle-label">Type</span>
          <div style="display:flex;gap:8px;">
            <button id="type-receipt" class="pill-btn ${_docType==='Receipt'?'pill-active':''}" onclick="switchDocType('Receipt')">Receipt</button>
            <button id="type-invoice" class="pill-btn ${_docType==='Invoice'?'pill-active':''}" onclick="switchDocType('Invoice')">Invoice</button>
          </div>
        </div>
        <div class="field-row">
          <label>Number</label>
          <input id="b-number" type="text" value="${esc(docNum)}" />
        </div>
        <div class="field-row">
          <label>Date</label>
          <input id="b-date" type="date" value="${prefill ? prefill.date : today}" />
        </div>
      </div>

      <!-- Client -->
      <div class="field-group">
        <div class="field-group-label">Client</div>
        <div class="field-row">
          <label>Name <span style="color:var(--danger)">*</span></label>
          <input id="b-clientName" type="text" value="${esc(prefill?.clientName||'')}" placeholder="Full name" list="client-list" autocomplete="off" oninput="maybeFillClient(this.value)" />
          <datalist id="client-list"></datalist>
          <datalist id="item-desc-list"></datalist>
        </div>
        <div class="field-row">
          <label>Phone (optional)</label>
          <input id="b-clientPhone" type="tel" value="${esc(prefill?.clientPhone||'')}" placeholder="080…" />
        </div>
        <div class="field-row">
          <label>Address (optional)</label>
          <input id="b-clientAddress" type="text" value="${esc(prefill?.clientAddress||'')}" placeholder="Estate / area" />
        </div>
      </div>

      <!-- Line items -->
      <div class="field-group">
        <div class="field-group-label">Items</div>
        <div id="items-container"></div>
        <div style="padding:10px 16px;">
          <button class="btn btn-outline" style="width:100%;height:42px;font-size:14px;" onclick="addItem()">+ Add Item</button>
        </div>
      </div>

      <!-- Discount -->
      <div class="field-group">
        <div class="field-group-label">Discount</div>
        <div class="field-row toggle-row">
          <span class="toggle-label">Type</span>
          <select id="b-discountType" onchange="updateTotals()" style="font-size:15px;background:none;border:none;color:var(--dark);font-family:inherit;">
            <option value="none"    ${(prefill?.discountType||'none')==='none'    ?'selected':''}>None</option>
            <option value="amount"  ${prefill?.discountType==='amount'  ?'selected':''}>Amount (₦)</option>
            <option value="percent" ${prefill?.discountType==='percent' ?'selected':''}>Percent (%)</option>
          </select>
        </div>
        <div class="field-row" id="discount-value-row" style="${(prefill?.discountType&&prefill.discountType!=='none')?'':'display:none;'}">
          <label id="discount-value-label">${prefill?.discountType==='percent'?'Discount (%)':'Discount Amount (₦)'}</label>
          <input id="b-discountValue" type="number" min="0" step="0.01" value="${prefill?.discountValue||''}" oninput="updateTotals()" placeholder="0" />
        </div>
      </div>

      <!-- VAT -->
      <div class="field-group">
        <div class="field-group-label">Tax</div>
        <div class="field-row toggle-row">
          <span class="toggle-label">Apply VAT (${s.vatRate||7.5}%)</span>
          <button class="toggle ${(prefill ? prefill.vatApplied : s.vatEnabled) ? 'on' : ''}" id="b-vat-toggle" onclick="toggleBuilderVAT()" aria-pressed="${prefill ? prefill.vatApplied : s.vatEnabled}"></button>
        </div>
      </div>

      <!-- Payment status -->
      <div class="field-group">
        <div class="field-group-label">Payment Status</div>
        <div class="field-row">
          <div style="display:flex;gap:8px;flex-wrap:wrap;padding-top:4px;">
            ${['Paid','Unpaid','Part-payment'].map(st =>
              `<button class="pill-btn ${(prefill?.paymentStatus||'Paid')===st?'pill-active':''}" onclick="selectStatus('${st}',this)">${st}</button>`
            ).join('')}
          </div>
          <input type="hidden" id="b-paymentStatus" value="${prefill?.paymentStatus||'Paid'}" />
        </div>
        <div class="field-row" id="amount-paid-row" style="${(prefill?.paymentStatus)==='Part-payment' ? '' : 'display:none;'}">
          <label>Amount Paid (₦)</label>
          <input id="b-amountPaid" type="number" min="0" step="0.01" value="${prefill?.amountPaid||''}" placeholder="0.00" />
        </div>
      </div>

      <!-- Production days + T&C toggle (Invoice only) -->
      <div class="field-group" id="production-group" style="${_docType==='Invoice' ? '' : 'display:none;'}">
        <div class="field-group-label">Production &amp; Delivery</div>
        <div class="field-row">
          <label>Production days</label>
          <input id="b-productionDays" type="number" min="1" value="${prefill?.productionDays||''}" placeholder="e.g. 21" />
        </div>
        <div class="field-row toggle-row">
          <span class="toggle-label">Include Terms &amp; Conditions</span>
          <button class="toggle ${ (prefill ? prefill.includeTC !== false : true) ? 'on' : ''}" id="b-tc-toggle" onclick="this.classList.toggle('on')" aria-pressed="${prefill ? prefill.includeTC !== false : true}"></button>
        </div>
      </div>

      <!-- Notes -->
      <div class="field-group">
        <div class="field-group-label">Notes (optional)</div>
        <div class="field-row">
          <textarea id="b-notes" rows="2" placeholder="E.g. delivery included, balance to be paid on delivery…">${esc(prefill?.notes||'')}</textarea>
        </div>
      </div>

      <!-- Live totals -->
      <div class="totals-card" id="totals-card">
        <div class="totals-row"><span>Subtotal</span><span id="t-subtotal">₦0.00</span></div>
        <div class="totals-row" id="t-discount-row" style="display:none;"><span>Discount</span><span id="t-discount" style="color:var(--danger);">-₦0.00</span></div>
        <div class="totals-row" id="t-vat-row" style="display:none;"><span>VAT (${s.vatRate||7.5}%)</span><span id="t-vat">₦0.00</span></div>
        <div class="totals-row totals-grand"><span>Total</span><span id="t-grand">₦0.00</span></div>
      </div>

      <button class="btn btn-primary" onclick="saveDoc()">Save ${_docType}</button>
      <div style="height:8px;"></div>
    </div>
  `;

  // Render initial items
  const container = document.getElementById('items-container');
  items.forEach((it, i) => appendItemRow(container, it, i));
  _itemIndex = items.length;

  // Wire discount type change
  document.getElementById('b-discountType').addEventListener('change', function() {
    const show = this.value !== 'none';
    document.getElementById('discount-value-row').style.display = show ? '' : 'none';
    document.getElementById('discount-value-label').textContent =
      this.value === 'percent' ? 'Discount (%)' : 'Discount Amount (₦)';
    if (!show) document.getElementById('b-discountValue').value = '';
    updateTotals();
  });

  updateTotals();
  populateSuggestions();
}

// ── Client + item autocomplete (built from saved documents) ────────────────

let _clientMap = {};   // name → { phone, address }
let _priceMap  = {};   // item description → last unit price

async function populateSuggestions() {
  try {
    const db   = await getDB();
    const docs = await db.getAll('receipts');
    docs.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || '')); // oldest first so latest wins

    _clientMap = {};
    _priceMap  = {};
    for (const d of docs) {
      if (d.clientName) {
        _clientMap[d.clientName] = { phone: d.clientPhone || '', address: d.clientAddress || '' };
      }
      for (const it of (d.items || [])) {
        if (it.description && it.unitPrice > 0) _priceMap[it.description] = it.unitPrice;
      }
    }

    const clientList = document.getElementById('client-list');
    if (clientList) {
      clientList.innerHTML = Object.keys(_clientMap)
        .map(n => `<option value="${esc(n)}"></option>`).join('');
    }
    const itemList = document.getElementById('item-desc-list');
    if (itemList) {
      itemList.innerHTML = Object.keys(_priceMap)
        .map(n => `<option value="${esc(n)}"></option>`).join('');
    }
  } catch(e) { console.error('populateSuggestions:', e); }
}

function maybeFillClient(name) {
  const c = _clientMap[name];
  if (!c) return;
  const phoneEl = document.getElementById('b-clientPhone');
  const addrEl  = document.getElementById('b-clientAddress');
  if (phoneEl && !phoneEl.value && c.phone)   phoneEl.value = c.phone;
  if (addrEl  && !addrEl.value  && c.address) addrEl.value  = c.address;
}

function maybeFillPrice(descInput) {
  const price = _priceMap[descInput.value];
  if (!price) return;
  const priceEl = descInput.closest('.item-row').querySelector('.item-price');
  if (priceEl && !priceEl.value) {
    priceEl.value = price;
    updateLineTotals(priceEl);
  }
}

window.maybeFillClient = maybeFillClient;
window.maybeFillPrice  = maybeFillPrice;

// ── Item rows ──────────────────────────────────────────────────────────────

let _itemIndex = 0;

function appendItemRow(container, item, idx) {
  const row = document.createElement('div');
  row.className = 'item-row';
  row.dataset.idx = idx;
  row.innerHTML = `
    <div class="item-row-top">
      <input class="item-desc" type="text" placeholder="Description" value="${esc(item.description||'')}" list="item-desc-list" autocomplete="off" oninput="maybeFillPrice(this);updateTotals()" />
      <button class="item-remove" onclick="removeItem(this)" aria-label="Remove item">×</button>
    </div>
    <div class="item-row-nums">
      <div class="item-field">
        <label>Qty</label>
        <input type="number" class="item-qty" min="0" step="any" value="${item.qty||1}" oninput="updateLineTotals(this);updateTotals();" />
      </div>
      <div class="item-field">
        <label>Unit Price (₦)</label>
        <input type="number" class="item-price" min="0" step="0.01" value="${item.unitPrice||''}" placeholder="0.00" oninput="updateLineTotals(this);updateTotals();" />
      </div>
      <div class="item-field">
        <label>Line Total</label>
        <div class="item-line-total" id="line-${idx}">₦0.00</div>
      </div>
    </div>
  `;
  container.appendChild(row);
  updateLineTotalsForRow(row, idx);
}

function addItem() {
  const container = document.getElementById('items-container');
  appendItemRow(container, { description: '', qty: 1, unitPrice: '' }, _itemIndex++);
  updateTotals();
}

function removeItem(btn) {
  const rows = document.querySelectorAll('.item-row');
  if (rows.length <= 1) { toast('At least one item is required', 'error'); return; }
  btn.closest('.item-row').remove();
  updateTotals();
}

function updateLineTotals(input) {
  const row = input.closest('.item-row');
  updateLineTotalsForRow(row, row.dataset.idx);
}

function updateLineTotalsForRow(row, idx) {
  const qty   = parseFloat(row.querySelector('.item-qty').value)   || 0;
  const price = parseFloat(row.querySelector('.item-price').value) || 0;
  const el    = document.getElementById('line-' + idx);
  if (el) el.textContent = fmtNaira(qty * price);
}

function getItems() {
  return Array.from(document.querySelectorAll('.item-row')).map(row => ({
    description: row.querySelector('.item-desc').value.trim(),
    qty:         parseFloat(row.querySelector('.item-qty').value)   || 0,
    unitPrice:   parseFloat(row.querySelector('.item-price').value) || 0,
  }));
}

// ── Live totals ────────────────────────────────────────────────────────────

function updateTotals() {
  const s    = getSettings() || {};
  const items = getItems();
  const discountType  = document.getElementById('b-discountType')?.value  || 'none';
  const discountValue = document.getElementById('b-discountValue')?.value || 0;
  const vatApplied    = document.getElementById('b-vat-toggle')?.classList.contains('on');
  const vatRate       = s.vatRate || 7.5;

  const t = calcTotals(items, discountType, discountValue, vatApplied, vatRate);

  document.getElementById('t-subtotal').textContent = fmtNaira(t.subtotal);
  document.getElementById('t-grand').textContent    = fmtNaira(t.grandTotal);

  const discRow = document.getElementById('t-discount-row');
  if (t.discount > 0) {
    discRow.style.display = '';
    document.getElementById('t-discount').textContent = '-' + fmtNaira(t.discount);
  } else {
    discRow.style.display = 'none';
  }

  const vatRow = document.getElementById('t-vat-row');
  if (vatApplied) {
    vatRow.style.display = '';
    document.getElementById('t-vat').textContent = fmtNaira(t.vat);
  } else {
    vatRow.style.display = 'none';
  }
}

function toggleBuilderVAT() {
  const btn = document.getElementById('b-vat-toggle');
  const on  = btn.classList.toggle('on');
  btn.setAttribute('aria-pressed', on);
  updateTotals();
}

function switchDocType(type) {
  _docType = type;
  document.getElementById('type-receipt').classList.toggle('pill-active', type === 'Receipt');
  document.getElementById('type-invoice').classList.toggle('pill-active', type === 'Invoice');
  document.querySelector('.page-header h1').textContent =
    (_editingId ? 'Edit ' : 'New ') + type;
  const pg = document.getElementById('production-group');
  if (pg) pg.style.display = type === 'Invoice' ? '' : 'none';
}

function selectStatus(status, btn) {
  document.querySelectorAll('#view-builder .pill-btn').forEach(b => {
    if (['Paid','Unpaid','Part-payment'].includes(b.textContent)) b.classList.remove('pill-active');
  });
  btn.classList.add('pill-active');
  document.getElementById('b-paymentStatus').value = status;
  const row = document.getElementById('amount-paid-row');
  if (row) row.style.display = status === 'Part-payment' ? '' : 'none';
}

// ── Save ───────────────────────────────────────────────────────────────────

async function saveDoc() {
  try {
    const s    = getSettings() || {};
    const clientName = document.getElementById('b-clientName').value.trim();
    if (!clientName) {
      toast('Client name is required', 'error');
      document.getElementById('b-clientName').focus();
      return;
    }

    const items = getItems();
    if (items.every(it => !it.description && !it.unitPrice)) {
      toast('Add at least one item', 'error'); return;
    }

    for (const it of items) {
      if (it.qty < 0)       { toast('Quantity cannot be negative', 'error'); return; }
      if (it.unitPrice < 0) { toast('Price cannot be negative', 'error'); return; }
    }

    const discountVal = parseFloat(document.getElementById('b-discountValue')?.value) || 0;
    if (discountVal < 0) { toast('Discount cannot be negative', 'error'); return; }

    const amountPaidVal = parseFloat(document.getElementById('b-amountPaid')?.value) || 0;
    if (amountPaidVal < 0) { toast('Amount paid cannot be negative', 'error'); return; }

    const discountType  = document.getElementById('b-discountType').value;
    const discountValue = parseFloat(document.getElementById('b-discountValue')?.value) || 0;
    const vatApplied    = document.getElementById('b-vat-toggle').classList.contains('on');
    const vatRate       = s.vatRate || 7.5;
    const totals        = calcTotals(items, discountType, discountValue, vatApplied, vatRate);

    const doc = {
      docType:       _docType,
      number:        document.getElementById('b-number').value.trim(),
      clientName,
      clientPhone:   document.getElementById('b-clientPhone').value.trim(),
      clientAddress: document.getElementById('b-clientAddress').value.trim(),
      date:          document.getElementById('b-date').value,
      items,
      discountType,
      discountValue,
      vatApplied,
      vatRate,
      paymentStatus:   document.getElementById('b-paymentStatus').value,
      amountPaid:      document.getElementById('b-paymentStatus').value === 'Part-payment'
                         ? (parseFloat(document.getElementById('b-amountPaid')?.value) || 0)
                         : null,
      productionDays:  _docType === 'Invoice'
                         ? (parseInt(document.getElementById('b-productionDays')?.value) || null)
                         : null,
      includeTC:       _docType === 'Invoice'
                         ? document.getElementById('b-tc-toggle')?.classList.contains('on') !== false
                         : false,
      notes:           document.getElementById('b-notes').value.trim(),
      totals,
      createdAt:     new Date().toISOString(),
    };

    if (_editingId) doc.id = _editingId;

    const db = await getDB();

    // Ensure receipts store exists (guard for old cached db.js)
    if (!db._raw.objectStoreNames.contains('receipts')) {
      toast('Please close & reopen the app to finish updating', 'error'); return;
    }

    await db.put('receipts', doc);

    if (!_editingId) {
      await saveSettings({ nextNumber: (s.nextNumber || 1) + 1 });
    }

    toast(_docType + ' saved ✓', 'success');

    // Backup reminder: nudge every 10 documents since last backup
    const sinceBackup = (parseInt(localStorage.getItem('docsSinceBackup')) || 0) + 1;
    localStorage.setItem('docsSinceBackup', sinceBackup);
    if (sinceBackup >= 10) {
      setTimeout(() => toast(`${sinceBackup} documents since last backup — export one in Settings`, 'error'), 2500);
    }

    navigate('history');
    await renderHistory();
  } catch (err) {
    toast('Save failed: ' + err.message, 'error');
    console.error('saveDoc error:', err);
  }
}

// ── History render + search ────────────────────────────────────────────────

let _allDocs = [];

async function renderHistory() {
  const db = await getDB();
  _allDocs = await db.getAll('receipts');
  _allDocs.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  const searchEl = document.getElementById('history-search');
  if (searchEl) searchEl.value = '';
  const clearBtn = document.getElementById('search-clear');
  if (clearBtn) clearBtn.style.display = 'none';
  renderHistorySummary();
  renderHistoryCards(_allDocs);
}

function outstandingOf(d) {
  const grand = d.totals?.grandTotal || 0;
  if (d.paymentStatus === 'Unpaid')       return grand;
  if (d.paymentStatus === 'Part-payment') return Math.max(0, grand - (d.amountPaid || 0));
  return 0;
}

function renderHistorySummary() {
  const el = document.getElementById('history-summary');
  if (!el) return;
  if (!_allDocs.length) { el.innerHTML = ''; return; }

  const thisMonth  = new Date().toISOString().slice(0, 7);
  const monthDocs  = _allDocs.filter(d => (d.date || '').startsWith(thisMonth));
  const monthTotal = monthDocs.reduce((sum, d) => sum + (d.totals?.grandTotal || 0), 0);
  const outstanding = _allDocs.reduce((sum, d) => sum + outstandingOf(d), 0);
  const unpaidCount = _allDocs.filter(d => outstandingOf(d) > 0).length;

  el.innerHTML = `
    <div class="summary-card">
      <div class="summary-item">
        <div class="summary-value">${fmtNaira(monthTotal)}</div>
        <div class="summary-label">This month · ${monthDocs.length} doc${monthDocs.length === 1 ? '' : 's'}</div>
      </div>
      <div class="summary-item ${outstanding > 0 ? 'summary-warn' : ''}">
        <div class="summary-value">${fmtNaira(outstanding)}</div>
        <div class="summary-label">Outstanding · ${unpaidCount} unpaid</div>
      </div>
    </div>`;
}

function filterHistory(query) {
  const clearBtn = document.getElementById('search-clear');
  if (clearBtn) clearBtn.style.display = query ? '' : 'none';
  if (!query.trim()) { renderHistoryCards(_allDocs); return; }
  const q = query.toLowerCase();
  renderHistoryCards(_allDocs.filter(d =>
    (d.clientName  || '').toLowerCase().includes(q) ||
    (d.number      || '').toLowerCase().includes(q) ||
    (d.clientPhone || '').toLowerCase().includes(q)
  ));
}

function clearSearch() {
  const el = document.getElementById('history-search');
  if (el) { el.value = ''; el.focus(); }
  filterHistory('');
}

function renderHistoryCards(docs) {
  const list      = document.getElementById('history-list');
  const empty     = document.getElementById('history-empty');
  const noResults = document.getElementById('history-no-results');
  if (!list) return;

  if (!_allDocs.length) {
    empty.style.display     = '';
    noResults.style.display = 'none';
    list.innerHTML = '';
    return;
  }
  empty.style.display = 'none';

  if (!docs.length) {
    noResults.style.display = '';
    list.innerHTML = '';
    return;
  }
  noResults.style.display = 'none';

  const today = Date.now();
  list.innerHTML = docs.map(d => {
    const sc = (d.paymentStatus || 'Paid').toLowerCase().replace('-', '');
    const bal = outstandingOf(d);
    const ageDays = d.date ? Math.floor((today - new Date(d.date).getTime()) / 86400000) : 0;
    const overdue = d.docType === 'Invoice' && bal > 0 && ageDays > 14;
    return `
    <div class="history-card" onclick="openHistoryDoc(${d.id})">
      <div class="hc-top">
        <span class="hc-type ${d.docType.toLowerCase()}">${esc(d.docType)}</span>
        <span class="hc-num">${esc(d.number)}</span>
        ${overdue ? '<span class="hc-status status-overdue">Overdue</span>' : ''}
        <span class="hc-status status-${sc}" ${overdue ? 'style="margin-left:6px;"' : ''}>${esc(d.paymentStatus || 'Paid')}</span>
      </div>
      <div class="hc-client">${esc(d.clientName)}</div>
      <div class="hc-bottom">
        <span class="hc-total">${fmtNaira(d.totals?.grandTotal || 0)}${d.paymentStatus === 'Part-payment' && bal > 0 ? ` <span class="hc-balance">· Bal ${fmtNaira(bal)}</span>` : ''}</span>
        <span class="hc-date">${fmtDate(d.date)}</span>
      </div>
    </div>`;
  }).join('');
}

async function openHistoryDoc(id) {
  const db  = await getDB();
  const doc = await db.get('receipts', id);
  if (!doc) return;
  showDocSheet(doc);
}

function showDocSheet(doc) {
  const s = getSettings() || {};
  const t = doc.totals || {};
  const existing = document.getElementById('doc-sheet');
  if (existing) existing.remove();

  const isReceipt = doc.docType === 'Receipt';
  const partPaid  = doc.paymentStatus === 'Part-payment' && doc.amountPaid != null ? doc.amountPaid : null;

  const itemRows = (doc.items || []).map(it => {
    const qty = parseFloat(it.qty) || 0, price = parseFloat(it.unitPrice) || 0;
    return `<tr><td class="pv-c">${qty}</td><td>${esc(it.description||'')}</td><td class="pv-r">${fmtNaira(price)}</td><td class="pv-r">${fmtNaira(qty*price)}</td></tr>`;
  }).join('');

  let totalsHtml = `<tr class="pv-total"><td colspan="3" class="pv-r">Total:</td><td class="pv-r">${fmtNaira(t.subtotal)}</td></tr>`;
  if (t.discount > 0)
    totalsHtml += `<tr class="pv-total"><td colspan="3" class="pv-r">Discount:</td><td class="pv-r">-${fmtNaira(t.discount)}</td></tr>`;
  if (doc.vatApplied && t.vat > 0)
    totalsHtml += `<tr class="pv-total"><td colspan="3" class="pv-r">VAT (${doc.vatRate||7.5}%):</td><td class="pv-r">${fmtNaira(t.vat)}</td></tr>`;
  if (isReceipt) {
    const paid = doc.paymentStatus === 'Paid' ? t.grandTotal : doc.paymentStatus === 'Unpaid' ? 0 : partPaid;
    totalsHtml += `<tr class="pv-total"><td colspan="3" class="pv-r">Amount Paid:</td><td class="pv-r">${paid !== null ? fmtNaira(paid) : '—'}</td></tr>`;
    const balText = doc.paymentStatus === 'Paid' ? 'Fully paid'
                  : doc.paymentStatus === 'Unpaid' ? fmtNaira(t.grandTotal)
                  : partPaid !== null ? fmtNaira(Math.max(0, t.grandTotal - partPaid)) : 'Part payment';
    totalsHtml += `<tr class="pv-total pv-grand"><td colspan="3" class="pv-r">Balance due:</td><td class="pv-r">${balText}</td></tr>`;
  } else {
    totalsHtml += `<tr class="pv-total pv-grand"><td colspan="3" class="pv-r">Grand Total:</td><td class="pv-r">${fmtNaira(t.grandTotal)}</td></tr>`;
    if (partPaid !== null) {
      totalsHtml += `<tr class="pv-total"><td colspan="3" class="pv-r">Amount Paid:</td><td class="pv-r">${fmtNaira(partPaid)}</td></tr>`;
      totalsHtml += `<tr class="pv-total"><td colspan="3" class="pv-r">Balance due:</td><td class="pv-r">${fmtNaira(Math.max(0, t.grandTotal - partPaid))}</td></tr>`;
    } else {
      totalsHtml += `<tr class="pv-total"><td colspan="3" class="pv-r">Status:</td><td class="pv-r">${esc(doc.paymentStatus||'Unpaid')}</td></tr>`;
    }
  }

  const addrLine = (s.address || '').split('\n').filter(Boolean).join(' · ');
  const tcHtml = !isReceipt && doc.includeTC && typeof woovioTerms === 'function' ? `
    <div class="pv-tc">
      ${s.accountDetails ? `<div class="pv-tc-head">Account Details</div><div class="pv-tc-acct">${esc(s.accountDetails).replace(/\n/g,'<br>')}</div>` : ''}
      <div class="pv-tc-warn">Please read the terms and conditions stated below before making any payments!!!</div>
      <div class="pv-tc-head">Terms and Conditions</div>
      <ol>${woovioTerms(doc.productionDays).map(r => `<li>${esc(r)}</li>`).join('')}</ol>
    </div>` : '';

  const sheet = document.createElement('div');
  sheet.id = 'doc-sheet';
  sheet.innerHTML = `
    <div id="doc-preview-panel">
      <div class="pv-header">
        <span>${esc(doc.docType)} ${esc(doc.number)}</span>
        <span class="hc-status status-${(doc.paymentStatus||'Paid').toLowerCase().replace('-','')}" style="margin-left:auto;margin-right:12px;">${esc(doc.paymentStatus||'Paid')}</span>
        <button class="pv-close" onclick="closeDocSheet()" aria-label="Close">×</button>
      </div>
      <div class="pv-scroll">
        <div class="pv-paper">
          <img class="pv-logo" src="${typeof makeBracketWLogo === 'function' ? makeBracketWLogo(200) : ''}" alt="" />
          <div class="pv-biz">${esc(s.businessName || 'Woovio Interiors')}</div>
          <div class="pv-tag">${esc(s.tagline || '')}</div>
          <div class="pv-doctype">${esc(doc.docType.toUpperCase())}</div>
          <div class="pv-meta"><span>Date: <u>${fmtDate(doc.date)}</u></span><span>${esc(doc.docType)} No: <u>${esc(doc.number||'')}</u></span></div>
          <div class="pv-meta"><span>Name: <u>${esc(doc.clientName||'')}</u></span>${doc.clientPhone ? `<span>Contact: <u>${esc(doc.clientPhone)}</u></span>` : ''}</div>
          ${doc.clientAddress ? `<div class="pv-meta"><span>Address: <u>${esc(doc.clientAddress)}</u></span></div>` : ''}
          <table class="pv-table">
            <thead><tr><th class="pv-c">Qty</th><th>Description</th><th class="pv-r">Price</th><th class="pv-r">Total</th></tr></thead>
            <tbody>${itemRows}${totalsHtml}</tbody>
          </table>
          ${doc.notes ? `<div class="pv-notes">${esc(doc.notes)}</div>` : ''}
          <div class="pv-sig">
            <div>Authorized Signature:</div>
            ${s.signatureBase64 ? `<img src="${s.signatureBase64}" alt="signature" />` : '<div class="pv-sigline"></div>'}
            <div class="pv-signame">${esc(s.signatureName || '')}</div>
          </div>
          ${tcHtml}
          <div class="pv-footer">${esc(addrLine)}${s.phone ? ' · ' + esc(s.phone) : ''}</div>
        </div>
      </div>
      <div class="pv-actions">
        <button class="btn btn-gold" style="width:100%;" onclick="triggerExport(${doc.id})">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
          Share PDF
        </button>
        <div style="display:flex;gap:10px;margin-top:10px;">
          ${doc.docType === 'Invoice' ? `<button class="btn btn-outline" style="flex:1;" onclick="convertToReceipt(${doc.id})">To Receipt</button>` : ''}
          <button class="btn btn-outline" style="flex:1;" onclick="duplicateDoc(${doc.id})">Duplicate</button>
          <button class="btn btn-outline" style="flex:1;color:var(--danger);border-color:var(--danger);" onclick="deleteDoc(${doc.id})">Delete</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(sheet);
  setTimeout(() => sheet.querySelector('#doc-preview-panel').classList.add('open'), 20);
}

function closeDocSheet() {
  const sheet = document.getElementById('doc-sheet');
  if (!sheet) return;
  const panel = sheet.querySelector('#doc-preview-panel');
  if (panel) panel.classList.remove('open');
  setTimeout(() => sheet.remove(), 250);
}

async function triggerExport(id) {
  const db  = await getDB();
  const doc = await db.get('receipts', id);
  if (!doc) return;
  closeDocSheet();
  showPdfLoader();
  setTimeout(() => {
    try { exportPDF(doc); } catch(e) { toast('PDF error: ' + e.message, 'error'); }
    setTimeout(hidePdfLoader, 600);
  }, 300);
}

function showPdfLoader() {
  const el = document.getElementById('pdf-loader');
  if (el) el.classList.add('show');
}

function hidePdfLoader() {
  const el = document.getElementById('pdf-loader');
  if (el) el.classList.remove('show');
}

async function duplicateDoc(id) {
  const db  = await getDB();
  const src = await db.get('receipts', id);
  if (!src) return;
  closeDocSheet();
  const s   = getSettings() || {};
  const dup = Object.assign({}, src);
  delete dup.id;
  dup.number    = genNumber(s);
  dup.date      = new Date().toISOString().slice(0, 10);
  dup.createdAt = new Date().toISOString();
  startEditDoc(dup);
}

async function convertToReceipt(id) {
  const db  = await getDB();
  const src = await db.get('receipts', id);
  if (!src) return;
  closeDocSheet();
  const s   = getSettings() || {};
  const rec = Object.assign({}, src);
  delete rec.id;
  rec.docType       = 'Receipt';
  rec.number        = genNumber(s);
  rec.date          = new Date().toISOString().slice(0, 10);
  rec.createdAt     = new Date().toISOString();
  rec.paymentStatus = 'Paid';
  rec.amountPaid    = null;
  rec.includeTC     = false;
  startEditDoc(rec);
  toast('Converted — review and save', 'success');
}

async function deleteDoc(id) {
  if (!confirm('Delete this document? This cannot be undone.')) return;
  const db = await getDB();
  await db.delete('receipts', id);
  closeDocSheet();
  toast('Deleted', 'success');
  await renderHistory();
}

function fmtDate(iso) {
  if (!iso) return '';
  const [y,m,d] = iso.split('-');
  return `${d}-${m}-${y}`;
}

function esc(str) {
  return (str||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
}

window.renderHistory     = renderHistory;
window.filterHistory     = filterHistory;
window.clearSearch       = clearSearch;
window.openHistoryDoc    = openHistoryDoc;
window.showPdfLoader     = showPdfLoader;
window.hidePdfLoader     = hidePdfLoader;
window.closeDocSheet    = closeDocSheet;
window.triggerExport    = triggerExport;
window.duplicateDoc     = duplicateDoc;
window.convertToReceipt = convertToReceipt;
window.deleteDoc        = deleteDoc;
window.addItem          = addItem;
window.removeItem       = removeItem;
window.updateTotals     = updateTotals;
window.updateLineTotals = updateLineTotals;
window.toggleBuilderVAT = toggleBuilderVAT;
window.switchDocType    = switchDocType;
window.selectStatus     = selectStatus;
window.saveDoc          = saveDoc;
window.openHistoryDoc   = openHistoryDoc;

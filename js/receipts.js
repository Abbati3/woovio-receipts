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
          <input id="b-clientName" type="text" value="${esc(prefill?.clientName||'')}" placeholder="Full name" />
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
}

// ── Item rows ──────────────────────────────────────────────────────────────

let _itemIndex = 0;

function appendItemRow(container, item, idx) {
  const row = document.createElement('div');
  row.className = 'item-row';
  row.dataset.idx = idx;
  row.innerHTML = `
    <div class="item-row-top">
      <input class="item-desc" type="text" placeholder="Description" value="${esc(item.description||'')}" oninput="updateTotals()" />
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
  renderHistoryCards(_allDocs);
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

  list.innerHTML = docs.map(d => {
    const sc = (d.paymentStatus || 'Paid').toLowerCase().replace('-', '');
    return `
    <div class="history-card" onclick="openHistoryDoc(${d.id})">
      <div class="hc-top">
        <span class="hc-type ${d.docType.toLowerCase()}">${esc(d.docType)}</span>
        <span class="hc-num">${esc(d.number)}</span>
        <span class="hc-status status-${sc}">${esc(d.paymentStatus || 'Paid')}</span>
      </div>
      <div class="hc-client">${esc(d.clientName)}</div>
      <div class="hc-bottom">
        <span class="hc-total">${fmtNaira(d.totals?.grandTotal || 0)}</span>
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
  const t = doc.totals || {};
  const existing = document.getElementById('doc-sheet');
  if (existing) existing.remove();

  const sheet = document.createElement('div');
  sheet.id = 'doc-sheet';
  sheet.innerHTML = `
    <div id="doc-sheet-overlay" onclick="closeDocSheet()"></div>
    <div id="doc-sheet-panel">
      <div class="sheet-handle"></div>
      <div class="sheet-header">
        <div class="sheet-title">${esc(doc.docType)} ${esc(doc.number)}</div>
        <div class="sheet-sub">${fmtDate(doc.date)} · ${esc(doc.clientName)}</div>
      </div>

      <div class="sheet-totals">
        ${t.discount > 0 ? `<div class="sheet-row"><span>Subtotal</span><span>${fmtNaira(t.subtotal)}</span></div>` : ''}
        ${t.discount > 0 ? `<div class="sheet-row"><span>Discount</span><span style="color:var(--danger)">-${fmtNaira(t.discount)}</span></div>` : ''}
        ${doc.vatApplied && t.vat > 0 ? `<div class="sheet-row"><span>VAT</span><span>${fmtNaira(t.vat)}</span></div>` : ''}
        <div class="sheet-row sheet-grand"><span>Total</span><span>${fmtNaira(t.grandTotal)}</span></div>
        <div class="sheet-row" style="margin-top:4px;"><span>Status</span>
          <span class="hc-status status-${(doc.paymentStatus||'Paid').toLowerCase().replace('-','')}">${doc.paymentStatus}</span>
        </div>
      </div>

      <div class="sheet-actions">
        <button class="btn btn-gold" style="width:100%;" onclick="triggerExport(${doc.id})">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export PDF
        </button>
        <div style="display:flex;gap:10px;margin-top:10px;">
          <button class="btn btn-outline" style="flex:1;" onclick="duplicateDoc(${doc.id})">Duplicate</button>
          <button class="btn btn-outline" style="flex:1;color:var(--danger);border-color:var(--danger);" onclick="deleteDoc(${doc.id})">Delete</button>
        </div>
        <button class="btn btn-outline" style="width:100%;margin-top:10px;" onclick="closeDocSheet()">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(sheet);
  requestAnimationFrame(() => sheet.querySelector('#doc-sheet-panel').classList.add('open'));
}

function closeDocSheet() {
  const sheet = document.getElementById('doc-sheet');
  if (!sheet) return;
  sheet.querySelector('#doc-sheet-panel').classList.remove('open');
  setTimeout(() => sheet.remove(), 300);
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

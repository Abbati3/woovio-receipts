// ── Calculation helpers ────────────────────────────────────────────────────

// Totals are derived from a document, never stored as the source of truth, so
// every document — however old — renders through the current calculation.
// Rates come from the document itself, so changing a rate in Settings never
// rewrites the value of an invoice that was already issued.
function calcTotals(d) {
  d = d || {};

  // Legacy documents carry serviceApplied + serviceRate (always a percentage)
  let serviceType  = d.serviceType;
  let serviceValue = d.serviceValue;
  if (serviceType == null) {
    serviceType  = d.serviceApplied ? 'percent' : 'none';
    serviceValue = d.serviceRate || 0;
  }

  // In list-only mode the job carries a single total instead of priced rows
  const subtotal = d.lumpSum
    ? (parseFloat(d.lumpSumValue) || 0)
    : (d.items || []).reduce((sum, it) => {
        const qty   = parseFloat(it.qty)       || 0;
        const price = parseFloat(it.unitPrice) || 0;
        return sum + qty * price;
      }, 0);

  let discount = 0;
  if (d.discountType === 'percent') {
    discount = subtotal * (parseFloat(d.discountValue) || 0) / 100;
  } else if (d.discountType === 'amount') {
    discount = parseFloat(d.discountValue) || 0;
  }
  discount = Math.min(discount, subtotal);

  const base = subtotal - discount;

  // Consultation / service charge — a percentage of the discounted total, or a flat figure
  let service = 0;
  if (serviceType === 'percent') {
    service = base * (parseFloat(serviceValue) || 0) / 100;
  } else if (serviceType === 'amount') {
    service = parseFloat(serviceValue) || 0;
  }

  const taxable    = base + service;
  const vat        = d.vatApplied ? taxable * (parseFloat(d.vatRate) || 0) / 100 : 0;
  const grandTotal = taxable + vat;

  return {
    subtotal:   round2(subtotal),
    discount:   round2(discount),
    service:    round2(service),
    vat:        round2(vat),
    grandTotal: round2(grandTotal)
  };
}

// The charge line as it reads on the document, e.g. "… service charge (10%)"
function serviceChargeLabel(d, fallbackLabel) {
  const label = d.serviceLabel || fallbackLabel || 'Consultation and service charge';
  const type  = d.serviceType != null ? d.serviceType : (d.serviceApplied ? 'percent' : 'none');
  const value = d.serviceValue != null ? d.serviceValue : d.serviceRate;
  return type === 'percent' ? `${label} (${value}%)` : label;
}

// ── Document identity ──────────────────────────────────────────────────────

// A website reads better on paper without its protocol or trailing slash
function fmtWebsite(url) {
  return (url || '').trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
}

// The identity line at the foot of every document. Built in one place so the
// on-screen preview and the PDF can never drift apart.
function documentFooterParts(s) {
  s = s || {};
  // A line's trailing comma reads as a stray mark once the separator follows it
  const parts = (s.address || '').split('\n')
    .map(x => x.trim().replace(/,$/, ''))
    .filter(Boolean);
  if (s.phone) parts.push(s.phone);
  if (s.email) parts.push(s.email);

  const web = fmtWebsite(s.website);
  if (web) parts.push(web);

  // Accepts "8519204" or "RC 8519204" without printing "RC RC ..."
  const rc = (s.rcNumber || '').trim().replace(/^RC[:\s]*/i, '');
  if (rc) parts.push('RC ' + rc);

  return parts;
}

function round2(n) { return Math.round(n * 100) / 100; }

function fmtNaira(n) {
  return '₦' + Number(n).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function zeroPad(n, len) { return String(n).padStart(len, '0'); }

window.calcTotals           = calcTotals;
window.serviceChargeLabel   = serviceChargeLabel;
window.fmtWebsite           = fmtWebsite;
window.documentFooterParts  = documentFooterParts;
window.fmtNaira           = fmtNaira;
window.zeroPad            = zeroPad;

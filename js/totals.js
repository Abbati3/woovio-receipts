// ── Calculation helpers ────────────────────────────────────────────────────

function calcTotals(items, discountType, discountValue, vatApplied, vatRate) {
  const subtotal = items.reduce((sum, it) => {
    const qty  = parseFloat(it.qty)       || 0;
    const price = parseFloat(it.unitPrice) || 0;
    return sum + qty * price;
  }, 0);

  let discount = 0;
  if (discountType === 'percent') {
    discount = subtotal * (parseFloat(discountValue) || 0) / 100;
  } else if (discountType === 'amount') {
    discount = parseFloat(discountValue) || 0;
  }
  discount = Math.min(discount, subtotal);

  const base = subtotal - discount;
  const vat  = vatApplied ? base * (parseFloat(vatRate) || 0) / 100 : 0;
  const grandTotal = base + vat;

  return {
    subtotal:   round2(subtotal),
    discount:   round2(discount),
    vat:        round2(vat),
    grandTotal: round2(grandTotal)
  };
}

function round2(n) { return Math.round(n * 100) / 100; }

function fmtNaira(n) {
  return '₦' + Number(n).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function zeroPad(n, len) { return String(n).padStart(len, '0'); }

window.calcTotals = calcTotals;
window.fmtNaira   = fmtNaira;
window.zeroPad    = zeroPad;

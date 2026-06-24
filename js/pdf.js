// ── PDF export — Woovio Interiors receipt/invoice layout ──────────────────

// ── Draw the bracket-W logo onto a canvas and return a data URL ────────────
function makeBracketWLogo(size) {
  size = size || 300;
  const canvas = document.createElement('canvas');
  canvas.width  = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);

  const arm  = size * 0.18;
  const pad  = size * 0.10;
  const lw   = size * 0.035;

  ctx.strokeStyle = '#1C1C1C';
  ctx.lineWidth   = lw;
  ctx.lineCap     = 'square';

  // Top-left  ⌐
  ctx.beginPath(); ctx.moveTo(pad + arm, pad); ctx.lineTo(pad, pad); ctx.lineTo(pad, pad + arm); ctx.stroke();
  // Top-right ¬
  ctx.beginPath(); ctx.moveTo(size - pad - arm, pad); ctx.lineTo(size - pad, pad); ctx.lineTo(size - pad, pad + arm); ctx.stroke();
  // Bottom-left L
  ctx.beginPath(); ctx.moveTo(pad, size - pad - arm); ctx.lineTo(pad, size - pad); ctx.lineTo(pad + arm, size - pad); ctx.stroke();
  // Bottom-right J
  ctx.beginPath(); ctx.moveTo(size - pad, size - pad - arm); ctx.lineTo(size - pad, size - pad); ctx.lineTo(size - pad - arm, size - pad); ctx.stroke();

  // W letter
  const fontSize = Math.round(size * 0.52);
  ctx.font         = `normal ${fontSize}px "Times New Roman", "Times", serif`;
  ctx.fillStyle    = '#1C1C1C';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('W', size / 2, size / 2 + size * 0.03);

  return canvas.toDataURL('image/png');
}

// ── Main export function ────────────────────────────────────────────────────

async function exportPDF(doc) {
  if (typeof pdfMake === 'undefined') {
    toast('PDF library not loaded — please reload the app', 'error');
    return;
  }

  const s = getSettings() || {};
  const t = doc.totals  || {};
  const isReceipt = doc.docType === 'Receipt';

  const BLACK = '#1C1C1C';
  const GREY  = '#555555';
  const LINE  = '#CCCCCC';
  const WHITE = '#FFFFFF';

  const naira = v => '₦' + Number(v || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const ul    = text => ({ text, decoration: 'underline' });
  const fmtD  = iso  => { if (!iso) return ''; const [y,m,d] = iso.split('-'); return `${d}-${m}-${y}`; };

  // ── Logo: always the bracket-W (programmatic) ─────────────────────────────
  const wLogo = makeBracketWLogo(300);

  // ── Signature image (if drawn/uploaded) ───────────────────────────────────
  const sigImg     = s.signatureBase64 || '';
  const sigName    = s.signatureName   || 'Yakubu Balami Haruna';
  const bizName    = s.businessName    || 'Woovio Interiors';
  const tagline    = s.tagline         || 'Crafting comfort, Redefining spaces';

  // ── Items rows ─────────────────────────────────────────────────────────────
  const itemRows = (doc.items || []).map(it => {
    const qty   = parseFloat(it.qty)       || 0;
    const price = parseFloat(it.unitPrice) || 0;
    return [
      { text: String(qty),       style: 'tCell', alignment: 'center' },
      { text: it.description || '', style: 'tCell' },
      { text: naira(price),      style: 'tCell', alignment: 'right' },
      { text: naira(qty * price),style: 'tCell', alignment: 'right' },
    ];
  });

  // ── Totals rows ────────────────────────────────────────────────────────────
  const totalsRows = [];
  const tb = (l, r, borders, style) => [
    { text: l, style: style || 'tTotalLabel', colSpan: 3, alignment: 'right',
      border: [borders[0], borders[1], false, borders[3]] }, {}, {},
    { text: r, style: style || 'tTotalValue',
      border: [false, borders[1], borders[2], borders[3]] },
  ];

  totalsRows.push(tb('Total:', naira(t.subtotal), [true, true, true, false]));

  if (t.discount > 0) {
    totalsRows.push(tb('Discount:', '-' + naira(t.discount), [true, false, true, false]));
  }

  if (doc.vatApplied && t.vat > 0) {
    totalsRows.push(tb(`VAT (${doc.vatRate || 7.5}%):`, naira(t.vat), [true, false, true, false]));
  }

  if (isReceipt) {
    const paid = doc.paymentStatus === 'Paid'   ? t.grandTotal
               : doc.paymentStatus === 'Unpaid' ? 0
               : null;
    totalsRows.push(tb('Amount Paid:', paid !== null ? naira(paid) : '—', [true, false, true, false]));
    const balText = doc.paymentStatus === 'Paid'   ? 'Fully paid'
                  : doc.paymentStatus === 'Unpaid' ? naira(t.grandTotal)
                  : 'Part payment';
    totalsRows.push(tb('Balance due:', balText, [true, false, true, true]));
  } else {
    totalsRows.push(tb('Grand Total:', naira(t.grandTotal), [true, false, true, false], 'tGrandLabel'));
    totalsRows.push(tb('Status:', doc.paymentStatus || 'Unpaid', [true, false, true, true]));
  }

  // ── Footer lines ───────────────────────────────────────────────────────────
  const addrLines = (s.address || '').split('\n').filter(Boolean);
  const footerParts = [...addrLines, s.phone, s.email].filter(Boolean);

  // ── Signature block ────────────────────────────────────────────────────────
  const sigBlock = sigImg
    ? [
        { text: 'Authorized Signature:', fontSize: 10, margin: [0, 20, 0, 4] },
        { image: sigImg, width: 120, margin: [0, 0, 0, 4] },
        { text: ul(sigName), fontSize: 10 },
      ]
    : [
        { text: 'Authorized Signature:', fontSize: 10, margin: [0, 20, 0, 0] },
        {
          canvas: [{ type: 'line', x1: 0, y1: 14, x2: 200, y2: 14, lineWidth: 0.5, lineColor: LINE }],
          margin: [0, 0, 0, 2],
        },
        { text: ul(sigName), fontSize: 10 },
      ];

  // ── Document definition ────────────────────────────────────────────────────
  const dd = {
    pageSize:    'A4',
    pageMargins: [50, 40, 50, 70],

    images: { wlogo: wLogo, ...(sigImg ? { sigimage: sigImg } : {}) },

    defaultStyle: { font: 'Roboto', fontSize: 10, color: BLACK },

    styles: {
      bizName:     { fontSize: 18, bold: true, alignment: 'center', margin: [0, 6, 0, 2] },
      tagline:     { fontSize: 9, italics: true, alignment: 'center', color: GREY, margin: [0, 0, 0, 18] },
      docType:     { fontSize: 22, bold: true, alignment: 'center', margin: [0, 0, 0, 16] },
      label:       { fontSize: 10, color: BLACK },
      tHeader:     { fontSize: 10, bold: true, fillColor: BLACK, color: WHITE, margin: [4, 5, 4, 5] },
      tCell:       { fontSize: 10, margin: [4, 5, 4, 5] },
      tTotalLabel: { fontSize: 10, margin: [4, 4, 8, 4] },
      tTotalValue: { fontSize: 10, margin: [4, 4, 4, 4] },
      tGrandLabel: { fontSize: 11, bold: true, margin: [4, 4, 8, 4] },
    },

    content: [
      // Logo (bracket-W)
      { image: 'wlogo', width: 80, alignment: 'center', margin: [0, 0, 0, 0] },
      // Business name + tagline
      { text: bizName, style: 'bizName' },
      { text: tagline, style: 'tagline' },
      // Doc type heading
      { text: doc.docType.toUpperCase(), style: 'docType' },
      // Date / number
      {
        columns: [
          { text: ['Date:  ', ul(fmtD(doc.date))],           style: 'label', width: '*' },
          { text: [doc.docType + ' No: ', ul(doc.number||'')], style: 'label', alignment: 'right', width: '*' },
        ],
        margin: [0, 0, 0, 6],
      },
      // Client name / phone
      {
        columns: [
          { text: ['Name:  ', ul(doc.clientName || '')], style: 'label', width: '*' },
          doc.clientPhone
            ? { text: ['Contact No: ', ul(doc.clientPhone)], style: 'label', alignment: 'right', width: '*' }
            : { text: '', width: '*' },
        ],
        margin: [0, 0, 0, 4],
      },
      // Address
      doc.clientAddress
        ? { text: ['Address: ', ul(doc.clientAddress)], style: 'label', margin: [0, 0, 0, 14] }
        : { text: '', margin: [0, 0, 0, 14] },

      // Items table
      {
        table: {
          headerRows: 1,
          widths: [30, '*', 100, 100],
          body: [
            [
              { text: 'Qty',         style: 'tHeader', alignment: 'center', border: [true,true,true,true] },
              { text: 'Description', style: 'tHeader',                      border: [true,true,true,true] },
              { text: 'Price',       style: 'tHeader', alignment: 'right',  border: [true,true,true,true] },
              { text: 'Total',       style: 'tHeader', alignment: 'right',  border: [true,true,true,true] },
            ],
            ...itemRows.map(row => row.map(cell => ({ ...cell, border: [true,false,true,true] }))),
            ...totalsRows,
          ],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => LINE,
          vLineColor: () => LINE,
        },
        margin: [0, 0, 0, 14],
      },

      // Notes
      ...(doc.notes ? [{ text: doc.notes, fontSize: 9, color: GREY, margin: [0, 0, 0, 8] }] : []),

      // Signature
      ...sigBlock,

      // Terms & Conditions (invoice only, when toggled on)
      ...(!isReceipt && doc.includeTC ? [
        // Force T&C onto a new page
        { text: '', pageBreak: 'before' },
        // Account details
        ...(s.accountDetails ? [
          { text: 'Account Details', fontSize: 11, bold: true, margin: [0, 0, 0, 4] },
          { text: s.accountDetails, fontSize: 10, margin: [0, 0, 0, 16] },
        ] : []),
        {
          text: 'Please read the terms and conditions stated below before making any payments!!!',
          fontSize: 9, bold: true, color: BLACK, margin: [0, 0, 0, 10],
        },
        { text: 'Terms and Conditions', fontSize: 13, bold: true, margin: [0, 0, 0, 8] },
        {
          ol: [
            'Production starts after at least 75% of the sales amount is paid.',
            'The production and delivery time of the goods is ' +
              (doc.productionDays ? doc.productionDays + ' days' : '______') +
              ', except for any obstacles.',
            'Client has 7 working days to pay balance after being informed about the completion of his order.',
            'Cancellation of orders shall be communicated to the company before payment and production. The client will not get a refund when an order is cancelled after production commences.',
            'All transportation costs from the showroom are solely the client\'s responsibility.',
            'Goods will be released for delivery only after full payment is made and confirmed.',
            'In the case of custom orders and warehouse goods, transportation costs are paid for by the clients.',
            'Goods not received within one year will be treated by the company as abandoned goods and cannot be claimed by the client. The company has the right to dispose of customer abandoned property after 1 year.',
            'If the client\'s home/office is not ready when we go for installation, an additional installation fee will be charged for future visits.',
            'None of the electrical systems used in our products are covered by warranty.',
            'The client is required to have read and accepted the above written conditions before making an advance or any payment for the cost of goods.',
          ],
          fontSize: 10,
          color: BLACK,
          margin: [0, 0, 0, 0],
        },
      ] : []),
    ],

    footer: () => ({
      stack: [
        { canvas: [{ type: 'line', x1: 50, y1: 0, x2: 545, y2: 0, lineWidth: 0.5, lineColor: LINE }] },
        { text: footerParts.join('  ·  '), fontSize: 9, color: GREY, alignment: 'center', margin: [50, 6, 50, 0] },
        ...(s.footerNote
          ? [{ text: s.footerNote, fontSize: 9, color: GREY, alignment: 'center', italics: true, margin: [50, 3, 50, 0] }]
          : []),
      ],
      margin: [0, 8, 0, 0],
    }),
  };

  const filename = `${doc.docType}-${doc.number || 'draft'}.pdf`;

  try {
    pdfMake.createPdf(dd).download(filename);
  } catch (e) {
    toast('PDF error: ' + e.message, 'error');
    console.error('exportPDF error:', e);
  }
}

window.exportPDF = exportPDF;

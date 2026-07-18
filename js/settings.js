// ── Settings — load, save, render ──────────────────────────────────────────

const SETTINGS_KEY = 'main';

const DEFAULTS = {
  id:               SETTINGS_KEY,
  businessName:     'Woovio Interiors',
  tagline:          'Crafting comfort, Redefining spaces',
  address:          'Dubai-Abuja International Trade center,\nTOS Douglas Cres, Kaura, Abuja.',
  phone:            '+2348122837980',
  email:            '',
  logoBase64:       '',
  numberPrefix:     'WV-2026-',
  nextNumber:       1,
  vatEnabled:       false,
  vatRate:          7.5,
  footerNote:       'Thank you for choosing Woovio Interiors!',
  signatureName:    'Yakubu Balami Haruna',
  signatureBase64:  '',
  accountDetails:   'Woovio Interiors (Yakubu Balami Haruna)\nMoniepoint — 7041298889',
};

let _settings = null;

async function loadSettings() {
  const db = await getDB();
  const saved = await db.get('settings', SETTINGS_KEY);
  _settings = Object.assign({}, DEFAULTS, saved || {});
  return _settings;
}

async function saveSettings(patch) {
  const db = await getDB();
  _settings = Object.assign({}, _settings, patch);
  await db.put('settings', _settings);
  return _settings;
}

function getSettings() { return _settings; }

window.loadSettings  = loadSettings;
window.saveSettings  = saveSettings;
window.getSettings   = getSettings;

// ── Settings UI ────────────────────────────────────────────────────────────

function renderSettingsView() {
  const s = _settings || DEFAULTS;
  document.getElementById('view-settings').innerHTML = `
    <div class="page-header">
      <h1>Settings</h1>
      <div class="subtitle">Business info &amp; preferences</div>
    </div>

    <div class="settings-list">

      <!-- Logo -->
      <div class="field-group">
        <div class="field-group-label">Logo</div>
        <div class="field-row" style="align-items:center;">
          <div id="logo-preview" style="margin-bottom:10px;">${s.logoBase64
            ? `<img src="${s.logoBase64}" style="max-height:80px;max-width:160px;border-radius:8px;" />`
            : `<div style="width:80px;height:80px;background:var(--border);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:900;color:var(--muted);">W</div>`
          }</div>
          <label class="btn btn-outline" style="width:100%;cursor:pointer;font-size:14px;height:42px;">
            ${s.logoBase64 ? 'Change Logo' : 'Upload Logo'}
            <input type="file" accept="image/*" id="logo-input" style="display:none;" onchange="handleLogoUpload(this)" />
          </label>
          ${s.logoBase64 ? `<button class="btn btn-outline mt-8" style="width:100%;font-size:14px;height:42px;color:var(--danger);border-color:var(--danger);" onclick="removeLogo()">Remove Logo</button>` : ''}
        </div>
      </div>

      <!-- Business info -->
      <div class="field-group">
        <div class="field-group-label">Business Info</div>
        <div class="field-row">
          <label>Business Name</label>
          <input id="s-businessName" type="text" value="${esc(s.businessName)}" placeholder="Woovio Interiors" />
        </div>
        <div class="field-row">
          <label>Tagline</label>
          <input id="s-tagline" type="text" value="${esc(s.tagline)}" placeholder="Crafting comfort…" />
        </div>
        <div class="field-row">
          <label>Address</label>
          <textarea id="s-address" rows="3">${esc(s.address)}</textarea>
        </div>
        <div class="field-row">
          <label>Phone</label>
          <input id="s-phone" type="tel" value="${esc(s.phone)}" placeholder="+234…" />
        </div>
        <div class="field-row">
          <label>Email (optional)</label>
          <input id="s-email" type="email" value="${esc(s.email)}" placeholder="info@woovio.com" />
        </div>
      </div>

      <!-- Numbering -->
      <div class="field-group">
        <div class="field-group-label">Document Numbering</div>
        <div class="field-row">
          <label>Number Prefix</label>
          <input id="s-prefix" type="text" value="${esc(s.numberPrefix)}" placeholder="WV-2026-" />
        </div>
        <div class="field-row">
          <label>Next Number</label>
          <input id="s-nextNumber" type="number" min="1" value="${s.nextNumber}" />
        </div>
      </div>

      <!-- VAT -->
      <div class="field-group">
        <div class="field-group-label">Tax</div>
        <div class="field-row toggle-row">
          <span class="toggle-label">Enable VAT</span>
          <button class="toggle ${s.vatEnabled ? 'on' : ''}" id="vat-toggle" onclick="toggleVAT()" aria-pressed="${s.vatEnabled}"></button>
        </div>
        <div class="field-row" id="vat-rate-row" style="${s.vatEnabled ? '' : 'display:none;'}">
          <label>VAT Rate (%)</label>
          <input id="s-vatRate" type="number" min="0" max="100" step="0.1" value="${s.vatRate}" />
        </div>
      </div>

      <!-- Signature -->
      <div class="field-group">
        <div class="field-group-label">Authorized Signature</div>
        <div class="field-row">
          <label>Signatory Name</label>
          <input id="s-signatureName" type="text" value="${esc(s.signatureName)}" placeholder="Yakubu Balami Haruna" />
        </div>
        <div class="field-row" style="flex-direction:column;gap:10px;">
          <label>Signature Image</label>
          <div id="sig-preview-wrap">
            ${s.signatureBase64
              ? `<img src="${s.signatureBase64}" style="max-height:70px;max-width:100%;border:1px solid var(--border);border-radius:8px;background:#fff;padding:4px;" />`
              : `<div style="width:100%;height:70px;border:1.5px dashed var(--border);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:13px;color:var(--muted);">No signature yet</div>`}
          </div>
          <div style="display:flex;gap:8px;">
            <button class="btn btn-outline" style="flex:1;height:40px;font-size:13px;" onclick="openSignaturePad()">Draw Signature</button>
            <label class="btn btn-outline" style="flex:1;height:40px;font-size:13px;cursor:pointer;">
              Upload Image
              <input type="file" accept="image/*" style="display:none;" onchange="handleSigUpload(this)" />
            </label>
          </div>
          ${s.signatureBase64 ? `<button class="btn btn-outline" style="width:100%;height:36px;font-size:13px;color:var(--danger);border-color:var(--danger);" onclick="clearSignature()">Remove Signature</button>` : ''}
        </div>
      </div>

      <!-- Footer -->
      <div class="field-group">
        <div class="field-group-label">Receipt Footer Note</div>
        <div class="field-row">
          <textarea id="s-footerNote" rows="2">${esc(s.footerNote)}</textarea>
        </div>
      </div>

      <!-- Account details (for invoices) -->
      <div class="field-group">
        <div class="field-group-label">Payment Account Details</div>
        <p style="font-size:13px;color:var(--muted);padding:0 16px 8px;line-height:1.5;">Printed on invoices before the Terms &amp; Conditions.</p>
        <div class="field-row">
          <textarea id="s-accountDetails" rows="3">${esc(s.accountDetails)}</textarea>
        </div>
      </div>

      <button class="btn btn-primary" onclick="submitSettings()">Save Settings</button>

      <!-- Offline mode -->
      <div class="field-group" style="margin-top:4px;">
        <div class="field-group-label">Connectivity</div>
        <div style="padding:14px 16px;display:flex;flex-direction:column;gap:10px;">
          <div class="field-row toggle-row" style="margin:0;">
            <div>
              <div class="toggle-label" style="font-weight:600;">Offline Mode</div>
              <div style="font-size:12px;color:var(--muted);margin-top:2px;">On: app never touches the network. Turn off only when updating the app.</div>
            </div>
            <button class="toggle ${getOfflineMode() ? 'on' : ''}" id="offline-toggle" onclick="toggleOfflineMode()" aria-pressed="${getOfflineMode()}"></button>
          </div>
          <button class="btn btn-outline" style="width:100%;margin-top:4px;" onclick="location.reload()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            Restart App
          </button>
        </div>
      </div>

      <!-- Backup & Restore -->
      <div class="field-group" style="margin-top:4px;">
        <div class="field-group-label">Data Backup</div>
        <div style="padding:14px 16px;display:flex;flex-direction:column;gap:10px;">
          <p style="font-size:13px;color:var(--muted);line-height:1.5;">Export all your receipts, invoices and settings as a JSON file. Use this to back up your data or transfer it to a new device.</p>
          <button class="btn btn-outline" style="width:100%;" onclick="backupData()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export Backup
          </button>
          <button class="btn btn-outline" style="width:100%;color:var(--danger);border-color:var(--danger);" onclick="openRestorePicker()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Restore from Backup
          </button>
        </div>
      </div>

      <div style="height:8px;"></div>
    </div>
  `;
}

function esc(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
}

function toggleVAT() {
  const btn = document.getElementById('vat-toggle');
  const isOn = btn.classList.toggle('on');
  btn.setAttribute('aria-pressed', isOn);
  document.getElementById('vat-rate-row').style.display = isOn ? '' : 'none';
}

async function handleLogoUpload(input) {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async e => {
    const base64 = await resizeImage(e.target.result, 400, 200);
    await saveSettings({ logoBase64: base64 });
    renderSettingsView();
    toast('Logo saved', 'success');
  };
  reader.readAsDataURL(file);
}

async function removeLogo() {
  await saveSettings({ logoBase64: '' });
  renderSettingsView();
  toast('Logo removed', 'success');
}

function resizeImage(dataUrl, maxW, maxH) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxW / img.width, maxH / img.height);
      const w = Math.round(img.width  * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width  = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = dataUrl;
  });
}

async function submitSettings() {
  const patch = {
    businessName:  document.getElementById('s-businessName').value.trim(),
    tagline:       document.getElementById('s-tagline').value.trim(),
    address:       document.getElementById('s-address').value.trim(),
    phone:         document.getElementById('s-phone').value.trim(),
    email:         document.getElementById('s-email').value.trim(),
    numberPrefix:  document.getElementById('s-prefix').value.trim(),
    nextNumber:    Math.max(1, parseInt(document.getElementById('s-nextNumber').value) || 1),
    vatEnabled:    document.getElementById('vat-toggle').classList.contains('on'),
    vatRate:       parseFloat(document.getElementById('s-vatRate')?.value) || 7.5,
    footerNote:      document.getElementById('s-footerNote').value.trim(),
    signatureName:   document.getElementById('s-signatureName').value.trim(),
    accountDetails:  document.getElementById('s-accountDetails').value.trim(),
  };

  await saveSettings(patch);
  refreshBrand();
  toast('Settings saved ✓', 'success');
}

// ── Signature helpers ──────────────────────────────────────────────────────

async function handleSigUpload(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async e => {
    const b64 = await resizeImage(e.target.result, 600, 200);
    await saveSettings({ signatureBase64: b64 });
    renderSettingsView();
    toast('Signature saved', 'success');
  };
  reader.readAsDataURL(file);
}

async function clearSignature() {
  await saveSettings({ signatureBase64: '' });
  renderSettingsView();
  toast('Signature removed', 'success');
}

function openSignaturePad() {
  const existing = document.getElementById('sig-pad-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'sig-pad-overlay';
  overlay.innerHTML = `
    <div id="sig-pad-box">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <span style="font-size:15px;font-weight:600;">Draw Your Signature</span>
        <button onclick="closeSigPad()" style="background:none;border:none;font-size:22px;cursor:pointer;color:var(--muted);">×</button>
      </div>
      <canvas id="sig-canvas" width="500" height="180"
        style="width:100%;height:180px;border:1.5px solid var(--border);border-radius:8px;background:#fff;touch-action:none;cursor:crosshair;"></canvas>
      <p style="font-size:11px;color:var(--muted);margin:6px 0 12px;">Sign above using your finger</p>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-outline" style="flex:1;height:42px;font-size:13px;" onclick="clearSigCanvas()">Clear</button>
        <button class="btn btn-primary" style="flex:1;height:42px;" onclick="saveSigCanvas()">Save Signature</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  initSigCanvas();
}

function closeSigPad() {
  const el = document.getElementById('sig-pad-overlay');
  if (el) el.remove();
}

function initSigCanvas() {
  const canvas = document.getElementById('sig-canvas');
  const ctx    = canvas.getContext('2d');
  ctx.strokeStyle = '#1C1C1C';
  ctx.lineWidth   = 2.5;
  ctx.lineCap     = 'round';
  ctx.lineJoin    = 'round';
  let drawing = false;
  let lastX = 0, lastY = 0;

  function pos(e) {
    const r = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / r.width;
    const scaleY = canvas.height / r.height;
    const src = e.touches ? e.touches[0] : e;
    return [(src.clientX - r.left) * scaleX, (src.clientY - r.top) * scaleY];
  }

  function start(e) { e.preventDefault(); drawing = true; [lastX, lastY] = pos(e); }
  function move(e)  {
    e.preventDefault();
    if (!drawing) return;
    const [x, y] = pos(e);
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();
    [lastX, lastY] = [x, y];
  }
  function stop() { drawing = false; }

  canvas.addEventListener('mousedown',  start);
  canvas.addEventListener('mousemove',  move);
  canvas.addEventListener('mouseup',    stop);
  canvas.addEventListener('touchstart', start, { passive: false });
  canvas.addEventListener('touchmove',  move,  { passive: false });
  canvas.addEventListener('touchend',   stop);
}

function clearSigCanvas() {
  const canvas = document.getElementById('sig-canvas');
  canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
}

async function saveSigCanvas() {
  const canvas = document.getElementById('sig-canvas');
  // Check if anything was drawn
  const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
  const hasContent = data.some((v, i) => i % 4 === 3 && v > 0);
  if (!hasContent) { toast('Please draw your signature first', 'error'); return; }
  const b64 = canvas.toDataURL('image/png');
  await saveSettings({ signatureBase64: b64 });
  closeSigPad();
  renderSettingsView();
  toast('Signature saved', 'success');
}

function toggleOfflineMode() {
  const btn = document.getElementById('offline-toggle');
  const isOn = btn.classList.toggle('on');
  btn.setAttribute('aria-pressed', isOn);
  setOfflineMode(isOn);
  toast(isOn ? 'Offline mode on — network blocked' : 'Update mode on — network allowed', 'success');
}

window.toggleOfflineMode  = toggleOfflineMode;
window.renderSettingsView = renderSettingsView;
window.toggleVAT          = toggleVAT;
window.handleLogoUpload   = handleLogoUpload;
window.removeLogo         = removeLogo;
window.submitSettings     = submitSettings;
window.handleSigUpload    = handleSigUpload;
window.clearSignature     = clearSignature;
window.openSignaturePad   = openSignaturePad;
window.closeSigPad        = closeSigPad;
window.clearSigCanvas     = clearSigCanvas;
window.saveSigCanvas      = saveSigCanvas;

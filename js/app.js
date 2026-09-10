// ── Router ─────────────────────────────────────────────────────────────────

const VIEWS = ['new', 'history', 'settings', 'builder'];

function showView(id) {
  VIEWS.forEach(v => {
    document.getElementById('view-' + v).classList.toggle('active', v === id);
    const btn = document.getElementById('nav-' + v);
    if (btn) btn.classList.toggle('active', v === id);
  });

  try { if (id === 'settings') renderSettingsView(); } catch(e) { console.error('renderSettings:', e); }
  try { if (id === 'history')  renderHistory();       } catch(e) { console.error('renderHistory:', e); }
}

function navigate(id) { showView(id); }
window.navigate = navigate;

// ── Toast ──────────────────────────────────────────────────────────────────

let toastTimer;
function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = 'show ' + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = ''; }, 3000);
}
window.toast = toast;

// ── Brand block (home screen) ──────────────────────────────────────────────

function refreshBrand() {
  try {
    const s = getSettings();
    if (!s) return;
    const nameEl    = document.getElementById('brand-name');
    const tagEl     = document.getElementById('brand-tagline');
    const logoEl    = document.getElementById('brand-logo');
    if (nameEl)  nameEl.textContent  = s.businessName || 'Woovio Interiors';
    if (tagEl)   tagEl.textContent   = s.tagline      || '';
    if (logoEl) {
      if (s.logoBase64) {
        logoEl.innerHTML = `<img src="${s.logoBase64}" alt="${s.businessName}" />`;
        logoEl.style.background = '#fff';
        logoEl.style.padding = '8px';
      } else {
        logoEl.innerHTML = (s.businessName || 'W')[0].toUpperCase();
        logoEl.style.background = '';
        logoEl.style.padding = '';
      }
    }
  } catch(e) { console.error('refreshBrand:', e); }
}

// ── Version ────────────────────────────────────────────────────────────────

// Read from the active cache name rather than a constant, so the number shown
// is the build actually running — a hardcoded one could drift from the cache
// it claims to describe and say an update landed when it had not.
async function appVersion() {
  try {
    if (!('caches' in window)) return null;
    const keys = await caches.keys();
    const key  = keys.find(k => k.startsWith('woovio-'));
    return key ? key.slice('woovio-'.length) : null;
  } catch (e) {
    return null;
  }
}

async function showVersion(elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  const v = await appVersion();
  const base = el.dataset.base || el.textContent;
  el.dataset.base = base;
  el.textContent = v ? `${base} · ${v}` : `${base} · not installed`;
}

window.appVersion  = appVersion;
window.showVersion = showVersion;

// ── Global error recovery ───────────────────────────────────────────────────

window.addEventListener('error', e => {
  console.error('Global error:', e.message, e.filename, e.lineno);
});

window.addEventListener('unhandledrejection', e => {
  console.error('Unhandled promise rejection:', e.reason);
});

// ── Offline mode ───────────────────────────────────────────────────────────

function getOfflineMode() {
  return localStorage.getItem('offlineMode') === 'true'; // default false
}

function setOfflineMode(val) {
  localStorage.setItem('offlineMode', val ? 'true' : 'false');
  sendOfflineModeToSW(val);
}

function sendOfflineModeToSW(val) {
  if (navigator.serviceWorker && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'SET_OFFLINE_MODE', value: val });
  }
}

window.getOfflineMode = getOfflineMode;
window.setOfflineMode = setOfflineMode;

// ── Service worker ─────────────────────────────────────────────────────────

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(() => {
        // After registration, wait for controller to be ready then send preference
        navigator.serviceWorker.ready.then(() => {
          sendOfflineModeToSW(getOfflineMode());
        });
      })
      .catch(err => console.warn('SW:', err));
  });
}

// ── Init ───────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await loadSettings();
  } catch(e) {
    console.error('loadSettings failed:', e);
  }
  refreshBrand();
  showView('new');
});

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

function navigate(id) {
  // An update that arrived mid-edit applies as soon as the builder is left
  if (_reloadWhenFree && id !== 'builder') { location.reload(); return; }
  showView(id);
}
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
    // The PDF library cache shares the prefix but is not a version
    const key  = keys.find(k => k.startsWith('woovio-') && !k.startsWith('woovio-libs-'));
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

// ── Updates ────────────────────────────────────────────────────────────────
//
// The browser looks for a new version by itself each time the app opens. When
// one installs it takes over at once and the page reloads onto it, so opening
// the app is enough to be current. A reload never lands mid-document: while the
// builder is open it waits until the builder is left.

let _reloadWhenFree = false;

function applyUpdateWhenFree() {
  const editing = document.getElementById('view-builder')?.classList.contains('active');
  if (editing) {
    _reloadWhenFree = true;
    toast('Update ready — it applies when you leave this document', 'success');
    return;
  }
  location.reload();
}

async function checkForUpdates() {
  if (!('serviceWorker' in navigator)) { toast('Updates are not supported here', 'error'); return; }
  if (!navigator.onLine) { toast('No connection — try again once you are online', 'error'); return; }
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) { toast('Not installed yet — reopen the app while online', 'error'); return; }

  // update() can resolve before the new worker is reported, so listen first
  const found = new Promise(resolve => {
    if (reg.installing || reg.waiting) return resolve(true);
    const timer = setTimeout(() => resolve(false), 2500);
    reg.addEventListener('updatefound', () => { clearTimeout(timer); resolve(true); }, { once: true });
  });

  toast('Checking for updates…', 'success');
  try {
    await reg.update();
  } catch (e) {
    toast('Could not reach the update server', 'error');
    return;
  }
  if (await found) {
    toast('Update found — installing…', 'success');   // the controller change reloads onto it
    return;
  }
  const v = await appVersion();
  toast(`You're on the latest version${v ? ' (' + v + ')' : ''}`, 'success');
}

window.checkForUpdates = checkForUpdates;

// ── Service worker ─────────────────────────────────────────────────────────

if ('serviceWorker' in navigator) {
  // The first controller a page ever gets, on a fresh install, replaces nothing,
  // so reloading onto it would only make the screen flash. Every change after
  // that is a newer version taking over — including one that arrives in the same
  // visit as the first install, which a check made only at load would miss.
  let hadController = !!navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) { hadController = true; return; }
    if (reloading) return;
    reloading = true;
    applyUpdateWhenFree();
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => console.warn('SW:', err));
  });
}

// ── Init ───────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  // Left behind by the offline switch that no longer exists
  localStorage.removeItem('offlineMode');

  try {
    await loadSettings();
  } catch(e) {
    console.error('loadSettings failed:', e);
  }
  refreshBrand();
  showView('new');
});

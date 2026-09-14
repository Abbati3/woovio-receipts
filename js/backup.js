// ── Backup & Restore ────────────────────────────────────────────────────────

// Prefixed: the shoes app shares this origin's storage and keeps its own date
const LAST_BACKUP_KEY = 'receiptsLastBackupAt';

function markBackedUp() {
  localStorage.setItem('docsSinceBackup', '0');
  localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString());
  if (typeof showLastBackup === 'function') showLastBackup();
  if (document.getElementById('view-new')?.classList.contains('active')) renderHome().catch(() => {});
}

// Whole days since the last backup on this device, or null if there has been none
function backupAgeDays() {
  const last = localStorage.getItem(LAST_BACKUP_KEY);
  if (!last) return null;
  const t = new Date(last);
  if (isNaN(t)) return null;
  const p = n => String(n).padStart(2, '0');
  return daysSinceISO(`${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}`);
}

async function backupData() {
  try {
    const db       = await getDB();
    const receipts = await db.getAll('receipts');
    const settings = await db.get('settings', 'main');

    const payload = {
      app:        'woovio-receipts',
      version:    1,
      exportedAt: new Date().toISOString(),
      settings:   settings || {},
      receipts:   receipts || [],
    };

    const json     = JSON.stringify(payload, null, 2);
    const blob     = new Blob([json], { type: 'application/json' });
    const date     = todayISO();
    const filename = `woovio-backup-${date}.json`;

    // iOS standalone PWA: blob URL + a.click() is blocked; use Web Share API
    if (navigator.canShare && navigator.canShare({ files: [new File([blob], filename, { type: 'application/json' })] })) {
      const file = new File([blob], filename, { type: 'application/json' });
      // Files only: iOS saves a title or text passed alongside as a separate .txt file
      await navigator.share({ files: [file] });
      markBackedUp();
      toast(`Backup shared — ${receipts.length} document(s)`, 'success');
    } else {
      // Desktop fallback
      const url = URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href     = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      markBackedUp();
      toast(`Backup saved — ${receipts.length} document(s)`, 'success');
    }
  } catch (e) {
    if (e.name !== 'AbortError') {
      toast('Backup failed: ' + e.message, 'error');
    }
  }
}

function openRestorePicker() {
  const input    = document.createElement('input');
  input.type     = 'file';
  input.accept   = '.json,application/json';
  input.onchange = e => handleRestoreFile(e.target.files[0]);
  input.click();
}

async function handleRestoreFile(file) {
  if (!file) return;
  try {
    const text    = await file.text();
    const payload = JSON.parse(text);

    if (payload.app !== 'woovio-receipts') {
      toast('This file is not a Woovio backup', 'error'); return;
    }

    const receiptsCount = (payload.receipts || []).length;
    if (!confirm(`Restore ${receiptsCount} document(s) and settings from ${payload.exportedAt?.slice(0,10) || 'this backup'}?\n\nThis will REPLACE all current data.`)) return;

    const db = await getDB();

    if (payload.settings && payload.settings.id) {
      await db.put('settings', payload.settings);
    }

    const existing = await db.getAll('receipts');
    for (const r of existing) await db.delete('receipts', r.id);
    // Keep original ids — invoice→receipt settlement links reference them
    for (const r of payload.receipts) {
      await db.put('receipts', Object.assign({}, r));
    }

    await loadSettings();
    refreshBrand();
    toast(`Restored ${receiptsCount} document(s) ✓`, 'success');
    navigate('history');
    await renderHistory();
  } catch (e) {
    toast('Restore failed: ' + e.message, 'error');
  }
}

window.backupData        = backupData;
window.backupAgeDays     = backupAgeDays;
window.openRestorePicker = openRestorePicker;
window.handleRestoreFile = handleRestoreFile;

// ── Backup & Restore ────────────────────────────────────────────────────────

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
    const date     = new Date().toISOString().slice(0, 10);
    const filename = `woovio-backup-${date}.json`;

    // iOS standalone PWA: blob URL + a.click() is blocked; use Web Share API
    if (navigator.canShare && navigator.canShare({ files: [new File([blob], filename, { type: 'application/json' })] })) {
      const file = new File([blob], filename, { type: 'application/json' });
      await navigator.share({ files: [file], title: 'Woovio Backup' });
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
    for (const r of payload.receipts) {
      const rec = Object.assign({}, r);
      delete rec.id;
      await db.put('receipts', rec);
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
window.openRestorePicker = openRestorePicker;
window.handleRestoreFile = handleRestoreFile;

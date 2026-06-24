// IndexedDB — single shared promise so every module gets the same instance
let _db;

async function getDB() {
  if (_db) return _db;
  _db = await idb.openDB('woovio', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('receipts')) {
        const store = db.createObjectStore('receipts', { keyPath: 'id', autoIncrement: true });
        store.createIndex('date', 'date');
      }
    }
  });
  return _db;
}

window.getDB = getDB;

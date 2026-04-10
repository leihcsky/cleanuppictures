const UPLOAD_DB_NAME = 'cleanup_upload_bridge';
const UPLOAD_STORE_NAME = 'pending_uploads';

export const openUploadDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(UPLOAD_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(UPLOAD_STORE_NAME)) {
        db.createObjectStore(UPLOAD_STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

export const saveUploadBlob = async (key: string, blob: Blob) => {
  const db = await openUploadDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(UPLOAD_STORE_NAME, 'readwrite');
    tx.objectStore(UPLOAD_STORE_NAME).put(blob, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  db.close();
};

/** Written before leaving a tool landing page; home editor reads this to ignore stray pointer-ups on "Exit". */
export function markToolLandingRedirect(): void {
  try {
    sessionStorage.setItem("cleanup_redirect_ts", String(Date.now()));
  } catch {
    /* ignore */
  }
}

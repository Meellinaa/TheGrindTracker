/**
 * Resume files live in IndexedDB (large capacity) instead of localStorage,
 * which is limited to ~5MB and throws QuotaExceededError when full.
 */

const DB_NAME = "job-hunt-hq";
const STORE = "resumes";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

export function saveResumeData(key: string, dataUrl: string): Promise<unknown> {
  return tx("readwrite", (s) => s.put(dataUrl, key));
}

export function loadResumeData(key: string): Promise<string | undefined> {
  return tx("readonly", (s) => s.get(key) as IDBRequest<string | undefined>);
}

export function deleteResumeData(key: string): Promise<unknown> {
  return tx("readwrite", (s) => s.delete(key));
}

/** The device wallet key: one non-extractable AES-GCM CryptoKey, created on first use and kept in IndexedDB
 *  (background worker only). The store is passed in so the logic is testable without a browser. */
import { newWrapKey } from "./crypto";

export interface KeyStore { get(): Promise<CryptoKey | undefined>; put(k: CryptoKey): Promise<void>; clear(): Promise<void> }

/** The stored key, or a fresh one when none exists yet and `create` is set. Never returns an extractable key. */
export async function deviceKey(store: KeyStore, create: boolean): Promise<CryptoKey | null> {
  const k = await store.get();
  if (k) { if (k.extractable) throw new Error("The stored wallet key is extractable, refusing to use it"); return k; }
  if (!create) return null;
  const fresh = await newWrapKey();
  await store.put(fresh);
  return fresh;
}

export function memoryKeyStore(): KeyStore {
  let k: CryptoKey | undefined;
  return { get: async () => k, put: async (x) => { k = x; }, clear: async () => { k = undefined; } };
}

const DB = "hb-wallet", OS = "keys", ID = "device";
function db(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(OS);
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return db().then((d) => new Promise<T>((res, rej) => {
    const t = d.transaction(OS, mode), q = run(t.objectStore(OS));
    t.oncomplete = () => { d.close(); res(q.result); }; t.onerror = t.onabort = () => { d.close(); rej(t.error); };
  }));
}
export function idbKeyStore(): KeyStore {
  return {
    get: () => tx("readonly", (s) => s.get(ID) as IDBRequest<CryptoKey | undefined>),
    put: (k) => tx("readwrite", (s) => s.put(k, ID)).then(() => {}),
    clear: () => tx("readwrite", (s) => s.delete(ID)).then(() => {}),
  };
}

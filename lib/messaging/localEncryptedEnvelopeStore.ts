/**
 * Browser-local persistence for opaque encrypted messaging envelopes.
 *
 * IMPORTANT: This module does not encrypt data. Callers must pass ciphertext
 * produced by the reviewed application E2EE layer. Never pass plaintext message
 * bodies, file bytes, or decryption keys to this store.
 */

export interface EncryptedEnvelopeRecord {
  id: string;
  conversationId: string;
  senderDeviceId: string;
  recipientDeviceId: string;
  /** Opaque ciphertext bytes only. */
  ciphertext: ArrayBuffer;
  createdAt: number;
  direction: 'incoming' | 'outgoing';
}

const DATABASE_NAME = 'trustedin-private-messaging';
const DATABASE_VERSION = 1;
const ENVELOPE_STORE = 'encrypted-envelopes';

function requireIndexedDB(): IDBFactory {
  if (typeof window === 'undefined' || !window.indexedDB) {
    throw new Error('IndexedDB is unavailable in this environment.');
  }
  return window.indexedDB;
}

function openDatabase(): Promise<IDBDatabase> {
  const indexedDB = requireIndexedDB();

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(ENVELOPE_STORE)) {
        const store = database.createObjectStore(ENVELOPE_STORE, { keyPath: 'id' });
        store.createIndex('conversationId', 'conversationId', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open local message store.'));
    request.onblocked = () => reject(new Error('Local message store upgrade is blocked by another tab.'));
  });
}

function runTransaction<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDatabase().then((database) => new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(ENVELOPE_STORE, mode);
    const request = operation(transaction.objectStore(ENVELOPE_STORE));
    let result: T;

    request.onsuccess = () => {
      result = request.result;
    };
    request.onerror = () => reject(request.error ?? new Error('Local message-store operation failed.'));
    transaction.oncomplete = () => {
      database.close();
      resolve(result);
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error('Local message-store transaction failed.'));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? new Error('Local message-store transaction was aborted.'));
    };
  }));
}

/** Persist ciphertext locally. The caller is responsible for encrypting first. */
export function saveEncryptedEnvelope(record: EncryptedEnvelopeRecord): Promise<string> {
  if (!record.id || !record.conversationId || !record.senderDeviceId || !record.recipientDeviceId) {
    return Promise.reject(new Error('Envelope identifiers are required.'));
  }
  if (!(record.ciphertext instanceof ArrayBuffer) || record.ciphertext.byteLength === 0) {
    return Promise.reject(new Error('Envelope ciphertext must be a non-empty ArrayBuffer.'));
  }
  if (!Number.isFinite(record.createdAt) || record.createdAt <= 0) {
    return Promise.reject(new Error('Envelope createdAt must be a positive timestamp.'));
  }

  // Clone the bytes so later caller mutations cannot alter the queued record.
  const safeRecord: EncryptedEnvelopeRecord = {
    ...record,
    ciphertext: record.ciphertext.slice(0),
  };

  return runTransaction('readwrite', (store) => store.put(safeRecord)).then(() => record.id);
}

/** Read one locally persisted encrypted envelope. */
export function getEncryptedEnvelope(id: string): Promise<EncryptedEnvelopeRecord | undefined> {
  return runTransaction('readonly', (store) => store.get(id));
}

/** List locally persisted encrypted envelopes for one conversation, oldest first. */
export async function listEncryptedEnvelopes(
  conversationId: string,
): Promise<EncryptedEnvelopeRecord[]> {
  if (!conversationId) throw new Error('conversationId is required.');

  const records = await runTransaction('readonly', (store) =>
    store.index('conversationId').getAll(conversationId),
  );

  return records.sort((left, right) => left.createdAt - right.createdAt);
}

/** Remove a local ciphertext copy by identifier. This does not revoke recipient copies. */
export function deleteEncryptedEnvelope(id: string): Promise<void> {
  return runTransaction('readwrite', (store) => store.delete(id)).then(() => undefined);
}

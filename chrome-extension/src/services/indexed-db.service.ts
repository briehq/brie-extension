type StoredRewindEventRow = {
  tabId: number;
  timestamp: number;
  sequence: number;
  kind: 'rrweb';
  payload: unknown;
};

const DATABASE_NAME = 'brie_rewind_v1';
const DATABASE_VERSION = 1;

const EVENTS_STORE_NAME = 'events';
const INDEX_BY_TAB_TIMESTAMP = 'by_tab_timestamp';

let databasePromise: Promise<IDBDatabase> | null = null;

const openDatabase = (): Promise<IDBDatabase> => {
  if (databasePromise) return databasePromise;

  databasePromise = new Promise((resolve, reject) => {
    const openRequest = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    openRequest.onupgradeneeded = () => {
      const database = openRequest.result;

      const objectStore = database.createObjectStore(EVENTS_STORE_NAME, {
        keyPath: ['tabId', 'timestamp', 'sequence'],
      });

      objectStore.createIndex(INDEX_BY_TAB_TIMESTAMP, ['tabId', 'timestamp']);
    };

    openRequest.onsuccess = () => resolve(openRequest.result);

    openRequest.onerror = () => reject(openRequest.error ?? new Error('Failed to open IndexedDB'));
  });

  return databasePromise;
};

const waitForTransaction = (transaction: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed'));
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
  });

export const putBatch = async (rows: StoredRewindEventRow[]): Promise<void> => {
  if (rows.length === 0) return;

  const database = await openDatabase();
  const transaction = database.transaction(EVENTS_STORE_NAME, 'readwrite');
  const objectStore = transaction.objectStore(EVENTS_STORE_NAME);

  for (const row of rows) {
    objectStore.put(row);
  }

  await waitForTransaction(transaction);
};

export const getRange = async (
  tabId: number,
  fromTimestamp: number,
  toTimestamp: number,
): Promise<StoredRewindEventRow[]> => {
  const database = await openDatabase();
  const transaction = database.transaction(EVENTS_STORE_NAME, 'readonly');
  const objectStore = transaction.objectStore(EVENTS_STORE_NAME);
  const tabTimestampIndex = objectStore.index(INDEX_BY_TAB_TIMESTAMP);

  const lowerBoundKey = [tabId, fromTimestamp];
  const upperBoundKey = [tabId, toTimestamp];
  const keyRange = IDBKeyRange.bound(lowerBoundKey, upperBoundKey);

  const rows = await new Promise<StoredRewindEventRow[]>((resolve, reject) => {
    const getAllRequest = tabTimestampIndex.getAll(keyRange);

    getAllRequest.onsuccess = () => resolve(getAllRequest.result as StoredRewindEventRow[]);

    getAllRequest.onerror = () => reject(getAllRequest.error ?? new Error('IndexedDB getAll failed'));
  });

  await waitForTransaction(transaction);
  return rows;
};

export const deleteBefore = async (tabId: number, cutoffTimestamp: number): Promise<void> => {
  const database = await openDatabase();
  const transaction = database.transaction(EVENTS_STORE_NAME, 'readwrite');
  const objectStore = transaction.objectStore(EVENTS_STORE_NAME);
  const tabTimestampIndex = objectStore.index(INDEX_BY_TAB_TIMESTAMP);

  // delete keys where tabId == tabId AND timestamp < cutoffTimestamp
  const lower = [tabId, Number.NEGATIVE_INFINITY];
  const upper = [tabId, cutoffTimestamp];
  const keyRange = IDBKeyRange.bound(lower, upper, false, true); // upperOpen=true excludes cutoff

  await new Promise<void>((resolve, reject) => {
    const cursorRequest = tabTimestampIndex.openCursor(keyRange);
    cursorRequest.onsuccess = () => {
      const cursor = cursorRequest.result;
      if (!cursor) return resolve();
      cursor.delete();
      cursor.continue();
    };
    cursorRequest.onerror = () => reject(cursorRequest.error ?? new Error('IndexedDB cursor failed'));
  });

  await waitForTransaction(transaction);
};

export const deleteTabAll = async (tabId: number): Promise<void> => {
  await deleteBefore(tabId, Number.POSITIVE_INFINITY);
};

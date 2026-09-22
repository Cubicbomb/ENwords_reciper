/**
 * IndexedDB Promise 封装 + schema 迁移
 * 零依赖，~120行
 */

const DB_NAME = 'cet4';
const DB_VERSION = 1;

let dbInstance = null;

/**
 * 打开数据库，自动迁移
 * @returns {Promise<IDBDatabase>}
 */
export async function openDB() {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // 词条表
      if (!db.objectStoreNames.contains('words')) {
        const wordStore = db.createObjectStore('words', { keyPath: 'id' });
        wordStore.createIndex('lemma', 'lemma', { unique: false });
        wordStore.createIndex('rank', 'rank', { unique: false });
      }

      // 词书表
      if (!db.objectStoreNames.contains('decks')) {
        db.createObjectStore('decks', { keyPath: 'id' });
      }

      // SRS 卡片表
      if (!db.objectStoreNames.contains('cards')) {
        const cardStore = db.createObjectStore('cards', { keyPath: 'id' });
        cardStore.createIndex('deckId', 'deckId', { unique: false });
        cardStore.createIndex('due', 'due', { unique: false });
        cardStore.createIndex('deckIdDue', ['deckId', 'due'], { unique: false });
        cardStore.createIndex('state', 'state', { unique: false });
      }

      // 复习流水表（只追加）
      if (!db.objectStoreNames.contains('logs')) {
        const logStore = db.createObjectStore('logs', { keyPath: 'id', autoIncrement: true });
        logStore.createIndex('ts', 'ts', { unique: false });
        logStore.createIndex('wordId', 'wordId', { unique: false });
        logStore.createIndex('cardId', 'cardId', { unique: false });
      }

      // 用户标记表
      if (!db.objectStoreNames.contains('flags')) {
        const flagStore = db.createObjectStore('flags', { keyPath: ['wordId', 'type'] });
        flagStore.createIndex('wordId', 'wordId', { unique: false });
      }

      // 元数据表（settings、schemaVersion、lastExportAt）
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

/**
 * 获取事务中的对象仓库
 * @param {IDBDatabase} db
 * @param {string} storeName
 * @param {IDBTransactionMode} mode
 * @returns {IDBObjectStore}
 */
export function getStore(db, storeName, mode = 'readonly') {
  return db.transaction(storeName, mode).objectStore(storeName);
}

/**
 * 通用 Promise 化请求
 * @param {IDBRequest} request
 * @returns {Promise<any>}
 */
function promisify(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * 添加记录
 * @param {IDBDatabase} db
 * @param {string} storeName
 * @param {any} data
 * @returns {Promise<any>}
 */
export async function add(db, storeName, data) {
  const store = getStore(db, storeName, 'readwrite');
  return promisify(store.add(data));
}

/**
 * 更新记录
 * @param {IDBDatabase} db
 * @param {string} storeName
 * @param {any} data
 * @returns {Promise<any>}
 */
export async function put(db, storeName, data) {
  const store = getStore(db, storeName, 'readwrite');
  return promisify(store.put(data));
}

/**
 * 获取记录
 * @param {IDBDatabase} db
 * @param {string} storeName
 * @param {any} key
 * @returns {Promise<any>}
 */
export async function get(db, storeName, key) {
  const store = getStore(db, storeName);
  return promisify(store.get(key));
}

/**
 * 删除记录
 * @param {IDBDatabase} db
 * @param {string} storeName
 * @param {any} key
 * @returns {Promise<void>}
 */
export async function remove(db, storeName, key) {
  const store = getStore(db, storeName, 'readwrite');
  return promisify(store.delete(key));
}

/**
 * 获取所有记录
 * @param {IDBDatabase} db
 * @param {string} storeName
 * @returns {Promise<any[]>}
 */
export async function getAll(db, storeName) {
  const store = getStore(db, storeName);
  return promisify(store.getAll());
}

/**
 * 按索引查询
 * @param {IDBDatabase} db
 * @param {string} storeName
 * @param {string} indexName
 * @param {any} query
 * @returns {Promise<any[]>}
 */
export async function getByIndex(db, storeName, indexName, query) {
  const store = getStore(db, storeName);
  const index = store.index(indexName);
  return promisify(index.getAll(query));
}

/**
 * 清空指定仓库
 * @param {IDBDatabase} db
 * @param {string} storeName
 * @returns {Promise<void>}
 */
export async function clear(db, storeName) {
  const store = getStore(db, storeName, 'readwrite');
  return promisify(store.clear());
}

/**
 * 批量添加
 * @param {IDBDatabase} db
 * @param {string} storeName
 * @param {any[]} items
 * @returns {Promise<void>}
 */
export async function bulkAdd(db, storeName, items) {
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);
  for (const item of items) {
    store.put(item);
  }
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
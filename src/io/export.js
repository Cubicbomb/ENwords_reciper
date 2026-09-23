/**
 * 导入导出功能
 */

import { openDB, getAll, bulkAdd, put, clear } from '../store/db.js';

/**
 * 导出所有数据为 JSON
 * @returns {Promise<Object>} 导出的数据
 */
export async function exportAll() {
  const db = await openDB();
  
  const words = await getAll(db, 'words');
  const decks = await getAll(db, 'decks');
  const cards = await getAll(db, 'cards');
  const logs = await getAll(db, 'logs');
  const flags = await getAll(db, 'flags');
  const meta = await getAll(db, 'meta');
  
  return {
    version: 1,
    timestamp: Date.now(),
    data: {
      words,
      decks,
      cards,
      logs,
      flags,
      meta
    }
  };
}

/**
 * 下载 JSON 文件
 * @param {Object} data - 要下载的数据
 * @param {string} filename - 文件名
 */
export function downloadJSON(data, filename) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 导入数据
 * @param {File} file - JSON 文件
 * @param {string} strategy - 'merge' 或 'replace'
 * @returns {Promise<Object>} 导入结果
 */
export async function importData(file, strategy = 'merge') {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target.result);
        
        if (!data.version || !data.data) {
          throw new Error('无效的备份文件格式');
        }
        
        const db = await openDB();
        
        if (strategy === 'replace') {
          // 清空现有数据
          await clear(db, 'words');
          await clear(db, 'decks');
          await clear(db, 'cards');
          await clear(db, 'logs');
          await clear(db, 'flags');
          await clear(db, 'meta');
        }
        
        // 导入数据
        const { words, decks, cards, logs, flags, meta } = data.data;
        
        if (words && words.length > 0) {
          await bulkAdd(db, 'words', words);
        }
        
        if (decks && decks.length > 0) {
          for (const deck of decks) {
            await put(db, 'decks', deck);
          }
        }
        
        if (cards && cards.length > 0) {
          await bulkAdd(db, 'cards', cards);
        }
        
        if (logs && logs.length > 0) {
          await bulkAdd(db, 'logs', logs);
        }
        
        if (flags && flags.length > 0) {
          for (const flag of flags) {
            await put(db, 'flags', flag);
          }
        }
        
        if (meta && meta.length > 0) {
          for (const item of meta) {
            await put(db, 'meta', item);
          }
        }
        
        resolve({
          success: true,
          stats: {
            words: words?.length || 0,
            decks: decks?.length || 0,
            cards: cards?.length || 0,
            logs: logs?.length || 0,
            flags: flags?.length || 0
          }
        });
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('读取文件失败'));
    };
    
    reader.readAsText(file);
  });
}

/**
 * 检查是否需要备份提示
 * @returns {Promise<boolean>} 是否需要备份
 */
export async function checkBackupReminder() {
  const db = await openDB();
  const meta = await getAll(db, 'meta');
  const lastExport = meta.find(m => m.key === 'lastExportAt');
  
  if (!lastExport) return true;
  
  const daysSinceLastExport = (Date.now() - lastExport.value) / (1000 * 60 * 60 * 24);
  return daysSinceLastExport > 7;
}

/**
 * 更新最后导出时间
 */
export async function updateLastExportTime() {
  const db = await openDB();
  await put(db, 'meta', { key: 'lastExportAt', value: Date.now() });
}
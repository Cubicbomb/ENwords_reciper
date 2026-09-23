/**
 * 词根词缀提示模块
 */

import { openDB, getAll } from '../store/db.js';

let rootsData = null;

/**
 * 加载词根词缀数据
 */
async function loadRoots() {
  if (rootsData) return rootsData;
  
  try {
    const db = await openDB();
    const meta = await getAll(db, 'meta');
    const rootsMeta = meta.find(m => m.key === 'roots');
    
    if (rootsMeta) {
      rootsData = rootsMeta.value;
    } else {
      // 从内置数据加载
      const response = await fetch('./data/roots.json');
      rootsData = await response.json();
      
      // 缓存到 IndexedDB
      const { put } = await import('../store/db.js');
      await put(db, 'meta', { key: 'roots', value: rootsData });
    }
    
    return rootsData;
  } catch (error) {
    console.error('加载词根词缀数据失败:', error);
    return [];
  }
}

/**
 * 查找单词的词根词缀
 * @param {string} word - 单词
 * @returns {Object[]} 匹配的词根词缀
 */
export async function findRoots(word) {
  const roots = await loadRoots();
  const lowerWord = word.toLowerCase();
  
  const matches = [];
  
  for (const root of roots) {
    // 检查单词是否包含词根
    if (lowerWord.includes(root.root.toLowerCase())) {
      matches.push(root);
    }
    
    // 检查例子中的单词
    if (root.examples.some(ex => ex.toLowerCase() === lowerWord)) {
      // 如果是例子中的单词，添加但不重复
      if (!matches.find(m => m.root === root.root)) {
        matches.push(root);
      }
    }
  }
  
  return matches;
}

/**
 * 生成词根词缀提示文本
 * @param {string} word - 单词
 * @returns {string} 提示文本
 */
export async function getRootHint(word) {
  const roots = await findRoots(word);
  
  if (roots.length === 0) {
    return '';
  }
  
  const hints = roots.map(root => 
    `词根 ${root.root}（${root.meaning}）`
  );
  
  return `💡 词根提示：${hints.join('，')}`;
}

/**
 * 生成词根词缀提示 HTML
 * @param {string} word - 单词
 * @returns {Node} 提示节点
 */
export async function getRootHintHTML(word) {
  const roots = await findRoots(word);
  
  if (roots.length === 0) {
    return null;
  }
  
  const hints = roots.map(root => 
    h('span', { 
      style: { 
        display: 'inline-block',
        padding: '2px 6px',
        background: '#f0fdf4',
        border: '1px solid #bbf7d0',
        borderRadius: '4px',
        fontSize: '12px',
        marginRight: '4px',
        marginBottom: '4px'
      }
    }, `${root.root}（${root.meaning}）`)
  );
  
  return h('div', { style: { marginTop: '8px' } },
    h('div', { style: { fontSize: '12px', color: '#6b7280', marginBottom: '4px' } }, '💡 词根提示：'),
    h('div', {}, ...hints)
  );
}

// 导入 h 函数
import { h } from '../ui/dom.js';
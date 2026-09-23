/**
 * 首页视图
 */

import { h, toast } from '../ui/dom.js';
import { openDB, getAll, getByIndex } from '../store/db.js';

/**
 * IndexedDB count — 比 getAll 轻量得多
 */
function count(db, storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function render() {
  const db = await openDB();

  const decks = await getAll(db, 'decks');
  const totalWords = await count(db, 'words');
  const allCards = await getAll(db, 'cards');          // 需按 state 过滤，必须全量
  const newCards = allCards.filter(c => c.state === 'new').length;
  const learningCards = allCards.filter(c => c.state === 'learning' || c.state === 'relearning').length;
  const reviewCards = allCards.filter(c => c.state === 'review' && c.due <= Date.now()).length;

  return h('div', { className: 'home-view' },
    // 头部
    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid #e5e7eb', background: 'white' } },
      h('h1', { style: { margin: 0, fontSize: '20px' } }, '📚 CET4 背单词'),
      h('button', { className: 'btn btn-secondary', onClick: () => window.location.hash = '#/settings' }, '⚙️')
    ),
    // 今日概览
    h('div', { className: 'card', style: { margin: '16px', padding: '20px' } },
      h('h2', { style: { margin: '0 0 16px 0', fontSize: '18px' } }, '📊 今日概览'),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' } },
        statCard('📚', '总词数', totalWords, '#3b82f6'),
        statCard('🆕', '新词', newCards, '#10b981'),
        statCard('🔄', '学习中', learningCards, '#f59e0b'),
        statCard('📖', '待复习', reviewCards, '#ef4444')
      )
    ),
    // 开始学习
    h('div', { className: 'card', style: { margin: '16px', padding: '20px' } },
      h('h2', { style: { margin: '0 0 16px 0', fontSize: '18px' } }, '🚀 开始学习'),
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr', gap: '12px' } },
        actionBtn('📝', '继续学习', '继续上次的学习进度', () => {
          decks.length > 0 ? (window.location.hash = `#/study/${decks[0].id}`) : toast('请先导入词表');
        }),
        actionBtn('📝', '自测', '检验学习成果', () => {
          decks.length > 0 ? (window.location.hash = '#/quiz') : toast('请先导入词表');
        }),
        actionBtn('❌', '错词本', '复习错过的单词', () => window.location.hash = '#/mistakes'),
        actionBtn('📊', '学习统计', '查看学习进度', () => window.location.hash = '#/stats')
      )
    ),
    // 词书管理
    h('div', { className: 'card', style: { margin: '16px', padding: '20px' } },
      h('h2', { style: { margin: '0 0 16px 0', fontSize: '18px' } }, '📚 词书管理'),
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr', gap: '12px' } },
        actionBtn('➕', '导入词表', '支持 CSV/TXT/JSON 格式', () => window.location.hash = '#/import'),
        actionBtn('📚', '词书库', '管理已导入的词书', () => window.location.hash = '#/library')
      )
    ),
    // 底部
    h('div', { style: { textAlign: 'center', padding: '20px', color: '#6b7280', fontSize: '12px' } },
      h('p', {}, 'CET4 背单词应用 v0.1.0'),
      h('p', {}, '极简、可携带、零依赖')
    )
  );
}

function statCard(icon, label, value, color) {
  return h('div', { style: { background: color + '10', padding: '12px', borderRadius: '8px', textAlign: 'center' } },
    h('div', { style: { fontSize: '24px', marginBottom: '4px' } }, icon),
    h('div', { style: { fontSize: '20px', fontWeight: 'bold', color } }, value),
    h('div', { style: { fontSize: '12px', color: '#6b7280' } }, label)
  );
}

function actionBtn(icon, title, description, onClick) {
  return h('button', {
    style: { display: 'flex', alignItems: 'center', padding: '16px', border: '1px solid #e5e7eb', borderRadius: '8px', background: 'white', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s' },
    onClick
  },
    h('div', { style: { fontSize: '24px', marginRight: '12px' } }, icon),
    h('div', {},
      h('div', { style: { fontWeight: 'bold', marginBottom: '4px' } }, title),
      h('div', { style: { fontSize: '12px', color: '#6b7280' } }, description)
    )
  );
}

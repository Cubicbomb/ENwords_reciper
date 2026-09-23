/**
 * 首页视图
 */

import { h, toast } from '../ui/dom.js';
import { openDB, getAll } from '../store/db.js';

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
  const allCards = await getAll(db, 'cards');
  const newCards = allCards.filter(c => c.state === 'new').length;
  const learningCards = allCards.filter(c => c.state === 'learning' || c.state === 'relearning').length;
  const reviewCards = allCards.filter(c => c.state === 'review' && c.due <= Date.now()).length;

  return h('div', { className: 'home-view fade-in' },
    // 顶栏
    h('header', {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 20px',
        borderBottom: '1px solid var(--line)'
      }
    },
      h('h1', {}, 'CET4 背单词'),
      h('button', {
        className: 'btn btn-ghost',
        style: { padding: '6px 10px' },
        onClick: () => window.location.hash = '#/settings'
      }, '设置')
    ),

    // 统计
    h('section', { style: { padding: '20px 20px 0' } },
      h('div', { className: 'section-title' }, '今日'),
      h('div', {
        style: {
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '1px',
          background: 'var(--line)',
          border: '1px solid var(--line)',
          borderRadius: '8px',
          overflow: 'hidden'
        }
      },
        statCell('总词', totalWords),
        statCell('新词', newCards),
        statCell('学习中', learningCards),
        statCell('待复习', reviewCards)
      )
    ),

    // 学习入口
    h('section', { style: { padding: '24px 20px 0' } },
      h('div', { className: 'section-title' }, '学习'),
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
        actionItem('继续学习', '继续上次进度', 'S', () => {
          decks.length > 0 ? (window.location.hash = `#/study/${decks[0].id}`) : toast('请先导入词表');
        }),
        actionItem('自测', '检验学习成果', 'Q', () => {
          decks.length > 0 ? (window.location.hash = '#/quiz') : toast('请先导入词表');
        }),
        actionItem('错词本', '复习薄弱词汇', 'M', () => window.location.hash = '#/mistakes'),
        actionItem('学习统计', '查看进度图表', 'T', () => window.location.hash = '#/stats')
      )
    ),

    // 词书
    h('section', { style: { padding: '24px 20px 0' } },
      h('div', { className: 'section-title' }, '词书'),
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
        actionItem('导入词表', 'CSV / TXT / JSON / Excel', 'I', () => window.location.hash = '#/import'),
        actionItem('词书库', `${decks.length} 本词书`, 'L', () => window.location.hash = '#/library')
      )
    ),

    // PC 快捷键提示
    h('div', { className: 'shortcut-hint', style: { paddingTop: '16px' } },
      '快捷键：',
      h('span', { className: 'kbd' }, 'S'),
      ' 学习 · ',
      h('span', { className: 'kbd' }, 'Q'),
      ' 自测 · ',
      h('span', { className: 'kbd' }, 'L'),
      ' 词书库'
    ),

    // 底部
    h('footer', {
      style: {
        padding: '32px 20px 24px',
        textAlign: 'center',
        fontSize: '12px',
        color: 'var(--ink-3)'
      }
    }, 'v0.1.0')
  );
}

function statCell(label, value) {
  return h('div', {
    style: {
      background: 'var(--surface)',
      padding: '14px 8px',
      textAlign: 'center'
    }
  },
    h('div', {
      style: { fontSize: '20px', fontWeight: '600', letterSpacing: '-0.02em' }
    }, String(value)),
    h('div', {
      style: { fontSize: '11px', color: 'var(--ink-3)', marginTop: '2px' }
    }, label)
  );
}

function actionItem(title, desc, shortcut, onClick) {
  return h('button', { className: 'list-item', onClick },
    h('div', { style: { flex: '1' } },
      h('div', { className: 'list-item-title' }, title),
      h('div', { className: 'list-item-desc' }, desc)
    ),
    // PC 端快捷键提示
    shortcut
      ? h('span', { className: 'kbd', style: { marginRight: '8px' } }, shortcut)
      : null,
    h('span', { style: { color: 'var(--ink-3)', fontSize: '16px' } }, '→')
  );
}

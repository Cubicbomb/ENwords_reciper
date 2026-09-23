/**
 * 错词本视图
 */
import { h, mount, toast, emptyState, loading } from '../ui/dom.js';
import { openDB, getAll } from '../store/db.js';

let state = { mistakes: [], loading: true };

export async function render() {
  state.loading = true;
  try {
    const db = await openDB();
    const logs = await getAll(db, 'logs');
    const cards = await getAll(db, 'cards');
    const words = await getAll(db, 'words');

    const mistakeMap = new Map();
    const sortedLogs = [...logs].sort((a, b) => b.ts - a.ts);

    for (const log of sortedLogs) {
      if (log.rating <= 2 && !mistakeMap.has(log.wordId)) {
        const word = words.find(w => w.id === log.wordId);
        const card = cards.find(c => c.id === log.cardId);
        if (word && card) {
          mistakeMap.set(log.wordId, { word, card, lastWrongAt: log.ts, wrongCount: 1 });
        }
      }
    }

    for (const log of sortedLogs) {
      if (log.rating <= 2 && mistakeMap.has(log.wordId)) {
        mistakeMap.get(log.wordId).wrongCount++;
      }
    }

    state.mistakes = Array.from(mistakeMap.values());
  } catch (error) {
    console.error('加载错词失败:', error);
    toast('加载失败');
  } finally {
    state.loading = false;
  }
  return renderView();
}

function renderView() {
  return h('div', { className: 'fade-in' },
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
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
        h('button', {
          className: 'btn btn-ghost',
          style: { padding: '4px 8px', marginLeft: '-8px' },
          onClick: () => window.location.hash = '#/'
        }, '←'),
        h('h1', {}, '错词本')
      ),
      state.mistakes.length > 0
        ? h('span', { style: { fontSize: '13px', color: 'var(--ink-3)' } },
            `${state.mistakes.length} 词`)
        : null
    ),

    // 内容
    h('div', { style: { padding: '20px' } },
      state.loading
        ? loading()
        : state.mistakes.length === 0
          ? emptyState({
              title: '没有错词',
              desc: '学习中答错的词会出现在这里',
              action: h('button', {
                className: 'btn btn-secondary',
                onClick: () => window.location.hash = '#/'
              }, '开始学习')
            })
          : renderMistakeList()
    )
  );
}

function renderMistakeList() {
  return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
    ...state.mistakes.map(mistake => renderMistakeItem(mistake))
  );
}

function renderMistakeItem(mistake) {
  const { word, lastWrongAt, wrongCount } = mistake;

  return h('div', { className: 'list-item', style: { cursor: 'default' } },
    h('div', { style: { flex: 1, minWidth: 0 } },
      h('div', { className: 'list-item-title' }, word.lemma),
      h('div', {
        style: {
          fontSize: '13px',
          color: 'var(--ink-2)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }
      }, word.senses[0]?.defCn || '—'),
      h('div', {
        style: { fontSize: '11px', color: 'var(--ink-3)', marginTop: '2px' }
      }, `错 ${wrongCount} 次 · ${getTimeAgo(lastWrongAt)}`)
    ),
    h('button', {
      className: 'btn btn-ghost',
      style: { padding: '6px 10px', fontSize: '13px' },
      onClick: () => removeMistake(word.id)
    }, '移除')
  );
}

async function removeMistake(wordId) {
  toast('已移除');
  state.mistakes = state.mistakes.filter(m => m.word.id !== wordId);
  mount(renderView());
}

function getTimeAgo(timestamp) {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (days > 0) return `${days}天前`;
  if (hours > 0) return `${hours}小时前`;
  if (minutes > 0) return `${minutes}分钟前`;
  return '刚刚';
}

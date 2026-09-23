/**
 * 词书库视图
 */
import { h, mount, toast, emptyState, loading } from '../ui/dom.js';
import { openDB, getAll, remove } from '../store/db.js';

let state = { decks: [], words: [], loading: true };

export async function render() {
  state.loading = true;
  try {
    const db = await openDB();
    state.decks = await getAll(db, 'decks');
    state.words = await getAll(db, 'words');
  } catch (error) {
    console.error('加载词书失败:', error);
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
        h('h1', {}, '词书库')
      ),
      h('button', {
        className: 'btn btn-primary',
        style: { padding: '6px 12px', fontSize: '13px' },
        onClick: () => window.location.hash = '#/import'
      }, '导入')
    ),

    // 内容
    h('div', { style: { padding: '20px' } },
      state.loading
        ? loading()
        : state.decks.length === 0
          ? emptyState({
              title: '还没有词书',
              desc: '导入一份词表开始学习',
              action: h('button', {
                className: 'btn btn-primary',
                onClick: () => window.location.hash = '#/import'
              }, '导入词表')
            })
          : renderDeckList()
    )
  );
}

function renderDeckList() {
  return h('div', {},
    // 统计
    h('div', {
      style: {
        fontSize: '13px',
        color: 'var(--ink-3)',
        marginBottom: '16px'
      }
    }, `${state.decks.length} 本词书 · ${state.words.length} 个词条`),

    // 列表
    h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
      ...state.decks.map(deck => renderDeckItem(deck))
    )
  );
}

function renderDeckItem(deck) {
  const wordCount = deck.wordIds?.length || 0;
  const isBuiltIn = deck.source === 'builtin';

  return h('div', {
    className: 'list-item',
    style: { cursor: 'default' }
  },
    h('div', { style: { flex: 1 } },
      h('div', { className: 'list-item-title' }, deck.name),
      h('div', { className: 'list-item-desc' },
        `${wordCount} 词 · ${isBuiltIn ? '内置' : '导入'}`
      )
    ),
    h('div', { style: { display: 'flex', gap: '6px' } },
      h('button', {
        className: 'btn btn-primary',
        style: { padding: '6px 12px', fontSize: '13px' },
        onClick: () => window.location.hash = `#/study/${deck.id}`
      }, '学习'),
      !isBuiltIn
        ? h('button', {
            className: 'btn btn-ghost',
            style: { padding: '6px 10px', fontSize: '13px' },
            onClick: () => deleteDeck(deck)
          }, '删除')
        : null
    )
  );
}

async function deleteDeck(deck) {
  if (!confirm(`删除「${deck.name}」？`)) return;
  try {
    const db = await openDB();
    await remove(db, 'decks', deck.id);
    const cards = await getAll(db, 'cards');
    for (const card of cards.filter(c => c.deckId === deck.id)) {
      await remove(db, 'cards', card.id);
    }
    toast('已删除');
    mount(render());
  } catch (error) {
    toast('删除失败');
    console.error(error);
  }
}

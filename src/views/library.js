/**
 * 词书库视图
 */
import { h, mount, toast } from '../ui/dom.js';
import { openDB, getAll, get, remove } from '../store/db.js';

let state = {
  decks: [],
  words: [],
  loading: true
};

export async function render() {
  state.loading = true;
  
  try {
    const db = await openDB();
    state.decks = await getAll(db, 'decks');
    state.words = await getAll(db, 'words');
  } catch (error) {
    console.error('加载词书失败:', error);
    toast('加载词书失败');
  } finally {
    state.loading = false;
  }
  
  return h('div', { style: { padding: '20px', maxWidth: '600px', margin: '0 auto' } },
    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' } },
      h('h2', { style: { margin: 0 } }, '📚 词书库'),
      h('div', {},
        h('button', { className: 'btn btn-secondary', onClick: () => window.location.hash = '#/', style: { marginRight: '8px' } }, '← 返回'),
        h('button', { className: 'btn btn-primary', onClick: () => window.location.hash = '#/import' }, '导入词表')
      )
    ),
    
    state.loading ? renderLoading() : renderDeckList()
  );
}

function renderLoading() {
  return h('div', { style: { textAlign: 'center', padding: '40px', color: '#6b7280' } },
    h('div', { style: { fontSize: '24px', marginBottom: '12px' } }, '⏳'),
    h('p', {}, '加载中...')
  );
}

function renderDeckList() {
  if (state.decks.length === 0) {
    return h('div', { style: { textAlign: 'center', padding: '40px', color: '#6b7280' } },
      h('div', { style: { fontSize: '48px', marginBottom: '16px' } }, '📭'),
      h('p', { style: { fontSize: '16px', marginBottom: '16px' } }, '还没有词书'),
      h('button', { className: 'btn btn-primary', onClick: () => window.location.hash = '#/import' }, '导入词表')
    );
  }
  
  return h('div', {},
    // 统计信息
    h('div', { style: { marginBottom: '20px', padding: '12px', background: '#f9fafb', borderRadius: '8px' } },
      h('p', { style: { margin: 0, color: '#6b7280' } }, 
        `共 ${state.decks.length} 本词书，${state.words.length} 个词条`
      )
    ),
    
    // 词书列表
    ...state.decks.map(deck => renderDeckItem(deck))
  );
}

function renderDeckItem(deck) {
  const wordCount = deck.wordIds?.length || 0;
  const isBuiltIn = deck.source === 'builtin';
  
  return h('div', { 
    className: 'card', 
    style: { 
      padding: '16px', 
      marginBottom: '12px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  },
    h('div', { style: { flex: 1 } },
      h('h3', { style: { margin: '0 0 4px 0', fontSize: '16px' } }, deck.name),
      h('p', { style: { margin: 0, color: '#6b7280', fontSize: '14px' } },
        `${wordCount} 个词条 · ${isBuiltIn ? '内置' : '导入'}`
      )
    ),
    h('div', { style: { display: 'flex', gap: '8px' } },
      h('button', {
        className: 'btn btn-primary',
        onClick: () => startStudy(deck.id),
        style: { padding: '8px 12px', fontSize: '14px' }
      }, '学习'),
      !isBuiltIn ? h('button', {
        className: 'btn btn-danger',
        onClick: () => deleteDeck(deck),
        style: { padding: '8px 12px', fontSize: '14px' }
      }, '删除') : null
    )
  );
}

function startStudy(deckId) {
  window.location.hash = `#/study/${deckId}`;
}

async function deleteDeck(deck) {
  if (!confirm(`确定要删除词书「${deck.name}」吗？`)) return;
  
  try {
    const db = await openDB();
    
    // 删除词书
    await remove(db, 'decks', deck.id);
    
    // 删除相关卡片
    const cards = await getAll(db, 'cards');
    const deckCards = cards.filter(c => c.deckId === deck.id);
    for (const card of deckCards) {
      await remove(db, 'cards', card.id);
    }
    
    toast(`已删除词书「${deck.name}」`);
    mount(render());
  } catch (error) {
    toast(`删除失败: ${error.message}`);
    console.error(error);
  }
}
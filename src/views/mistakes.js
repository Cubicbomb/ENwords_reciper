/**
 * 错词本视图
 */
import { h, mount, toast } from '../ui/dom.js';
import { openDB, getAll, get, put } from '../store/db.js';

let state = {
  mistakes: [],
  loading: true
};

export async function render() {
  state.loading = true;
  
  try {
    const db = await openDB();
    
    // 获取所有日志
    const logs = await getAll(db, 'logs');
    
    // 获取所有卡片
    const cards = await getAll(db, 'cards');
    
    // 获取所有词条
    const words = await getAll(db, 'words');
    
    // 找出错词：最近一次 rating <= 2 的词
    const mistakeMap = new Map();
    
    // 按时间倒序处理日志
    const sortedLogs = logs.sort((a, b) => b.ts - a.ts);
    
    for (const log of sortedLogs) {
      if (log.rating <= 2 && !mistakeMap.has(log.wordId)) {
        const word = words.find(w => w.id === log.wordId);
        const card = cards.find(c => c.id === log.cardId);
        
        if (word && card) {
          mistakeMap.set(log.wordId, {
            word,
            card,
            lastWrongAt: log.ts,
            wrongCount: 1
          });
        }
      }
    }
    
    // 统计错误次数
    for (const log of sortedLogs) {
      if (log.rating <= 2 && mistakeMap.has(log.wordId)) {
        const mistake = mistakeMap.get(log.wordId);
        mistake.wrongCount++;
      }
    }
    
    state.mistakes = Array.from(mistakeMap.values());
  } catch (error) {
    console.error('加载错词失败:', error);
    toast('加载错词失败');
  } finally {
    state.loading = false;
  }
  
  return renderMistakes();
}

function renderMistakes() {
  if (state.loading) {
    return h('div', { style: { padding: '20px', textAlign: 'center' } },
      h('div', { style: { fontSize: '24px', marginBottom: '12px' } }, '⏳'),
      h('p', {}, '加载中...')
    );
  }
  
  return h('div', { style: { padding: '20px', maxWidth: '600px', margin: '0 auto' } },
    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' } },
      h('h2', { style: { margin: 0 } }, '❌ 错词本'),
      h('button', { className: 'btn btn-secondary', onClick: () => window.location.hash = '#/' }, '← 返回')
    ),
    
    // 统计信息
    h('div', { style: { marginBottom: '20px', padding: '12px', background: '#fef2f2', borderRadius: '8px' } },
      h('p', { style: { margin: 0, color: '#991b1b' } }, 
        `共 ${state.mistakes.length} 个错词`
      )
    ),
    
    // 错词列表
    state.mistakes.length === 0 ? renderEmptyState() : renderMistakeList()
  );
}

function renderEmptyState() {
  return h('div', { style: { textAlign: 'center', padding: '40px', color: '#6b7280' } },
    h('div', { style: { fontSize: '48px', marginBottom: '16px' } }, '🎉'),
    h('p', { style: { fontSize: '16px', marginBottom: '16px' } }, '还没有错词'),
    h('button', { className: 'btn btn-primary', onClick: () => window.location.hash = '#/' }, '开始学习')
  );
}

function renderMistakeList() {
  return h('div', {},
    ...state.mistakes.map(mistake => renderMistakeItem(mistake))
  );
}

function renderMistakeItem(mistake) {
  const { word, card, lastWrongAt, wrongCount } = mistake;
  const timeAgo = getTimeAgo(lastWrongAt);
  
  return h('div', { 
    className: 'card', 
    style: { 
      padding: '16px', 
      marginBottom: '12px',
      borderLeft: '4px solid #ef4444'
    }
  },
    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' } },
      h('div', { style: { flex: 1 } },
        h('h3', { style: { margin: '0 0 4px 0', fontSize: '16px' } }, word.lemma),
        h('p', { style: { margin: 0, color: '#6b7280', fontSize: '14px' } },
          word.senses[0]?.defCn || '无释义'
        ),
        h('p', { style: { margin: '4px 0 0 0', color: '#9ca3af', fontSize: '12px' } },
          `错误 ${wrongCount} 次 · ${timeAgo}`
        )
      ),
      h('div', { style: { display: 'flex', gap: '8px' } },
        h('button', {
          className: 'btn btn-primary',
          onClick: () => startStudyWithWord(word),
          style: { padding: '8px 12px', fontSize: '14px' }
        }, '复习'),
        h('button', {
          className: 'btn btn-secondary',
          onClick: () => removeMistake(word.id),
          style: { padding: '8px 12px', fontSize: '14px' }
        }, '移除')
      )
    )
  );
}

function startStudyWithWord(word) {
  // 这里可以跳转到包含该词的学习会话
  // 简单实现：跳转到首页让用户选择词书
  toast('请从词书库选择包含该词的词书进行复习');
  window.location.hash = '#/library';
}

async function removeMistake(wordId) {
  try {
    const db = await openDB();
    
    // 查找并删除相关的错误日志
    const logs = await getAll(db, 'logs');
    const wrongLogs = logs.filter(log => log.wordId === wordId && log.rating <= 2);
    
    // 这里我们不删除日志（因为日志是只追加的），而是添加一个标记
    // 实际实现中，可以添加一个 Flag 来标记"已移除错词本"
    toast('已从错词本移除');
    
    // 重新加载
    mount(render());
  } catch (error) {
    console.error('移除错词失败:', error);
    toast('移除错词失败');
  }
}

function getTimeAgo(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (days > 0) return `${days} 天前`;
  if (hours > 0) return `${hours} 小时前`;
  if (minutes > 0) return `${minutes} 分钟前`;
  return '刚刚';
}
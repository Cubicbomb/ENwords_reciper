/**
 * 首页视图
 */

import { h, mount, toast } from '../ui/dom.js';
import { openDB, getAll, getByIndex } from '../store/db.js';

export async function render() {
  const db = await openDB();
  
  // 获取词书
  const decks = await getAll(db, 'decks');
  const cards = await getAll(db, 'cards');
  const words = await getAll(db, 'words');
  
  // 统计信息
  const totalWords = words.length;
  const newCards = cards.filter(c => c.state === 'new').length;
  const learningCards = cards.filter(c => c.state === 'learning' || c.state === 'relearning').length;
  const reviewCards = cards.filter(c => c.state === 'review' && c.due <= Date.now()).length;
  
  return h('div', { className: 'home-view' },
    // 头部导航
    h('div', { className: 'nav-header', style: { 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      padding: '16px',
      borderBottom: '1px solid #e5e7eb',
      background: 'white'
    }},
      h('h1', { style: { margin: 0, fontSize: '20px' } }, '📚 CET4 背单词'),
      h('div', {},
        h('button', {
          className: 'btn btn-secondary',
          onClick: () => window.location.hash = '#/settings'
        }, '⚙️')
      )
    ),
    
    // 今日学习概览
    h('div', { 
      className: 'card',
      style: { margin: '16px', padding: '20px' }
    },
      h('h2', { style: { margin: '0 0 16px 0', fontSize: '18px' } }, '📊 今日概览'),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' } },
        createStatCard('📚', '总词数', totalWords, '#3b82f6'),
        createStatCard('🆕', '新词', newCards, '#10b981'),
        createStatCard('🔄', '学习中', learningCards, '#f59e0b'),
        createStatCard('📖', '待复习', reviewCards, '#ef4444')
      )
    ),
    
    // 快捷操作
    h('div', { 
      className: 'card',
      style: { margin: '16px', padding: '20px' }
    },
      h('h2', { style: { margin: '0 0 16px 0', fontSize: '18px' } }, '🚀 开始学习'),
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr', gap: '12px' } },
        createActionButton('📝', '继续学习', '继续上次的学习进度', '#3b82f6', () => {
          if (decks.length > 0) {
            window.location.hash = `#/study/${decks[0].id}`;
          } else {
            toast('请先导入词表');
          }
        }),
        createActionButton('📝', '自测', '检验学习成果', '#10b981', () => {
          if (decks.length > 0) {
            window.location.hash = '#/quiz';
          } else {
            toast('请先导入词表');
          }
        }),
        createActionButton('❌', '错词本', '复习错过的单词', '#ef4444', () => {
          window.location.hash = '#/mistakes';
        }),
        createActionButton('📊', '学习统计', '查看学习进度', '#8b5cf6', () => {
          window.location.hash = '#/stats';
        })
      )
    ),
    
    // 词书管理
    h('div', { 
      className: 'card',
      style: { margin: '16px', padding: '20px' }
    },
      h('h2', { style: { margin: '0 0 16px 0', fontSize: '18px' } }, '📚 词书管理'),
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr', gap: '12px' } },
        createActionButton('➕', '导入词表', '支持 CSV/TXT/JSON 格式', '#3b82f6', () => {
          window.location.hash = '#/import';
        }),
        createActionButton('📚', '词书库', '管理已导入的词书', '#10b981', () => {
          window.location.hash = '#/library';
        })
      )
    ),
    
    // 底部信息
    h('div', { 
      className: 'footer',
      style: { 
        textAlign: 'center', 
        padding: '20px', 
        color: '#6b7280', 
        fontSize: '12px' 
      }
    },
      h('p', {}, 'CET4 背单词应用 v0.1.0'),
      h('p', {}, '极简、可携带、零依赖')
    )
  );
}

/**
 * 创建统计卡片
 * @param {string} icon
 * @param {string} label
 * @param {number} value
 * @param {string} color
 * @returns {Node}
 */
function createStatCard(icon, label, value, color) {
  return h('div', { 
    style: { 
      background: color + '10',
      padding: '12px',
      borderRadius: '8px',
      textAlign: 'center'
    }
  },
    h('div', { style: { fontSize: '24px', marginBottom: '4px' } }, icon),
    h('div', { style: { fontSize: '20px', fontWeight: 'bold', color } }, value),
    h('div', { style: { fontSize: '12px', color: '#6b7280' } }, label)
  );
}

/**
 * 创建操作按钮
 * @param {string} icon
 * @param {string} title
 * @param {string} description
 * @param {string} color
 * @param {Function} onClick
 * @returns {Node}
 */
function createActionButton(icon, title, description, color, onClick) {
  return h('button', {
    style: {
      display: 'flex',
      alignItems: 'center',
      padding: '16px',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      background: 'white',
      textAlign: 'left',
      cursor: 'pointer',
      transition: 'all 0.2s'
    },
    onClick
  },
    h('div', { style: { fontSize: '24px', marginRight: '12px' } }, icon),
    h('div', {},
      h('div', { style: { fontWeight: 'bold', marginBottom: '4px' } }, title),
      h('div', { style: { fontSize: '12px', color: '#6b7280' } }, description)
    )
  );
}
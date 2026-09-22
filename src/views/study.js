/**
 * 学习会话视图：背诵主界面
 * 支持多模式混排
 */

import { h, mount, toast, progressBar, button } from '../ui/dom.js';
import { openDB, getAll, getByIndex, get, put, add } from '../store/db.js';
import { createLog, createCard } from '../domain/model.js';
import { grade } from '../domain/scheduler.js';
import { autoSelectMode, getModesForWord } from '../modes/index.js';

// 学习会话状态
let sessionState = {
  deckId: null,
  words: [],
  cards: [],
  currentIndex: 0,
  mode: null,
  startTime: null,
  wordStartTime: null,
  results: []
};

export async function render(params) {
  const deckId = params;
  
  if (!deckId) {
    return h('div', { style: { padding: '20px', textAlign: 'center' } },
      h('h2', {}, '请先选择词书'),
      h('button', {
        className: 'btn btn-primary',
        onClick: () => window.location.hash = '#/library'
      }, '去词书库')
    );
  }
  
  // 加载词书和卡片
  const db = await openDB();
  const deck = await get(db, 'decks', deckId);
  
  if (!deck) {
    return h('div', { style: { padding: '20px', textAlign: 'center' } },
      h('h2', {}, '词书不存在'),
      h('button', {
        className: 'btn btn-primary',
        onClick: () => window.location.hash = '#/library'
      }, '返回词书库')
    );
  }
  
  // 获取该词书的所有卡片
  const allCards = await getByIndex(db, 'cards', 'deckId', deckId);
  
  // 获取到期卡片（新词 + 待复习）
  const now = Date.now();
  const dueCards = allCards.filter(card => {
    if (card.state === 'new') return true;
    if (card.state === 'learning' || card.state === 'relearning') return true;
    if (card.state === 'review' && card.due <= now) return true;
    return false;
  }).sort((a, b) => {
    // 新词优先，然后按 due 时间
    if (a.state === 'new' && b.state !== 'new') return -1;
    if (b.state === 'new' && a.state !== 'new') return 1;
    return a.due - b.due;
  });
  
  if (dueCards.length === 0) {
    return h('div', { style: { padding: '20px', textAlign: 'center' } },
      h('h2', {}, '🎉 今日学习完成'),
      h('p', { style: { color: '#6b7280', marginBottom: '16px' } }, '没有更多待学习的单词了'),
      h('button', {
        className: 'btn btn-primary',
        onClick: () => window.location.hash = '#/'
      }, '返回首页')
    );
  }
  
  // 加载所有词条（用于干扰项生成）
  const allWords = await getAll(db, 'words');
  
  // 初始化会话状态
  sessionState = {
    deckId,
    words: [],
    cards: dueCards,
    currentIndex: 0,
    mode: null,
    startTime: Date.now(),
    wordStartTime: null,
    results: []
  };
  
  // 加载卡片对应的词条
  for (const card of dueCards) {
    const word = await get(db, 'words', card.wordId);
    if (word) {
      sessionState.words.push({ card, word });
    }
  }
  
  // 渲染学习界面
  return renderStudySession(db, allWords);
}

/**
 * 渲染学习会话界面
 * @param {IDBDatabase} db
 * @param {Object[]} allWords
 * @returns {Node}
 */
function renderStudySession(db, allWords) {
  const { words, currentIndex, results } = sessionState;
  
  if (currentIndex >= words.length) {
    // 学习完成
    return renderStudyComplete(db);
  }
  
  const { card, word } = words[currentIndex];
  
  // 自动选择模式
  const mode = autoSelectMode(word, currentIndex);
  sessionState.mode = mode;
  sessionState.wordStartTime = Date.now();
  
  // 构建模式 UI
  const modeCtx = {
    modeId: mode.id,
    allWords,
    onComplete: (result) => handleAnswer(result)
  };
  
  const modeItem = mode.build(word, modeCtx);
  
  // 组装界面
  return h('div', { className: 'study-view', style: { minHeight: '100vh', background: '#f9fafb' } },
    // 顶部导航
    h('div', { style: { 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      padding: '16px',
      background: 'white',
      borderBottom: '1px solid #e5e7eb'
    }},
      h('button', {
        style: { 
          padding: '8px 12px', 
          border: '1px solid #e5e7eb', 
          borderRadius: '6px',
          background: 'white',
          cursor: 'pointer'
        },
        onClick: () => {
          if (confirm('确定要退出学习吗？当前进度将不会保存。')) {
            window.location.hash = '#/';
          }
        }
      }, '← 返回'),
      h('div', { style: { textAlign: 'center' } },
        h('div', { style: { fontSize: '14px', color: '#6b7280' } }, 
          `${currentIndex + 1} / ${words.length}`
        ),
        progressBar(currentIndex + 1, words.length)
      ),
      h('div', { style: { width: '60px' } }) // 占位
    ),
    
    // 进度条
    h('div', { style: { padding: '0 16px', marginTop: '8px' } },
      progressBar(currentIndex + 1, words.length)
    ),
    
    // 题目区域
    h('div', { 
      className: 'study-content',
      style: { 
        padding: '16px',
        marginTop: '16px',
        background: 'white',
        borderRadius: '12px',
        margin: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
      }
    },
      // 模式标签
      h('div', { style: { 
        display: 'inline-block',
        padding: '4px 8px',
        background: '#eff6ff',
        color: '#3b82f6',
        borderRadius: '4px',
        fontSize: '12px',
        marginBottom: '12px'
      }}, mode.name),
      
      // 题目
      modeItem.question,
      
      // 答案区域
      modeItem.answer
    ),
    
    // 如果是翻卡模式，显示评分按钮
    mode.id === 'flash' ? createFlashButtons(modeItem.check) : null,
    
    // 底部统计
    h('div', { style: { 
      padding: '16px',
      marginTop: '16px',
      background: 'white',
      borderRadius: '12px',
      margin: '16px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
    }},
      h('div', { style: { display: 'flex', justifyContent: 'space-around', textAlign: 'center' } },
        createMiniStat('✅', results.filter(r => r.correct).length, '正确'),
        createMiniStat('❌', results.filter(r => !r.correct).length, '错误'),
        createMiniStat('⏱️', formatTime(Date.now() - sessionState.startTime), '用时')
      )
    )
  );
}

/**
 * 创建 Flash 模式的评分按钮
 * @param {Function} check
 * @returns {Node}
 */
function createFlashButtons(check) {
  const buttons = [
    { text: '❌ 不认识', rating: 1, color: '#ef4444' },
    { text: '😐 模糊', rating: 2, color: '#f59e0b' },
    { text: '😊 认识', rating: 3, color: '#10b981' },
    { text: '😎 简单', rating: 4, color: '#3b82f6' }
  ];

  return h('div', { 
    style: { 
      display: 'grid', 
      gridTemplateColumns: 'repeat(4, 1fr)', 
      gap: '8px',
      padding: '16px'
    }
  }, 
    ...buttons.map(btn => 
      h('button', {
        style: {
          padding: '12px 8px',
          borderRadius: '8px',
          border: 'none',
          background: btn.color,
          color: 'white',
          fontSize: '14px',
          cursor: 'pointer',
          transition: 'transform 0.1s, opacity 0.1s'
        },
        onClick: (e) => {
          e.target.style.transform = 'scale(0.95)';
          setTimeout(() => {
            e.target.style.transform = 'scale(1)';
            check(btn.rating);
          }, 100);
        }
      }, btn.text)
    )
  );
}

/**
 * 创建迷你统计项
 * @param {string} icon
 * @param {string|number} value
 * @param {string} label
 * @returns {Node}
 */
function createMiniStat(icon, value, label) {
  return h('div', {},
    h('div', { style: { fontSize: '16px', marginBottom: '4px' } }, icon),
    h('div', { style: { fontSize: '18px', fontWeight: 'bold' } }, value),
    h('div', { style: { fontSize: '12px', color: '#6b7280' } }, label)
  );
}

/**
 * 处理答案
 * @param {Object} result
 */
async function handleAnswer(result) {
  const { cards, currentIndex, words, deckId, results, startTime } = sessionState;
  
  const { card, word } = words[currentIndex];
  const elapsed = Date.now() - (sessionState.wordStartTime || startTime);
  
  // 记录结果
  results.push({
    cardId: card.id,
    wordId: word.id,
    rating: result.rating,
    correct: result.correct,
    ms: elapsed,
    answer: result.answer
  });
  
  // 更新卡片状态
  const updatedCard = grade(card, result.rating, Date.now());
  
  // 保存到数据库
  const db = await openDB();
  await put(db, 'cards', updatedCard);
  
  // 保存复习记录
  const log = createLog(
    card.id,
    word.id,
    deckId,
    sessionState.mode.id,
    result.rating,
    result.correct,
    elapsed,
    result.answer
  );
  await add(db, 'logs', log);
  
  // 移动到下一个单词
  sessionState.currentIndex++;
  
  // 重新渲染
  const allWords = await getAll(db, 'words');
  mount(renderStudySession(db, allWords));
}

/**
 * 渲染学习完成界面
 * @param {IDBDatabase} db
 * @returns {Node}
 */
function renderStudyComplete(db) {
  const { words, results, startTime } = sessionState;
  const correctCount = results.filter(r => r.correct).length;
  const accuracy = results.length > 0 ? Math.round((correctCount / results.length) * 100) : 0;
  const totalTime = Date.now() - startTime;
  
  return h('div', { style: { padding: '20px', textAlign: 'center' } },
    h('h2', { style: { marginBottom: '24px' } }, '🎉 学习完成'),
    
    h('div', { style: { 
      display: 'grid', 
      gridTemplateColumns: 'repeat(3, 1fr)', 
      gap: '16px',
      marginBottom: '24px'
    }},
      createMiniStat('📝', results.length, '总单词'),
      createMiniStat('✅', correctCount, '正确'),
      createMiniStat('❌', results.length - correctCount, '错误')
    ),
    
    h('div', { style: { 
      fontSize: '48px', 
      fontWeight: 'bold', 
      color: accuracy >= 80 ? '#10b981' : accuracy >= 60 ? '#f59e0b' : '#ef4444',
      marginBottom: '24px'
    }},
      `${accuracy}%`
    ),
    
    h('p', { style: { color: '#6b7280', marginBottom: '24px' } },
      `正确率 ${accuracy}%，用时 ${formatTime(totalTime)}`
    ),
    
    h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' } },
      h('button', {
        className: 'btn btn-primary',
        onClick: () => {
          // 重置会话，重新开始
          sessionState.currentIndex = 0;
          sessionState.results = [];
          sessionState.startTime = Date.now();
          mount(renderStudySession(db, []));
        }
      }, '再学一轮'),
      h('button', {
        className: 'btn btn-secondary',
        onClick: () => window.location.hash = '#/'
      }, '返回首页')
    )
  );
}

/**
 * 格式化时间（毫秒 -> "X分X秒"）
 * @param {number} ms
 * @returns {string}
 */
function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes > 0) {
    return `${minutes}分${remainingSeconds}秒`;
  }
  return `${remainingSeconds}秒`;
}
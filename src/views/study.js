/**
 * 学习会话视图
 */

import { h, mount, toast, progressBar } from '../ui/dom.js';
import { openDB, getAll, getByIndex, get, put } from '../store/db.js';
import { createLog } from '../domain/model.js';
import { grade } from '../domain/scheduler.js';
import { buildQueue, getTodayStats } from '../domain/queue.js';
import { autoSelectMode } from '../modes/index.js';
import { createFlashButtons } from '../modes/shared.js';

let session = {
  deckId: null,
  words: [],
  cards: [],
  currentIndex: 0,
  mode: null,
  startTime: 0,
  wordStartTime: 0,
  results: [],
  cleanups: []
};

let cachedAllWords = null;

function cleanupSession() {
  for (const fn of session.cleanups) {
    try { fn(); } catch (e) { /* ignore */ }
  }
  session.cleanups = [];
}

export async function render(params) {
  const deckId = params;
  if (!deckId) return noDeckUI('请先选择词书', '#/library');

  const db = await openDB();
  const deck = await get(db, 'decks', deckId);
  if (!deck) return noDeckUI('词书不存在', '#/library');

  const allCards = await getByIndex(db, 'cards', 'deckId', deckId);
  const now = Date.now();
  const queue = buildQueue(allCards, now);
  const stats = getTodayStats(allCards, now);

  if (queue.length === 0) {
    return h('div', { className: 'fade-in', style: { padding: '48px 20px', textAlign: 'center' } },
      h('div', { style: { fontSize: '15px', fontWeight: '500', marginBottom: '8px' } }, '今日学习完成'),
      h('p', { style: { fontSize: '14px', color: 'var(--ink-3)', marginBottom: '24px' } }, '没有待复习的单词了'),
      h('button', { className: 'btn btn-secondary', onClick: () => window.location.hash = '#/' }, '返回首页')
    );
  }

  if (!cachedAllWords) cachedAllWords = await getAll(db, 'words');

  const words = [];
  for (const card of queue) {
    const word = cachedAllWords.find(w => w.id === card.wordId) || await get(db, 'words', card.wordId);
    if (word) words.push({ card, word });
  }

  cleanupSession();
  session = {
    deckId,
    words,
    cards: queue,
    currentIndex: 0,
    mode: null,
    startTime: Date.now(),
    wordStartTime: 0,
    results: [],
    stats,
    cleanups: []
  };

  return renderSession(db);
}

function renderSession(db) {
  const { words, currentIndex, results } = session;

  // 清理上一题
  cleanupSession();

  if (currentIndex >= words.length) return renderComplete(db);

  const { word } = words[currentIndex];
  const mode = autoSelectMode(word, currentIndex);
  session.mode = mode;
  session.wordStartTime = Date.now();

  const modeItem = mode.build(word, {
    modeId: mode.id,
    allWords: cachedAllWords,
    onComplete: (r) => handleAnswer(db, r)
  });

  // 保存模式的清理函数
  if (modeItem.cleanup) {
    session.cleanups.push(modeItem.cleanup);
  }

  // Flash 模式：评分按钮（显示答案后出现）
  let flashButtons = null;
  if (mode.id === 'flash') {
    flashButtons = createFlashButtons((rating) => {
      modeItem.check(rating);
    });
    session.cleanups.push(flashButtons.cleanup);
  }

  // Escape 退出
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      if (confirm('确定退出学习？进度将保存。')) {
        cleanupSession();
        window.location.hash = '#/';
      }
    }
  };
  document.addEventListener('keydown', handleEscape);
  session.cleanups.push(() => document.removeEventListener('keydown', handleEscape));

  return h('div', { className: 'fade-in', style: { minHeight: '100vh', display: 'flex', flexDirection: 'column' } },
    // 顶栏
    h('header', {
      style: {
        padding: '12px 16px',
        borderBottom: '1px solid var(--line)',
        background: 'var(--surface)'
      }
    },
      h('div', {
        style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }
      },
        h('button', {
          className: 'btn btn-ghost',
          style: { padding: '4px 8px', fontSize: '13px', marginLeft: '-8px' },
          onClick: () => {
            if (confirm('确定退出学习？进度将保存。')) {
              cleanupSession();
              window.location.hash = '#/';
            }
          }
        }, '← 返回'),
        h('span', { style: { fontSize: '13px', color: 'var(--ink-3)' } },
          `${currentIndex + 1} / ${words.length}`
        ),
        h('span', { style: { fontSize: '13px', color: 'var(--ink-3)', width: '48px', textAlign: 'right' } },
          mode.name
        )
      ),
      progressBar(currentIndex + 1, words.length)
    ),

    // 题目区
    h('main', {
      style: {
        flex: '1',
        padding: '24px 20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        minHeight: '300px'
      }
    },
      modeItem.question,
      modeItem.answer
    ),

    // 评分按钮（flash 模式，显示答案后出现）
    flashButtons ? flashButtons.node : null,

    // 底部统计
    h('footer', {
      style: {
        padding: '12px 16px',
        borderTop: '1px solid var(--line)',
        display: 'flex',
        justifyContent: 'space-around',
        fontSize: '13px',
        color: 'var(--ink-3)',
        background: 'var(--surface)'
      }
    },
      h('span', {}, `${results.filter(r => r.correct).length} 正确`),
      h('span', {}, `${results.filter(r => !r.correct).length} 错误`),
      h('span', {}, fmtTime(Date.now() - session.startTime))
    )
  );
}

async function handleAnswer(db, result) {
  const { words, currentIndex, deckId, results, wordStartTime } = session;
  const { card, word } = words[currentIndex];
  const elapsed = Date.now() - wordStartTime;

  results.push({
    cardId: card.id,
    wordId: word.id,
    rating: result.rating,
    correct: result.correct,
    ms: elapsed,
    answer: result.answer
  });

  const updatedCard = grade(card, result.rating, Date.now());
  await put(db, 'cards', updatedCard);
  await put(db, 'logs', createLog(card.id, word.id, deckId, session.mode.id, result.rating, result.correct, elapsed, result.answer));

  session.currentIndex++;
  mount(renderSession(db));
}

function renderComplete(db) {
  cleanupSession();
  const { results, startTime } = session;

  const correct = results.filter(r => r.correct).length;
  const accuracy = results.length ? Math.round((correct / results.length) * 100) : 0;
  const totalMs = Date.now() - startTime;

  return h('div', { className: 'fade-in', style: { padding: '48px 20px', textAlign: 'center' } },
    h('div', { style: { fontSize: '15px', fontWeight: '500', marginBottom: '4px' } }, '学习完成'),
    h('div', {
      style: {
        fontSize: '56px',
        fontWeight: '600',
        letterSpacing: '-0.03em',
        margin: '24px 0',
        color: accuracy >= 80 ? 'var(--green)' : accuracy >= 60 ? 'var(--amber)' : 'var(--red)'
      }
    }, `${accuracy}%`),
    h('div', {
      style: {
        display: 'flex',
        justifyContent: 'center',
        gap: '24px',
        fontSize: '14px',
        color: 'var(--ink-3)',
        marginBottom: '32px'
      }
    },
      h('span', {}, `${results.length} 题`),
      h('span', {}, `${correct} 正确`),
      h('span', {}, fmtTime(totalMs))
    ),
    h('div', { style: { display: 'flex', gap: '8px', justifyContent: 'center' } },
      h('button', {
        className: 'btn btn-primary',
        onClick: () => {
          session.currentIndex = 0;
          session.results = [];
          session.startTime = Date.now();
          mount(renderSession(db));
        }
      }, '再来一轮'),
      h('button', {
        className: 'btn btn-secondary',
        onClick: () => window.location.hash = '#/'
      }, '返回首页')
    )
  );
}

function noDeckUI(msg, href) {
  return h('div', { style: { padding: '48px 20px', textAlign: 'center' } },
    h('div', { style: { fontSize: '15px', marginBottom: '24px' } }, msg),
    h('button', { className: 'btn btn-secondary', onClick: () => window.location.hash = href }, '返回')
  );
}

function fmtTime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}:${String(s % 60).padStart(2, '0')}` : `${s}s`;
}

/**
 * 学习会话视图：背诵主界面
 */

import { h, mount, toast, progressBar } from '../ui/dom.js';
import { openDB, getAll, getByIndex, get, put } from '../store/db.js';
import { createLog } from '../domain/model.js';
import { grade, isDue } from '../domain/scheduler.js';
import { autoSelectMode } from '../modes/index.js';
import { createFlashButtons } from '../modes/shared.js';

let session = { deckId: null, words: [], cards: [], currentIndex: 0, mode: null, startTime: 0, wordStartTime: 0, results: [] };
let cachedAllWords = null;   // 缓存全量词条，避免每题重拉

export async function render(params) {
  const deckId = params;
  if (!deckId) return noDeckUI('请先选择词书', '#/library');

  const db = await openDB();
  const deck = await get(db, 'decks', deckId);
  if (!deck) return noDeckUI('词书不存在', '#/library');

  const allCards = await getByIndex(db, 'cards', 'deckId', deckId);
  const dueCards = allCards.filter(isDue).sort((a, b) => {
    if (a.state === 'new' && b.state !== 'new') return -1;
    if (b.state === 'new' && a.state !== 'new') return 1;
    return a.due - b.due;
  });

  if (dueCards.length === 0) {
    return h('div', { style: { padding: '20px', textAlign: 'center' } },
      h('h2', {}, '🎉 今日学习完成'),
      h('p', { style: { color: '#6b7280', marginBottom: '16px' } }, '没有更多待学习的单词了'),
      h('button', { className: 'btn btn-primary', onClick: () => window.location.hash = '#/' }, '返回首页')
    );
  }

  // 缓存全量词条（首次加载后不再重拉）
  if (!cachedAllWords) cachedAllWords = await getAll(db, 'words');

  // 加载 due 卡片对应的词条
  const words = [];
  for (const card of dueCards) {
    const word = cachedAllWords.find(w => w.id === card.wordId) || await get(db, 'words', card.wordId);
    if (word) words.push({ card, word });
  }

  session = { deckId, words, cards: dueCards, currentIndex: 0, mode: null, startTime: Date.now(), wordStartTime: 0, results: [] };
  return renderSession(db);
}

function renderSession(db) {
  const { words, currentIndex, results } = session;
  if (currentIndex >= words.length) return renderComplete(db);

  const { card, word } = words[currentIndex];
  const mode = autoSelectMode(word, currentIndex);
  session.mode = mode;
  session.wordStartTime = Date.now();

  const modeItem = mode.build(word, { modeId: mode.id, allWords: cachedAllWords, onComplete: (r) => handleAnswer(db, r) });

  return h('div', { style: { minHeight: '100vh', background: '#f9fafb' } },
    // 顶部
    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'white', borderBottom: '1px solid #e5e7eb' } },
      h('button', {
        style: { padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', background: 'white', cursor: 'pointer' },
        onClick: () => { if (confirm('确定要退出学习吗？当前进度将不会保存。')) window.location.hash = '#/'; }
      }, '← 返回'),
      h('div', { style: { textAlign: 'center' } },
        h('div', { style: { fontSize: '14px', color: '#6b7280' } }, `${currentIndex + 1} / ${words.length}`),
        progressBar(currentIndex + 1, words.length)
      ),
      h('div', { style: { width: '60px' } })
    ),
    // 题目
    h('div', { style: { padding: '16px', marginTop: '16px', background: 'white', borderRadius: '12px', margin: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' } },
      h('div', { style: { display: 'inline-block', padding: '4px 8px', background: '#eff6ff', color: '#3b82f6', borderRadius: '4px', fontSize: '12px', marginBottom: '12px' } }, mode.name),
      modeItem.question,
      modeItem.answer
    ),
    // 翻卡评分按钮
    mode.id === 'flash' ? createFlashButtons(modeItem.check) : null,
    // 底部统计
    h('div', { style: { padding: '16px', marginTop: '16px', background: 'white', borderRadius: '12px', margin: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' } },
      h('div', { style: { display: 'flex', justifyContent: 'space-around', textAlign: 'center' } },
        miniStat('✅', results.filter(r => r.correct).length, '正确'),
        miniStat('❌', results.filter(r => !r.correct).length, '错误'),
        miniStat('⏱️', fmtTime(Date.now() - session.startTime), '用时')
      )
    )
  );
}

async function handleAnswer(db, result) {
  const { words, currentIndex, deckId, results, wordStartTime } = session;
  const { card, word } = words[currentIndex];
  const elapsed = Date.now() - wordStartTime;

  results.push({ cardId: card.id, wordId: word.id, rating: result.rating, correct: result.correct, ms: elapsed, answer: result.answer });

  const updatedCard = grade(card, result.rating, Date.now());
  await put(db, 'cards', updatedCard);
  await put(db, 'logs', createLog(card.id, word.id, deckId, session.mode.id, result.rating, result.correct, elapsed, result.answer));

  session.currentIndex++;
  mount(renderSession(db));
}

function renderComplete(db) {
  const { words, results, startTime } = session;
  const correct = results.filter(r => r.correct).length;
  const accuracy = results.length ? Math.round((correct / results.length) * 100) : 0;
  const totalMs = Date.now() - startTime;

  return h('div', { style: { padding: '20px', textAlign: 'center' } },
    h('h2', { style: { marginBottom: '24px' } }, '🎉 学习完成'),
    h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' } },
      miniStat('📝', results.length, '总单词'),
      miniStat('✅', correct, '正确'),
      miniStat('❌', results.length - correct, '错误')
    ),
    h('div', { style: { fontSize: '48px', fontWeight: 'bold', color: accuracy >= 80 ? '#10b981' : accuracy >= 60 ? '#f59e0b' : '#ef4444', marginBottom: '24px' } }, `${accuracy}%`),
    h('p', { style: { color: '#6b7280', marginBottom: '24px' } }, `正确率 ${accuracy}%，用时 ${fmtTime(totalMs)}`),
    h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' } },
      h('button', { className: 'btn btn-primary', onClick: () => { session.currentIndex = 0; session.results = []; session.startTime = Date.now(); mount(renderSession(db)); } }, '再学一轮'),
      h('button', { className: 'btn btn-secondary', onClick: () => window.location.hash = '#/' }, '返回首页')
    )
  );
}

function noDeckUI(msg, href) {
  return h('div', { style: { padding: '20px', textAlign: 'center' } },
    h('h2', {}, msg),
    h('button', { className: 'btn btn-primary', onClick: () => window.location.hash = href }, '返回')
  );
}

function miniStat(icon, value, label) {
  return h('div', {},
    h('div', { style: { fontSize: '16px', marginBottom: '4px' } }, icon),
    h('div', { style: { fontSize: '18px', fontWeight: 'bold' } }, value),
    h('div', { style: { fontSize: '12px', color: '#6b7280' } }, label)
  );
}

function fmtTime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}分${s % 60}秒` : `${s}秒`;
}

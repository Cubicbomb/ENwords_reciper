/**
 * 自测视图
 */
import { h, mount, toast } from '../ui/dom.js';
import { openDB, getAll, getByIndex, get, put } from '../store/db.js';
import { createLog } from '../domain/model.js';
import { grade } from '../domain/scheduler.js';
import { autoSelectMode } from '../modes/index.js';

let state = {
  deckId: null,
  words: [],
  questions: [],
  currentIndex: 0,
  answers: [],
  submitted: false,
  loading: true
};

export async function render(params) {
  // 如果没有指定词书，显示词书选择界面
  if (!params) {
    return renderDeckSelection();
  }
  
  const deckId = params;
  state.deckId = deckId;
  state.loading = true;
  
  try {
    const db = await openDB();
    const deck = await get(db, 'decks', deckId);
    if (!deck) return noDeckUI('词书不存在', '#/library');

    // 获取词书的所有卡片
    const allCards = await getByIndex(db, 'cards', 'deckId', deckId);
    
    // 随机选择 20 个词条进行测试
    const shuffledCards = allCards.sort(() => Math.random() - 0.5);
    const testCards = shuffledCards.slice(0, Math.min(20, shuffledCards.length));
    
    // 加载词条
    const words = [];
    for (const card of testCards) {
      const word = await get(db, 'words', card.wordId);
      if (word) words.push({ card, word });
    }
    
    // 生成题目
    const questions = words.map(({ card, word }, index) => {
      const mode = autoSelectMode(word, index);
      return { card, word, mode, answer: null };
    });
    
    state.words = words;
    state.questions = questions;
    state.currentIndex = 0;
    state.answers = [];
    state.submitted = false;
  } catch (error) {
    console.error('加载测试数据失败:', error);
    toast('加载测试数据失败');
  } finally {
    state.loading = false;
  }
  
  return renderQuiz();
}

function renderQuiz() {
  if (state.loading) {
    return h('div', { style: { padding: '20px', textAlign: 'center' } },
      h('div', { style: { fontSize: '24px', marginBottom: '12px' } }, '⏳'),
      h('p', {}, '加载中...')
    );
  }
  
  if (state.submitted) {
    return renderResults();
  }
  
  if (state.questions.length === 0) {
    return h('div', { style: { padding: '20px', textAlign: 'center' } },
      h('div', { style: { fontSize: '48px', marginBottom: '16px' } }, '📝'),
      h('p', { style: { fontSize: '16px', marginBottom: '16px' } }, '没有可测试的词条'),
      h('button', { className: 'btn btn-primary', onClick: () => window.location.hash = '#/' }, '返回首页')
    );
  }
  
  const { currentIndex, questions } = state;
  if (currentIndex >= questions.length) {
    return renderResults();
  }
  
  const question = questions[currentIndex];
  const mode = question.mode;
  
  // 构建题目 UI
  const modeItem = mode.build(question.word, { 
    modeId: mode.id, 
    allWords: state.words.map(w => w.word),
    onComplete: (result) => handleAnswer(result)
  });
  
  return h('div', { style: { minHeight: '100vh', background: '#f9fafb' } },
    // 顶部
    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'white', borderBottom: '1px solid #e5e7eb' } },
      h('button', {
        style: { padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', background: 'white', cursor: 'pointer' },
        onClick: () => { if (confirm('确定要退出测试吗？')) window.location.hash = '#/'; }
      }, '← 退出'),
      h('div', { style: { textAlign: 'center' } },
        h('div', { style: { fontSize: '14px', color: '#6b7280' } }, `题目 ${currentIndex + 1} / ${questions.length}`),
        h('div', { style: { width: '100%', height: '4px', background: '#e5e7eb', borderRadius: '2px', marginTop: '8px' } },
          h('div', { style: { width: `${((currentIndex + 1) / questions.length) * 100}%`, height: '100%', background: '#3b82f6', borderRadius: '2px', transition: 'width 0.3s' } })
        )
      ),
      h('div', { style: { width: '60px' } })
    ),
    // 题目
    h('div', { style: { padding: '16px', marginTop: '16px', background: 'white', borderRadius: '12px', margin: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' } },
      h('div', { style: { display: 'inline-block', padding: '4px 8px', background: '#eff6ff', color: '#3b82f6', borderRadius: '4px', fontSize: '12px', marginBottom: '12px' } }, mode.name),
      modeItem.question,
      modeItem.answer
    ),
    // 翻卡评分按钮（仅 flash 模式）
    mode.id === 'flash' ? createFlashButtons(modeItem.check) : null
  );
}

function createFlashButtons(check) {
  const buttons = [
    { text: '❌ 不认识', rating: 1, color: '#ef4444' },
    { text: '😐 模糊', rating: 2, color: '#f59e0b' },
    { text: '😊 认识', rating: 3, color: '#10b981' },
    { text: '😎 简单', rating: 4, color: '#3b82f6' }
  ];

  return h('div', { 
    style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', padding: '16px' }
  }, 
    ...buttons.map(btn => 
      h('button', {
        style: {
          padding: '12px 8px', borderRadius: '8px', border: 'none',
          background: btn.color, color: 'white', fontSize: '14px',
          cursor: 'pointer', transition: 'transform 0.1s'
        },
        onClick: (e) => {
          e.target.style.transform = 'scale(0.95)';
          setTimeout(() => { e.target.style.transform = 'scale(1)'; check(btn.rating); }, 100);
        }
      }, btn.text)
    )
  );
}

function handleAnswer(result) {
  const { currentIndex, questions } = state;
  const question = questions[currentIndex];
  
  // 记录答案
  state.answers.push({
    card: question.card,
    word: question.word,
    mode: question.mode.id,
    rating: result.rating,
    correct: result.correct,
    ms: result.ms,
    answer: result.answer
  });
  
  // 下一题
  state.currentIndex++;
  
  // 如果是最后一题，自动提交
  if (state.currentIndex >= questions.length) {
    submitQuiz();
  } else {
    mount(renderQuiz());
  }
}

async function submitQuiz() {
  state.submitted = true;
  
  try {
    const db = await openDB();
    
    // 批量写入日志并更新卡片
    for (const answer of state.answers) {
      // 写入日志
      const log = createLog(
        answer.card.id,
        answer.word.id,
        state.deckId,
        answer.mode,
        answer.rating,
        answer.correct,
        answer.ms,
        answer.answer
      );
      await put(db, 'logs', log);
      
      // 更新卡片状态
      const updatedCard = grade(answer.card, answer.rating, Date.now());
      await put(db, 'cards', updatedCard);
    }
    
    toast('测试提交成功');
  } catch (error) {
    console.error('提交测试失败:', error);
    toast('提交测试失败');
  }
  
  mount(renderResults());
}

function renderResults() {
  const { answers } = state;
  const total = answers.length;
  const correct = answers.filter(a => a.correct).length;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
  
  return h('div', { style: { padding: '20px', textAlign: 'center' } },
    h('h2', { style: { marginBottom: '24px' } }, '📊 测试结果'),
    
    // 统计卡片
    h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' } },
      h('div', { style: { padding: '16px', background: '#f0fdf4', borderRadius: '8px' } },
        h('div', { style: { fontSize: '24px', fontWeight: 'bold', color: '#166534' } }, total),
        h('div', { style: { fontSize: '14px', color: '#166534' } }, '总题数')
      ),
      h('div', { style: { padding: '16px', background: '#eff6ff', borderRadius: '8px' } },
        h('div', { style: { fontSize: '24px', fontWeight: 'bold', color: '#1e40af' } }, correct),
        h('div', { style: { fontSize: '14px', color: '#1e40af' } }, '正确')
      ),
      h('div', { style: { padding: '16px', background: '#fef2f2', borderRadius: '8px' } },
        h('div', { style: { fontSize: '24px', fontWeight: 'bold', color: '#991b1b' } }, total - correct),
        h('div', { style: { fontSize: '14px', color: '#991b1b' } }, '错误')
      )
    ),
    
    // 正确率
    h('div', { style: { fontSize: '48px', fontWeight: 'bold', color: accuracy >= 80 ? '#10b981' : accuracy >= 60 ? '#f59e0b' : '#ef4444', marginBottom: '24px' } },
      `${accuracy}%`
    ),
    
    h('p', { style: { color: '#6b7280', marginBottom: '24px' } }, `正确率 ${accuracy}%`),
    
    // 错题列表
    answers.filter(a => !a.correct).length > 0 ? renderWrongList() : null,
    
    // 操作按钮
    h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' } },
      h('button', { className: 'btn btn-primary', onClick: () => render(state.deckId) }, '再测一次'),
      h('button', { className: 'btn btn-secondary', onClick: () => window.location.hash = '#/' }, '返回首页')
    )
  );
}

function renderWrongList() {
  const wrongAnswers = state.answers.filter(a => !a.correct);
  
  return h('div', { style: { marginBottom: '24px', textAlign: 'left' } },
    h('h3', { style: { marginBottom: '12px' } }, '❌ 错题列表'),
    ...wrongAnswers.map(answer => 
      h('div', { style: { padding: '12px', background: '#fef2f2', borderRadius: '8px', marginBottom: '8px' } },
        h('div', { style: { fontWeight: 'bold', marginBottom: '4px' } }, answer.word.lemma),
        h('div', { style: { fontSize: '14px', color: '#6b7280' } }, answer.word.senses[0]?.defCn || ''),
        h('div', { style: { fontSize: '12px', color: '#9ca3af', marginTop: '4px' } }, 
          `模式: ${answer.mode} · 评分: ${answer.rating}`)
      )
    )
  );
}

function noDeckUI(msg, href) {
  return h('div', { style: { padding: '20px', textAlign: 'center' } },
    h('h2', {}, msg),
    h('button', { className: 'btn btn-primary', onClick: () => window.location.hash = href }, '返回')
  );
}

async function renderDeckSelection() {
  try {
    const db = await openDB();
    const decks = await getAll(db, 'decks');
    
    if (decks.length === 0) {
      return h('div', { style: { padding: '20px', textAlign: 'center' } },
        h('div', { style: { fontSize: '48px', marginBottom: '16px' } }, '📝'),
        h('p', { style: { fontSize: '16px', marginBottom: '16px' } }, '还没有词书'),
        h('button', { className: 'btn btn-primary', onClick: () => window.location.hash = '#/import' }, '导入词表')
      );
    }
    
    return h('div', { style: { padding: '20px', maxWidth: '600px', margin: '0 auto' } },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' } },
        h('h2', { style: { margin: 0 } }, '📝 选择词书进行自测'),
        h('button', { className: 'btn btn-secondary', onClick: () => window.location.hash = '#/' }, '← 返回')
      ),
      
      ...decks.map(deck => 
        h('div', { 
          className: 'card', 
          style: { 
            padding: '16px', 
            marginBottom: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          },
          onClick: () => window.location.hash = `#/quiz/${deck.id}`
        },
          h('h3', { style: { margin: '0 0 4px 0', fontSize: '16px' } }, deck.name),
          h('p', { style: { margin: 0, color: '#6b7280', fontSize: '14px' } },
            `${deck.wordIds?.length || 0} 个词条 · ${deck.source === 'builtin' ? '内置' : '导入'}`
          )
        )
      )
    );
  } catch (error) {
    console.error('加载词书失败:', error);
    return noDeckUI('加载词书失败', '#/');
  }
}
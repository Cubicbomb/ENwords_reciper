/**
 * 自测视图
 */
import { h, mount, toast, progressBar, loading, emptyState } from '../ui/dom.js';
import { openDB, getAll, getByIndex, get, put } from '../store/db.js';
import { createLog } from '../domain/model.js';
import { grade } from '../domain/scheduler.js';
import { autoSelectMode } from '../modes/index.js';
import { createFlashButtons } from '../modes/shared.js';

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
  if (!params) return renderDeckSelection();

  const deckId = params;
  state.deckId = deckId;
  state.loading = true;

  try {
    const db = await openDB();
    const deck = await get(db, 'decks', deckId);
    if (!deck) return noDeckUI('词书不存在', '#/library');

    const allCards = await getByIndex(db, 'cards', 'deckId', deckId);
    const shuffledCards = allCards.sort(() => Math.random() - 0.5);
    const testCards = shuffledCards.slice(0, Math.min(20, shuffledCards.length));

    const words = [];
    for (const card of testCards) {
      const word = await get(db, 'words', card.wordId);
      if (word) words.push({ card, word });
    }

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
    console.error('加载失败:', error);
    toast('加载失败');
  } finally {
    state.loading = false;
  }

  return renderQuiz();
}

function renderQuiz() {
  if (state.loading) return loading();

  if (state.submitted) return renderResults();

  if (state.questions.length === 0) {
    return h('div', { style: { padding: '48px 20px' } },
      emptyState({
        title: '没有可测试的词条',
        action: h('button', {
          className: 'btn btn-secondary',
          onClick: () => window.location.hash = '#/'
        }, '返回首页')
      })
    );
  }

  const { currentIndex, questions } = state;
  if (currentIndex >= questions.length) return renderResults();

  const question = questions[currentIndex];
  const mode = question.mode;

  const modeItem = mode.build(question.word, {
    modeId: mode.id,
    allWords: state.words.map(w => w.word),
    onComplete: (result) => handleAnswer(result)
  });

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
            if (confirm('退出测试？')) window.location.hash = '#/';
          }
        }, '← 退出'),
        h('span', { style: { fontSize: '13px', color: 'var(--ink-3)' } },
          `自测 ${currentIndex + 1} / ${questions.length}`
        ),
        h('span', { style: { fontSize: '13px', color: 'var(--ink-3)', width: '48px', textAlign: 'right' } },
          mode.name
        )
      ),
      progressBar(currentIndex + 1, questions.length)
    ),

    // 题目
    h('main', {
      style: {
        flex: '1',
        padding: '24px 20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
      }
    },
      modeItem.question,
      modeItem.answer
    ),

    // 评分按钮
    mode.id === 'flash' ? createFlashButtons(modeItem.check) : null
  );
}

function handleAnswer(result) {
  const { currentIndex, questions } = state;
  const question = questions[currentIndex];

  state.answers.push({
    card: question.card,
    word: question.word,
    mode: question.mode.id,
    rating: result.rating,
    correct: result.correct,
    ms: result.ms,
    answer: result.answer
  });

  state.currentIndex++;

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
    for (const answer of state.answers) {
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
      const updatedCard = grade(answer.card, answer.rating, Date.now());
      await put(db, 'cards', updatedCard);
    }
  } catch (error) {
    console.error('提交失败:', error);
    toast('提交失败');
  }
  mount(renderResults());
}

function renderResults() {
  const { answers } = state;
  const total = answers.length;
  const correct = answers.filter(a => a.correct).length;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
  const wrongAnswers = answers.filter(a => !a.correct);

  return h('div', { className: 'fade-in', style: { padding: '48px 20px' } },
    // 主指标
    h('div', { style: { textAlign: 'center', marginBottom: '32px' } },
      h('div', { style: { fontSize: '15px', fontWeight: '500', marginBottom: '4px' } }, '测试完成'),
      h('div', {
        style: {
          fontSize: '56px',
          fontWeight: '600',
          letterSpacing: '-0.03em',
          margin: '16px 0',
          color: accuracy >= 80 ? 'var(--green)' : accuracy >= 60 ? 'var(--amber)' : 'var(--red)'
        }
      }, `${accuracy}%`),
      h('div', {
        style: { fontSize: '14px', color: 'var(--ink-3)' }
      }, `${correct} / ${total} 正确`)
    ),

    // 错题
    wrongAnswers.length > 0
      ? h('section', { style: { marginBottom: '24px' } },
          h('div', { className: 'section-title' }, `错题 ${wrongAnswers.length}`),
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
            ...wrongAnswers.map(a =>
              h('div', {
                style: {
                  padding: '12px 14px',
                  background: 'var(--bg)',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--line)'
                }
              },
                h('div', { style: { fontWeight: '500', fontSize: '14px' } }, a.word.lemma),
                h('div', {
                  style: { fontSize: '13px', color: 'var(--ink-3)', marginTop: '2px' }
                }, a.word.senses[0]?.defCn || '')
              )
            )
          )
        )
      : null,

    // 操作
    h('div', { style: { display: 'flex', gap: '8px' } },
      h('button', {
        className: 'btn btn-primary',
        style: { flex: 1 },
        onClick: () => render(state.deckId)
      }, '再测一次'),
      h('button', {
        className: 'btn btn-secondary',
        style: { flex: 1 },
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

async function renderDeckSelection() {
  try {
    const db = await openDB();
    const decks = await getAll(db, 'decks');

    if (decks.length === 0) {
      return h('div', { className: 'fade-in' },
        header('自测'),
        emptyState({
          title: '还没有词书',
          action: h('button', {
            className: 'btn btn-primary',
            onClick: () => window.location.hash = '#/import'
          }, '导入词表')
        })
      );
    }

    return h('div', { className: 'fade-in' },
      header('自测'),
      h('div', { style: { padding: '20px' } },
        h('div', { className: 'section-title' }, '选择词书'),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
          ...decks.map(deck =>
            h('button', {
              className: 'list-item',
              onClick: () => window.location.hash = `#/quiz/${deck.id}`
            },
              h('div', { style: { flex: 1 } },
                h('div', { className: 'list-item-title' }, deck.name),
                h('div', { className: 'list-item-desc' },
                  `${deck.wordIds?.length || 0} 词`
                )
              ),
              h('span', { style: { color: 'var(--ink-3)' } }, '→')
            )
          )
        )
      )
    );
  } catch (error) {
    console.error(error);
    return noDeckUI('加载失败', '#/');
  }
}

function header(title) {
  return h('header', {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '16px 20px',
      borderBottom: '1px solid var(--line)'
    }
  },
    h('button', {
      className: 'btn btn-ghost',
      style: { padding: '4px 8px', marginLeft: '-8px' },
      onClick: () => window.location.hash = '#/'
    }, '←'),
    h('h1', {}, title)
  );
}

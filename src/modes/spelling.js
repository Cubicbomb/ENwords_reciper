/**
 * 拼写模式：给中文义 + 首字母提示
 */

import { h } from '../ui/dom.js';
import { makeGuard } from './shared.js';

/**
 * @param {Object} word
 * @param {Object} ctx
 * @returns {import('./shared.js').ModeItem}
 */
export function build(word, ctx = {}) {
  const { lemma, senses, phonetic } = word;
  const defCn = senses?.[0]?.defCn || '';
  const hint = `${lemma.charAt(0)}${' ·'.repeat(lemma.length - 1)}`;

  const question = h('div', {
    style: { textAlign: 'center', padding: '8px 0 20px' }
  },
    h('div', {
      style: { fontSize: '22px', fontWeight: '500', lineHeight: '1.5', marginBottom: '8px' }
    }, defCn),
    phonetic?.uk
      ? h('div', {
          style: { fontSize: '14px', color: 'var(--ink-3)', fontFamily: 'monospace', marginBottom: '16px' }
        }, `/${phonetic.uk}/`)
      : h('div', { style: { height: '16px' } }),
    h('div', {
      style: {
        fontSize: '18px',
        color: 'var(--ink-3)',
        fontFamily: 'monospace',
        letterSpacing: '0.1em',
        marginBottom: '20px'
      }
    }, hint)
  );

  const input = h('input', {
    type: 'text',
    placeholder: '输入单词',
    autocomplete: 'off',
    autocapitalize: 'off',
    spellcheck: 'false',
    style: {
      textAlign: 'center',
      fontSize: '16px',
      padding: '12px',
      letterSpacing: '0.05em'
    }
  });

  const submitBtn = h('button', {
    className: 'btn btn-primary btn-block',
    style: { marginTop: '10px' },
    onClick: () => doCheck()
  }, '确认');

  const answerDisplay = h('div');

  const container = h('div', {}, question, input, submitBtn, answerDisplay);

  const startTime = Date.now();
  const { guard } = makeGuard(() => {
    const userAnswer = input.value.trim().toLowerCase();
    if (!userAnswer) return undefined;

    input.disabled = true;
    submitBtn.disabled = true;

    const correct = userAnswer === lemma.toLowerCase();
    const distance = levenshtein(userAnswer, lemma.toLowerCase());
    const isClose = distance <= 1 && !correct;
    const rating = correct ? 3 : isClose ? 2 : 1;

    const resultLabel = correct ? '正确' : isClose ? '接近' : '错误';
    const resultColor = correct ? 'var(--green)' : isClose ? 'var(--amber)' : 'var(--red)';

    answerDisplay.appendChild(
      h('div', {
        style: {
          textAlign: 'center',
          marginTop: '16px',
          padding: '14px',
          background: 'var(--bg)',
          borderRadius: 'var(--radius)',
          animation: 'slideUp 0.2s ease'
        }
      },
        h('div', {
          style: { fontSize: '13px', color: resultColor, fontWeight: '500', marginBottom: '8px' }
        }, resultLabel),
        h('div', {
          style: { fontSize: '16px', fontWeight: '500' }
        }, lemma),
        !correct
          ? h('div', {
              style: { fontSize: '13px', color: 'var(--ink-3)', marginTop: '4px' }
            }, `你输入：${userAnswer}`)
          : null
      )
    );

    ctx.onComplete?.({ rating, correct, ms: Date.now() - startTime, answer: userAnswer });
    return rating;
  });

  const doCheck = () => guard();
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') doCheck(); });
  setTimeout(() => input.focus(), 100);

  return { question: container, answer: null, check: () => null, word };
}

function levenshtein(a, b) {
  const m = Array.from({ length: b.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= a.length; j++) m[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = b[i - 1] === a[j - 1] ? 0 : 1;
      m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + cost);
    }
  }
  return m[b.length][a.length];
}

export default { build };

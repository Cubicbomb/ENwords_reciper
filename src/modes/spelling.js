/**
 * 拼写模式：给中文义 + 首字母 + 长度槽位，Levenshtein 判定
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
  const hint = `${lemma.charAt(0).toUpperCase()}${'·'.repeat(lemma.length - 1)}`;

  const question = h('div', { style: { textAlign: 'center', padding: '20px' } },
    h('div', { style: { fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', color: '#111827' } }, defCn),
    phonetic?.uk ? h('div', { style: { fontSize: '16px', color: '#6b7280', marginBottom: '16px' } }, `/${phonetic.uk}/`) : null,
    h('div', { style: { fontSize: '18px', color: '#3b82f6', marginBottom: '16px', fontFamily: 'monospace' } }, hint),
    h('div', { style: { fontSize: '14px', color: '#6b7280', marginBottom: '8px' } }, '请输入单词拼写')
  );

  const input = h('input', {
    type: 'text', placeholder: '输入单词...',
    style: { width: '100%', padding: '12px', fontSize: '18px', textAlign: 'center', border: '2px solid #e5e7eb', borderRadius: '8px', outline: 'none' }
  });

  const submitBtn = h('button', {
    className: 'btn btn-primary',
    style: { width: '100%', padding: '12px', marginTop: '12px', fontSize: '16px' },
    onClick: () => doCheck()
  }, '确认');

  const answerDisplay = h('div', { style: { display: 'none' } });

  const container = h('div', { style: { padding: '0 16px' } }, question, input, submitBtn, answerDisplay);

  const startTime = Date.now();
  const { guard } = makeGuard(() => {
    const userAnswer = input.value.trim().toLowerCase();
    if (!userAnswer) { /* 不算作答 */ return undefined; }
    input.disabled = true;
    submitBtn.disabled = true;

    const correct = userAnswer === lemma.toLowerCase();
    const distance = levenshtein(userAnswer, lemma.toLowerCase());
    const isClose = distance <= 1 && !correct;
    const rating = correct ? 3 : isClose ? 2 : 1;

    const resultText = correct ? '✅ 正确' : isClose ? '🔶 接近' : '❌ 错误';
    const resultColor = correct ? '#10b981' : isClose ? '#f59e0b' : '#ef4444';
    answerDisplay.style.display = 'block';
    answerDisplay.innerHTML = '';
    answerDisplay.appendChild(
      h('div', { style: { textAlign: 'center', marginTop: '16px', padding: '12px', borderRadius: '8px', background: resultColor + '10' } },
        h('div', { style: { fontSize: '18px', color: resultColor, marginBottom: '8px' } }, resultText),
        h('div', { style: { fontSize: '16px', color: '#111827' } }, `正确拼写: ${lemma}`),
        !correct ? h('div', { style: { fontSize: '14px', color: '#6b7280', marginTop: '8px' } }, `你输入: ${userAnswer}`) : null,
        isClose ? h('div', { style: { fontSize: '14px', color: '#6b7280', marginTop: '4px' } }, `编辑距离: ${distance}`) : null
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

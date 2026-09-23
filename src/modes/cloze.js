/**
 * 例句填空模式：遮蔽目标词，无例句时降级为选择题
 */

import { h } from '../ui/dom.js';
import { makeGuard } from './shared.js';
import { build as buildChoice } from './choice.js';

/**
 * @param {Object} word
 * @param {Object} ctx
 * @returns {import('./shared.js').ModeItem}
 */
export function build(word, ctx = {}) {
  const { lemma, examples } = word;
  if (!examples?.length) return buildChoice(word, { ...ctx, modeId: 'choice-en2cn' });

  const { en: sentence, cn: sentenceCn } = examples[0];
  const regex = new RegExp(`\\b${escapeRegex(lemma)}\\b`, 'gi');
  const match = sentence.match(regex);
  if (!match) return buildChoice(word, { ...ctx, modeId: 'choice-en2cn' });

  const targetWord = match[0];
  const blank = '_____';
  const clozeSentence = sentence.replace(regex, blank);

  const question = h('div', { style: { padding: '20px' } },
    h('div', { style: { fontSize: '18px', lineHeight: '1.6', marginBottom: '16px', color: '#111827' } },
      clozeSentence.split(blank).reduce((acc, part, i) => {
        if (i > 0) acc.push(h('span', { style: { display: 'inline-block', minWidth: '80px', borderBottom: '2px solid #3b82f6', margin: '0 4px', textAlign: 'center' } }, blank));
        acc.push(document.createTextNode(part));
        return acc;
      }, [])
    ),
    sentenceCn ? h('div', { style: { fontSize: '14px', color: '#6b7280', fontStyle: 'italic' } }, sentenceCn) : null,
    h('div', { style: { fontSize: '14px', color: '#6b7280', marginTop: '16px' } }, `提示: ${targetWord.charAt(0).toUpperCase()}${'·'.repeat(targetWord.length - 1)}`)
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
    if (!userAnswer) return undefined;
    input.disabled = true;
    submitBtn.disabled = true;

    const correct = userAnswer === targetWord.toLowerCase();
    const resultText = correct ? '✅ 正确' : '❌ 错误';
    const resultColor = correct ? '#10b981' : '#ef4444';
    answerDisplay.style.display = 'block';
    answerDisplay.innerHTML = '';
    answerDisplay.appendChild(
      h('div', { style: { textAlign: 'center', marginTop: '16px', padding: '12px', borderRadius: '8px', background: resultColor + '10' } },
        h('div', { style: { fontSize: '18px', color: resultColor, marginBottom: '8px' } }, resultText),
        h('div', { style: { fontSize: '16px', color: '#111827' } }, `正确答案: ${targetWord}`),
        !correct ? h('div', { style: { fontSize: '14px', color: '#6b7280', marginTop: '8px' } }, `你输入: ${userAnswer}`) : null
      )
    );
    ctx.onComplete?.({ rating: correct ? 3 : 1, correct, ms: Date.now() - startTime, answer: userAnswer });
    return correct ? 3 : 1;
  });

  const doCheck = () => guard();
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') doCheck(); });
  setTimeout(() => input.focus(), 100);

  return { question: container, answer: null, check: () => null, word };
}

function escapeRegex(str) { return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

export default { build };

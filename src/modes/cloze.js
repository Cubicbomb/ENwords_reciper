/**
 * 例句填空模式：遮蔽目标词
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

  const question = h('div', { style: { padding: '8px 0 20px' } },
    h('div', {
      style: {
        fontSize: '18px',
        lineHeight: '1.7',
        marginBottom: '8px',
        color: 'var(--ink)'
      }
    },
      clozeSentence.split(blank).reduce((acc, part, i) => {
        if (i > 0) acc.push(h('span', {
          style: {
            display: 'inline-block',
            minWidth: '72px',
            borderBottom: '1.5px solid var(--ink-3)',
            margin: '0 4px',
            textAlign: 'center'
          }
        }, blank));
        acc.push(document.createTextNode(part));
        return acc;
      }, [])
    ),
    sentenceCn
      ? h('div', {
          style: { fontSize: '14px', color: 'var(--ink-3)', lineHeight: '1.5' }
        }, sentenceCn)
      : null,
    h('div', {
      style: {
        fontSize: '13px',
        color: 'var(--ink-3)',
        marginTop: '16px',
        fontFamily: 'monospace'
      }
    }, `提示: ${targetWord.charAt(0)}${' ·'.repeat(targetWord.length - 1)}`)
  );

  const input = h('input', {
    type: 'text',
    placeholder: '输入单词',
    autocomplete: 'off',
    autocapitalize: 'off',
    spellcheck: 'false',
    style: { textAlign: 'center', fontSize: '16px', padding: '12px' }
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

    const correct = userAnswer === targetWord.toLowerCase();
    const rating = correct ? 3 : 1;

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
          style: {
            fontSize: '13px',
            color: correct ? 'var(--green)' : 'var(--red)',
            fontWeight: '500',
            marginBottom: '8px'
          }
        }, correct ? '正确' : '错误'),
        h('div', { style: { fontSize: '16px', fontWeight: '500' } }, targetWord),
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

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default { build };

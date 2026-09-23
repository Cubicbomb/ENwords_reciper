/**
 * 选择题模式：选义 / 选词
 */

import { h } from '../ui/dom.js';
import { makeGuard, createOptionList } from './shared.js';

/**
 * @param {Object} word
 * @param {Object} ctx
 * @returns {import('./shared.js').ModeItem}
 */
export function build(word, ctx = {}) {
  const isEn2Cn = ctx.modeId === 'choice-en2cn';
  const { senses, lemma } = word;
  const currentDef = senses?.[0]?.defCn || '';
  const distractors = generateDistractors(word, ctx, 3);
  const startTime = Date.now();

  let optionList = null;

  if (isEn2Cn) {
    const options = [currentDef, ...distractors.map(d => d.senses?.[0]?.defCn || '')]
      .filter(Boolean)
      .sort(() => Math.random() - 0.5);

    const question = h('div', {
      style: { textAlign: 'center', padding: '16px 0 24px' }
    },
      h('div', {
        style: { fontSize: '36px', fontWeight: '600', letterSpacing: '-0.02em', marginBottom: '8px' }
      }, lemma),
      h('div', { style: { fontSize: '13px', color: 'var(--ink-3)' } }, '选择正确的中文释义')
    );

    optionList = createOptionList(options, currentDef, (correct, selected) => {
      ctx.onComplete?.({
        rating: correct ? 3 : 1,
        correct,
        ms: Date.now() - startTime,
        answer: selected
      });
    });

    return {
      question,
      answer: optionList.node,
      check: () => null,
      word,
      cleanup: () => optionList.cleanup()
    };
  } else {
    const options = [lemma, ...distractors.map(d => d.lemma)]
      .filter(Boolean)
      .sort(() => Math.random() - 0.5);

    const question = h('div', {
      style: { textAlign: 'center', padding: '16px 0 24px' }
    },
      h('div', {
        style: {
          fontSize: '22px',
          fontWeight: '500',
          lineHeight: '1.5',
          marginBottom: '8px',
          color: 'var(--ink)'
        }
      }, currentDef),
      h('div', { style: { fontSize: '13px', color: 'var(--ink-3)' } }, '选择正确的英文单词')
    );

    optionList = createOptionList(options, lemma, (correct, selected) => {
      ctx.onComplete?.({
        rating: correct ? 3 : 1,
        correct,
        ms: Date.now() - startTime,
        answer: selected
      });
    });

    return {
      question,
      answer: optionList.node,
      check: () => null,
      word,
      cleanup: () => optionList.cleanup()
    };
  }
}

function generateDistractors(word, ctx, count = 3) {
  const { id, senses } = word;
  const currentPos = senses?.[0]?.pos || '';
  const allWords = ctx.allWords || [];

  const samePos = allWords.filter(w =>
    w.id !== id &&
    w.senses?.some(s => s.pos === currentPos) &&
    w.senses?.[0]?.defCn !== senses?.[0]?.defCn
  ).sort(() => Math.random() - 0.5);

  const result = samePos.slice(0, count);
  while (result.length < count) {
    const w = allWords[Math.floor(Math.random() * allWords.length)];
    if (w && w.id !== id && !result.find(r => r.id === w.id)) result.push(w);
  }
  return result;
}

export default { build };

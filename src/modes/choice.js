/**
 * 选择题模式：选义 / 选词
 */

import { h } from '../ui/dom.js';
import { makeGuard } from './shared.js';

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

  if (isEn2Cn) {
    const options = [currentDef, ...distractors.map(d => d.senses?.[0]?.defCn || '')].sort(() => Math.random() - 0.5);
    const question = h('div', { style: { textAlign: 'center', padding: '20px' } },
      h('div', { style: { fontSize: '28px', fontWeight: 'bold', marginBottom: '24px' } }, lemma),
      h('div', { style: { fontSize: '14px', color: '#6b7280', marginBottom: '16px' } }, '请选择正确的中文释义')
    );
    const { guard } = makeGuard((selected) => {
      const correct = selected === currentDef;
      ctx.onComplete?.({ rating: correct ? 3 : 1, correct, ms: Date.now() - startTime, answer: selected });
      return correct ? 3 : 1;
    });
    return { question, answer: createOptions(options, guard), check: () => null, word };
  } else {
    const options = [lemma, ...distractors.map(d => d.lemma)].sort(() => Math.random() - 0.5);
    const question = h('div', { style: { textAlign: 'center', padding: '20px' } },
      h('div', { style: { fontSize: '28px', fontWeight: 'bold', marginBottom: '24px', color: '#111827' } }, currentDef),
      h('div', { style: { fontSize: '14px', color: '#6b7280', marginBottom: '16px' } }, '请选择正确的英文单词')
    );
    const { guard } = makeGuard((selected) => {
      const correct = selected === lemma;
      ctx.onComplete?.({ rating: correct ? 3 : 1, correct, ms: Date.now() - startTime, answer: selected });
      return correct ? 3 : 1;
    });
    return { question, answer: createOptions(options, guard), check: () => null, word };
  }
}

function createOptions(options, onSelect) {
  return h('div', { style: { display: 'grid', gridTemplateColumns: '1fr', gap: '12px', padding: '0 16px' } },
    ...options.map(option =>
      h('button', {
        style: {
          padding: '16px', borderRadius: '8px', border: '2px solid #e5e7eb',
          background: 'white', fontSize: '16px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s'
        },
        onClick: (e) => {
          e.target.style.borderColor = '#3b82f6';
          e.target.style.background = '#eff6ff';
          setTimeout(() => onSelect(option), 200);
        }
      }, option)
    )
  );
}

function generateDistractors(word, ctx, count = 3) {
  const { id, senses } = word;
  const currentPos = senses?.[0]?.pos || '';
  const allWords = ctx.allWords || [];

  const samePos = allWords.filter(w =>
    w.id !== id && w.senses?.some(s => s.pos === currentPos) && w.senses?.[0]?.defCn !== senses?.[0]?.defCn
  ).sort(() => Math.random() - 0.5);

  const result = samePos.slice(0, count);
  while (result.length < count) {
    const w = allWords[Math.floor(Math.random() * allWords.length)];
    if (w && w.id !== id && !result.find(r => r.id === w.id)) result.push(w);
  }
  return result;
}

export default { build };

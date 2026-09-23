/**
 * Flash 背诵模式：卡片翻面自评
 */

import { h } from '../ui/dom.js';
import { makeGuard } from './shared.js';

/**
 * @param {Object} word
 * @param {Object} ctx
 * @returns {import('./shared.js').ModeItem}
 */
export function build(word, ctx = {}) {
  const { phonetic, senses, examples } = word;

  const question = h('div', { className: 'flash-question', style: { textAlign: 'center', padding: '20px' } },
    h('div', { className: 'flash-word', style: { fontSize: '32px', fontWeight: 'bold', marginBottom: '12px' } }, word.lemma),
    phonetic?.uk ? h('div', { style: { fontSize: '18px', color: '#6b7280', marginBottom: '8px' } }, `/${phonetic.uk}/`) : null,
    phonetic?.us && phonetic.us !== phonetic?.uk ? h('div', { style: { fontSize: '18px', color: '#6b7280', marginBottom: '8px' } }, `美:/${phonetic.us}/`) : null
  );

  const senseText = senses.map(s => `${s.pos ? s.pos + ' ' : ''}${s.defCn}`).join('；');

  const exampleHtml = examples?.length > 0
    ? h('div', { style: { marginTop: '16px', padding: '12px', background: '#f9fafb', borderRadius: '8px' } },
        h('div', { style: { fontSize: '14px', color: '#374151', marginBottom: '4px' } }, examples[0].en),
        examples[0].cn ? h('div', { style: { fontSize: '14px', color: '#6b7280' } }, examples[0].cn) : null
      )
    : null;

  const answer = h('div', { className: 'flash-answer', style: { textAlign: 'center', padding: '20px' } },
    h('div', { style: { fontSize: '20px', color: '#111827', marginBottom: '12px' } }, senseText),
    exampleHtml
  );

  const startTime = Date.now();
  const { guard } = makeGuard((rating) => {
    ctx.onComplete?.({
      rating,
      correct: rating >= 3,
      ms: Date.now() - startTime,
      answer: rating === 1 ? '不认识' : rating === 2 ? '模糊' : '认识'
    });
    return rating;
  });

  const check = (input) => guard(input);
  return { question, answer, check, word };
}

export default { build };

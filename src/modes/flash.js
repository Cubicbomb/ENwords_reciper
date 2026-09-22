/**
 * Flash 背诵模式：卡片翻面自评
 * 最低数据要求，任何词都能用
 */

import { h, toast } from '../ui/dom.js';

/**
 * @typedef {Object} ModeItem
 * @property {Node} question
 * @property {Node} answer
 * @property {(input: any) => 1|2|3|4} check
 */

/**
 * Flash 模式构建器
 * @param {Object} word - 词条对象
 * @param {Object} ctx - 上下文（干扰项池、随机源等）
 * @returns {ModeItem}
 */
export function build(word, ctx = {}) {
  const { phonetic, senses, examples } = word;

  // 问题面：单词 + 音标
  const question = h('div', { className: 'flash-question', style: { textAlign: 'center', padding: '20px' } },
    h('div', { className: 'flash-word', style: { fontSize: '32px', fontWeight: 'bold', marginBottom: '12px' } }, word.lemma),
    phonetic?.uk ? h('div', { className: 'flash-phonetic', style: { fontSize: '18px', color: '#6b7280', marginBottom: '8px' } }, `/${phonetic.uk}/`) : null,
    phonetic?.us && phonetic.us !== phonetic?.uk ? h('div', { className: 'flash-phonetic', style: { fontSize: '18px', color: '#6b7280', marginBottom: '8px' } }, `美:/${phonetic.us}/`) : null
  );

  // 答案面：释义 + 例句
  const senseText = senses.map(s => {
    const pos = s.pos ? `${s.pos} ` : '';
    return `${pos}${s.defCn}`;
  }).join('；');

  const exampleHtml = examples?.length > 0
    ? h('div', { className: 'flash-examples', style: { marginTop: '16px', padding: '12px', background: '#f9fafb', borderRadius: '8px' } },
        h('div', { style: { fontSize: '14px', color: '#374151', marginBottom: '4px' } }, examples[0].en),
        examples[0].cn ? h('div', { style: { fontSize: '14px', color: '#6b7280' } }, examples[0].cn) : null
      )
    : null;

  const answer = h('div', { className: 'flash-answer', style: { textAlign: 'center', padding: '20px' } },
    h('div', { className: 'flash-senses', style: { fontSize: '20px', color: '#111827', marginBottom: '12px' } }, senseText),
    exampleHtml
  );

  // 评分函数：根据用户点击的按钮返回 rating
  let startTime = Date.now();
  let answered = false;

  const check = (input) => {
    if (answered) return null;
    answered = true;
    
    const elapsed = Date.now() - startTime;
    ctx.onComplete?.({
      rating: input,
      correct: input >= 3,
      ms: elapsed,
      answer: input === 1 ? '不认识' : input === 2 ? '模糊' : '认识'
    });
    
    return input;
  };

  return { question, answer, check, word };
}

/**
 * 创建 Flash 模式的选择按钮组
 * @param {Function} onSelect - 选择回调 (rating) => void
 * @returns {Node}
 */
export function createButtons(onSelect) {
  const buttons = [
    { text: '❌ 不认识', rating: 1, color: '#ef4444' },
    { text: '😐 模糊', rating: 2, color: '#f59e0b' },
    { text: '😊 认识', rating: 3, color: '#10b981' },
    { text: '😎 简单', rating: 4, color: '#3b82f6' }
  ];

  return h('div', { 
    className: 'flash-buttons',
    style: { 
      display: 'grid', 
      gridTemplateColumns: 'repeat(4, 1fr)', 
      gap: '8px',
      padding: '16px'
    }
  }, 
    ...buttons.map(btn => 
      h('button', {
        className: 'btn',
        style: {
          padding: '12px 8px',
          borderRadius: '8px',
          border: 'none',
          background: btn.color,
          color: 'white',
          fontSize: '14px',
          cursor: 'pointer',
          transition: 'transform 0.1s, opacity 0.1s'
        },
        onClick: (e) => {
          e.target.style.transform = 'scale(0.95)';
          setTimeout(() => {
            e.target.style.transform = 'scale(1)';
            onSelect(btn.rating);
          }, 100);
        }
      }, btn.text)
    )
  );
}

export default { build, createButtons };
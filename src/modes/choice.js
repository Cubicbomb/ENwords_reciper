/**
 * 选择题模式：选义 / 选词
 * 支持 en2cn（英文选中文）和 cn2en（中文选英文）
 */

import { h } from '../ui/dom.js';

/**
 * @typedef {Object} ModeItem
 * @property {Node} question
 * @property {Node} answer
 * @property {(input: any) => 1|2|3|4} check
 */

/**
 * 选择题模式构建器
 * @param {Object} word - 词条对象
 * @param {Object} ctx - 上下文
 * @returns {ModeItem}
 */
export function build(word, ctx = {}) {
  const isEn2Cn = ctx.modeId === 'choice-en2cn';
  const { senses, lemma } = word;

  // 获取当前词条的释义
  const currentDef = senses?.[0]?.defCn || '';
  const currentWord = lemma;

  // 生成干扰项
  const distractors = generateDistractors(word, ctx, isEn2Cn ? 3 : 3);

  // 构建选项
  let options;
  if (isEn2Cn) {
    // 英文选中文：显示英文单词，选项是中文释义
    options = [currentDef, ...distractors.map(d => d.defCn)].sort(() => Math.random() - 0.5);
    
    const question = h('div', { className: 'choice-question', style: { textAlign: 'center', padding: '20px' } },
      h('div', { style: { fontSize: '28px', fontWeight: 'bold', marginBottom: '24px' } }, currentWord),
      h('div', { style: { fontSize: '14px', color: '#6b7280', marginBottom: '16px' } }, '请选择正确的中文释义')
    );

    let answered = false;
    const startTime = Date.now();

    const answer = createOptions(options, (selected) => {
      if (answered) return null;
      answered = true;
      
      const elapsed = Date.now() - startTime;
      const correct = selected === currentDef;
      
      ctx.onComplete?.({
        rating: correct ? 3 : 1,
        correct,
        ms: elapsed,
        answer: selected
      });
      
      return correct ? 3 : 1;
    });

    return { question, answer, check: () => null, word };
  } else {
    // 中文选英文：显示中文释义，选项是英文单词
    options = [currentWord, ...distractors.map(d => d.lemma)].sort(() => Math.random() - 0.5);
    
    const question = h('div', { className: 'choice-question', style: { textAlign: 'center', padding: '20px' } },
      h('div', { style: { fontSize: '28px', fontWeight: 'bold', marginBottom: '24px', color: '#111827' } }, currentDef),
      h('div', { style: { fontSize: '14px', color: '#6b7280', marginBottom: '16px' } }, '请选择正确的英文单词')
    );

    let answered = false;
    const startTime = Date.now();

    const answer = createOptions(options, (selected) => {
      if (answered) return null;
      answered = true;
      
      const elapsed = Date.now() - startTime;
      const correct = selected === currentWord;
      
      ctx.onComplete?.({
        rating: correct ? 3 : 1,
        correct,
        ms: elapsed,
        answer: selected
      });
      
      return correct ? 3 : 1;
    });

    return { question, answer, check: () => null, word };
  }
}

/**
 * 创建选项列表
 * @param {string[]} options
 * @param {Function} onSelect - (selected) => void
 * @returns {Node}
 */
function createOptions(options, onSelect) {
  return h('div', { 
    className: 'choice-options',
    style: { 
      display: 'grid', 
      gridTemplateColumns: '1fr', 
      gap: '12px',
      padding: '0 16px'
    }
  }, 
    ...options.map((option, index) => 
      h('button', {
        className: 'btn choice-option',
        style: {
          padding: '16px',
          borderRadius: '8px',
          border: '2px solid #e5e7eb',
          background: 'white',
          fontSize: '16px',
          textAlign: 'left',
          cursor: 'pointer',
          transition: 'all 0.2s'
        },
        onClick: (e) => {
          // 高亮选中项
          e.target.style.borderColor = '#3b82f6';
          e.target.style.background = '#eff6ff';
          setTimeout(() => onSelect(option), 200);
        }
      }, option)
    )
  );
}

/**
 * 生成干扰项
 * @param {Object} word
 * @param {Object} ctx
 * @param {number} count
 * @returns {Object[]}
 */
function generateDistractors(word, ctx, count = 3) {
  const { senses, id } = word;
  const currentPos = senses?.[0]?.pos || '';
  
  // 从词库中随机选择干扰项
  const allWords = ctx.allWords || [];
  const distractors = [];
  
  // 尝试选择同词性的词
  const samePosWords = allWords.filter(w => 
    w.id !== id && 
    w.senses?.some(s => s.pos === currentPos) &&
    w.senses?.[0]?.defCn !== senses?.[0]?.defCn
  );
  
  // 随机选择
  const shuffled = samePosWords.sort(() => Math.random() - 0.5);
  for (let i = 0; i < Math.min(count, shuffled.length); i++) {
    distractors.push(shuffled[i]);
  }
  
  // 如果不够，从所有词中补充
  while (distractors.length < count) {
    const randomWord = allWords[Math.floor(Math.random() * allWords.length)];
    if (randomWord.id !== id && !distractors.find(d => d.id === randomWord.id)) {
      distractors.push(randomWord);
    }
  }
  
  return distractors;
}

export default { build };
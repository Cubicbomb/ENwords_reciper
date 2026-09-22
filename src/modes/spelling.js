/**
 * 拼写模式：给中文义 + 首字母 + 长度槽位
 * Levenshtein 判定「接近 / 错误」
 */

import { h } from '../ui/dom.js';

/**
 * @typedef {Object} ModeItem
 * @property {Node} question
 * @property {Node} answer
 * @property {(input: any) => 1|2|3|4} check
 */

/**
 * 拼写模式构建器
 * @param {Object} word - 词条对象
 * @param {Object} ctx - 上下文
 * @returns {ModeItem}
 */
export function build(word, ctx = {}) {
  const { lemma, senses, phonetic } = word;
  const defCn = senses?.[0]?.defCn || '';
  
  // 生成提示：首字母 + 长度
  const firstLetter = lemma.charAt(0).toUpperCase();
  const length = lemma.length;
  const hint = `${firstLetter}${'·'.repeat(length - 1)}`;

  // 问题面：中文释义 + 提示
  const question = h('div', { className: 'spelling-question', style: { textAlign: 'center', padding: '20px' } },
    h('div', { style: { fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', color: '#111827' } }, defCn),
    phonetic?.uk ? h('div', { style: { fontSize: '16px', color: '#6b7280', marginBottom: '16px' } }, `/${phonetic.uk}/`) : null,
    h('div', { style: { fontSize: '18px', color: '#3b82f6', marginBottom: '16px', fontFamily: 'monospace' } }, hint),
    h('div', { style: { fontSize: '14px', color: '#6b7280', marginBottom: '8px' } }, '请输入单词拼写')
  );

  // 输入框
  const input = h('input', {
    type: 'text',
    className: 'spelling-input',
    placeholder: '输入单词...',
    style: {
      width: '100%',
      padding: '12px',
      fontSize: '18px',
      textAlign: 'center',
      border: '2px solid #e5e7eb',
      borderRadius: '8px',
      outline: 'none',
      transition: 'border-color 0.2s'
    }
  });

  // 提交按钮
  const submitBtn = h('button', {
    className: 'btn btn-primary',
    style: {
      width: '100%',
      padding: '12px',
      marginTop: '12px',
      fontSize: '16px'
    },
    onClick: () => checkSpelling()
  }, '确认');

  // 答案显示区
  const answerDisplay = h('div', { className: 'spelling-answer', style: { display: 'none' } });

  // 组装
  const container = h('div', { style: { padding: '0 16px' } },
    question,
    input,
    submitBtn,
    answerDisplay
  );

  // 检查拼写
  let answered = false;
  let startTime = Date.now();

  const checkSpelling = () => {
    if (answered) return;
    
    const userAnswer = input.value.trim().toLowerCase();
    if (!userAnswer) return;
    
    answered = true;
    input.disabled = true;
    submitBtn.disabled = true;
    
    const elapsed = Date.now() - startTime;
    const correct = userAnswer === lemma.toLowerCase();
    
    // 计算 Levenshtein 距离
    const distance = levenshtein(userAnswer, lemma.toLowerCase());
    const isClose = distance <= 1 && !correct;
    
    let rating;
    if (correct) {
      rating = 3; // 认识
    } else if (isClose) {
      rating = 2; // 接近（手滑）
    } else {
      rating = 1; // 不认识
    }
    
    // 显示答案
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
    
    ctx.onComplete?.({
      rating,
      correct,
      ms: elapsed,
      answer: userAnswer
    });
  };

  // 回车提交
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      checkSpelling();
    }
  });

  // 自动聚焦
  setTimeout(() => input.focus(), 100);

  return { question: container, answer: null, check: () => null, word };
}

/**
 * 计算 Levenshtein 距离
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function levenshtein(a, b) {
  const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
  
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = b.charAt(i - 1) === a.charAt(j - 1) ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  
  return matrix[b.length][a.length];
}

export default { build };
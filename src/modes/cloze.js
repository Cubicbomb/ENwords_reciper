/**
 * 例句填空模式：遮蔽目标词
 * 无例句时自动降级为选择题
 */

import { h } from '../ui/dom.js';
import { build as buildChoice } from './choice.js';

/**
 * @typedef {Object} ModeItem
 * @property {Node} question
 * @property {Node} answer
 * @property {(input: any) => 1|2|3|4} check
 */

/**
 * Cloze 模式构建器
 * @param {Object} word - 词条对象
 * @param {Object} ctx - 上下文
 * @returns {ModeItem}
 */
export function build(word, ctx = {}) {
  const { lemma, senses, examples } = word;

  // 如果没有例句，降级为选择题
  if (!examples || examples.length === 0) {
    return buildChoice(word, { ...ctx, modeId: 'choice-en2cn' });
  }

  // 取第一个例句
  const example = examples[0];
  const sentence = example.en;
  const sentenceCn = example.cn;

  // 找到目标词在句子中的位置（忽略大小写）
  const regex = new RegExp(`\\b${escapeRegex(lemma)}\\b`, 'gi');
  const match = sentence.match(regex);
  
  if (!match) {
    // 如果没找到，降级为选择题
    return buildChoice(word, { ...ctx, modeId: 'choice-en2cn' });
  }

  const targetWord = match[0];
  const blank = '_____';
  const clozeSentence = sentence.replace(regex, blank);

  // 问题面：挖空句子
  const question = h('div', { className: 'cloze-question', style: { padding: '20px' } },
    h('div', { style: { fontSize: '18px', lineHeight: '1.6', marginBottom: '16px', color: '#111827' } },
      clozeSentence.split(blank).reduce((acc, part, i) => {
        if (i > 0) {
          acc.push(h('span', { 
            style: { 
              display: 'inline-block',
              minWidth: '80px',
              borderBottom: '2px solid #3b82f6',
              margin: '0 4px',
              textAlign: 'center'
            }
          }, blank));
        }
        acc.push(document.createTextNode(part));
        return acc;
      }, [])
    ),
    sentenceCn ? h('div', { style: { fontSize: '14px', color: '#6b7280', fontStyle: 'italic' } }, sentenceCn) : null,
    h('div', { style: { fontSize: '14px', color: '#6b7280', marginTop: '16px' } }, `提示: ${targetWord.charAt(0).toUpperCase()}${'·'.repeat(targetWord.length - 1)}`)
  );

  // 输入框
  const input = h('input', {
    type: 'text',
    className: 'cloze-input',
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
    onClick: () => checkCloze()
  }, '确认');

  // 答案显示区
  const answerDisplay = h('div', { className: 'cloze-answer', style: { display: 'none' } });

  // 组装
  const container = h('div', { style: { padding: '0 16px' } },
    question,
    input,
    submitBtn,
    answerDisplay
  );

  // 检查填空
  let answered = false;
  let startTime = Date.now();

  const checkCloze = () => {
    if (answered) return;
    
    const userAnswer = input.value.trim().toLowerCase();
    if (!userAnswer) return;
    
    answered = true;
    input.disabled = true;
    submitBtn.disabled = true;
    
    const elapsed = Date.now() - startTime;
    const correct = userAnswer === targetWord.toLowerCase();
    
    let rating = correct ? 3 : 1;
    
    // 显示答案
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
      checkCloze();
    }
  });

  // 自动聚焦
  setTimeout(() => input.focus(), 100);

  return { question: container, answer: null, check: () => null, word };
}

/**
 * 转义正则特殊字符
 * @param {string} str
 * @returns {string}
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default { build };
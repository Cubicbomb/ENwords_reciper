/**
 * Flash 背诵模式：两步交互（显示答案 → 评分）
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

  const startTime = Date.now();
  let revealed = false;
  let cleanupKeys = null;

  // 问题：只有单词
  const question = h('div', {
    className: 'flash-question',
    style: {
      textAlign: 'center',
      padding: '24px 16px',
      cursor: 'pointer',
      userSelect: 'none'
    },
    onClick: () => reveal()
  },
    h('div', {
      style: {
        fontSize: '44px',
        fontWeight: '600',
        letterSpacing: '-0.02em',
        marginBottom: '8px'
      }
    }, word.lemma),
    phonetic?.uk
      ? h('div', {
          style: { fontSize: '15px', color: 'var(--ink-3)', fontFamily: 'monospace' }
        }, `/${phonetic.uk}/`)
      : null,
    // 点击提示
    h('div', {
      className: 'reveal-hint',
      style: {
        marginTop: '32px',
        fontSize: '13px',
        color: 'var(--ink-3)',
        opacity: '0.7'
      }
    },
      h('span', { className: 'kbd', style: { marginRight: '6px' } }, 'Space'),
      '或点击显示答案'
    )
  );

  // 答案容器（初始隐藏）
  const senseText = senses.map(s => `${s.pos ? s.pos + ' ' : ''}${s.defCn}`).join('；');

  const answer = h('div', {
    className: 'flash-answer',
    style: {
      textAlign: 'center',
      padding: '0 16px',
      marginTop: '8px',
      display: 'none'  // 初始隐藏
    }
  },
    h('div', {
      style: {
        fontSize: '18px',
        fontWeight: '500',
        color: 'var(--ink)',
        lineHeight: '1.6',
        padding: '16px 0',
        borderTop: '1px solid var(--line)',
        marginTop: '16px',
        animation: 'slideUp 0.2s ease'
      }
    }, senseText),
    examples?.length > 0
      ? h('div', {
          style: {
            marginTop: '12px',
            padding: '14px 16px',
            background: 'var(--bg)',
            borderRadius: 'var(--radius)',
            textAlign: 'left'
          }
        },
          h('div', {
            style: { fontSize: '14px', color: 'var(--ink)', marginBottom: '4px', lineHeight: '1.6' }
          }, examples[0].en),
          examples[0].cn
            ? h('div', { style: { fontSize: '13px', color: 'var(--ink-3)', lineHeight: '1.6' } }, examples[0].cn)
            : null
        )
      : null
  );

  // 评分守卫
  const { guard } = makeGuard((rating) => {
    cleanup();
    ctx.onComplete?.({
      rating,
      correct: rating >= 3,
      ms: Date.now() - startTime,
      answer: rating <= 2 ? (rating === 1 ? '不认识' : '模糊') : '认识'
    });
    return rating;
  });

  // 显示答案
  function reveal() {
    if (revealed) return;
    revealed = true;

    answer.style.display = 'block';
    const hint = question.querySelector('.reveal-hint');
    if (hint) hint.style.display = 'none';

    // 显示评分按钮（通过自定义事件通知）
    document.dispatchEvent(new CustomEvent('flash:revealed'));
  }

  // 键盘处理
  function handleKey(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (!revealed) {
      // 未显示答案：Space/Enter 显示
      if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'Enter') {
        e.preventDefault();
        reveal();
      }
    } else {
      // 已显示答案：1-4 评分
      const map = { '1': 1, '2': 2, '3': 3, '4': 4 };
      const rating = map[e.key];
      if (rating) {
        e.preventDefault();
        guard(rating);
      }
    }
  }

  document.addEventListener('keydown', handleKey);

  function cleanup() {
    document.removeEventListener('keydown', handleKey);
  }

  // check 函数：供外部评分按钮调用
  const check = (rating) => {
    if (!revealed) reveal();
    return guard(rating);
  };

  return {
    question,
    answer,
    check,
    word,
    revealed: () => revealed,
    reveal,
    cleanup
  };
}

export default { build };

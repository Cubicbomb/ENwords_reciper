/**
 * 模式共享工具：类型定义、按钮组件、守卫闭包
 */

import { h } from '../ui/dom.js';

/**
 * @typedef {Object} ModeItem
 * @property {Node} question
 * @property {Node} answer
 * @property {(input: any) => 1|2|3|4} check
 */

/**
 * 创建一次性守卫：防止同一题重复作答
 * @template T
 * @param {(args: any) => T} fn - 实际处理函数
 * @returns {{ guard: (args: any) => T|undefined }}
 */
export function makeGuard(fn) {
  let done = false;
  return {
    guard: (args) => {
      if (done) return undefined;
      done = true;
      return fn(args);
    }
  };
}

/**
 * Flash 模式的 4 个评分按钮（不认识/模糊/认识/简单）
 * @param {Function} onSelect - (rating: 1|2|3|4) => void
 * @returns {Node}
 */
export function createFlashButtons(onSelect) {
  const buttons = [
    { text: '❌ 不认识', rating: 1, color: '#ef4444' },
    { text: '😐 模糊',   rating: 2, color: '#f59e0b' },
    { text: '😊 认识',   rating: 3, color: '#10b981' },
    { text: '😎 简单',   rating: 4, color: '#3b82f6' }
  ];

  return h('div', {
    style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', padding: '16px' }
  },
    ...buttons.map(btn =>
      h('button', {
        style: {
          padding: '12px 8px', borderRadius: '8px', border: 'none',
          background: btn.color, color: 'white', fontSize: '14px',
          cursor: 'pointer', transition: 'transform 0.1s'
        },
        onClick: (e) => {
          e.target.style.transform = 'scale(0.95)';
          setTimeout(() => { e.target.style.transform = 'scale(1)'; onSelect(btn.rating); }, 100);
        }
      }, btn.text)
    )
  );
}

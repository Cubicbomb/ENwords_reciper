/**
 * 模式共享工具
 */

import { h } from '../ui/dom.js';

/**
 * @typedef {Object} ModeItem
 * @property {Node} question
 * @property {Node} answer
 * @property {(input: any) => 1|2|3|4} check
 * @property {() => boolean} [revealed]
 * @property {() => void} [reveal]
 * @property {() => void} [cleanup]
 */

/**
 * 一次性守卫
 * @template T
 * @param {(args: any) => T} fn
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
 * Flash 模式评分按钮（两步：先隐藏，显示答案后出现）
 * @param {Function} onSelect - (rating: 1|2|3|4) => void
 * @returns {{ node: Node, cleanup: () => void, show: () => void }}
 */
export function createFlashButtons(onSelect) {
  const buttons = [
    { text: '不认识', rating: 1, key: '1' },
    { text: '模糊', rating: 2, key: '2' },
    { text: '认识', rating: 3, key: '3' },
    { text: '简单', rating: 4, key: '4' }
  ];

  const { guard } = makeGuard((rating) => {
    cleanup();
    onSelect(rating);
  });

  // 初始隐藏评分按钮
  const buttonsRow = h('div', {
    style: {
      display: 'none',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '8px',
      padding: '0 20px 12px',
      animation: 'slideUp 0.2s ease'
    }
  },
    ...buttons.map(btn =>
      h('button', {
        className: 'grade-btn',
        dataset: { rating: String(btn.rating) },
        onClick: () => guard(btn.rating)
      },
        btn.text,
        h('span', { className: 'kbd' }, btn.key)
      )
    )
  );

  // 监听显示答案事件
  const onRevealed = () => {
    buttonsRow.style.display = 'grid';
    hint.style.display = 'block';
  };
  document.addEventListener('flash:revealed', onRevealed);

  // 快捷键提示
  const hint = h('div', {
    className: 'shortcut-hint',
    style: { display: 'none', paddingTop: '4px' }
  },
    '按 ',
    h('span', { className: 'kbd' }, '1-4'),
    ' 评分'
  );

  function cleanup() {
    document.removeEventListener('flash:revealed', onRevealed);
  }

  const node = h('div', {}, buttonsRow, hint);

  return {
    node,
    cleanup,
    show: () => {
      buttonsRow.style.display = 'grid';
      hint.style.display = 'block';
    }
  };
}

/**
 * 创建选项列表（选择题/听音，带数字键快捷）
 * @param {string[]} options
 * @param {string} correctAnswer
 * @param {Function} onComplete - (correct: boolean, selected: string) => void
 * @returns {{ node: Node, cleanup: () => void }}
 */
export function createOptionList(options, correctAnswer, onComplete) {
  const { guard } = makeGuard((selected) => {
    cleanup();
    const correct = selected === correctAnswer;
    setTimeout(() => onComplete(correct, selected), 150);
    return correct;
  });

  const buttons = [];

  const handleKey = (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    const idx = parseInt(e.key, 10);
    if (idx >= 1 && idx <= options.length) {
      e.preventDefault();
      const btn = buttons[idx - 1];
      if (btn) btn.click();
    }
  };

  document.addEventListener('keydown', handleKey);

  function cleanup() {
    document.removeEventListener('keydown', handleKey);
  }

  const node = h('div', { className: 'options-grid' },
    ...options.map((option, i) => {
      const btn = h('button', {
        className: 'list-item',
        style: { justifyContent: 'flex-start' },
        onClick: (e) => {
          const selected = option;
          const isCorrect = selected === correctAnswer;
          e.currentTarget.style.borderColor = isCorrect ? 'var(--green)' : 'var(--red)';
          e.currentTarget.style.color = isCorrect ? 'var(--green)' : 'var(--red)';
          e.currentTarget.style.background = isCorrect ? '#f0fdf4' : '#fef2f2';
          guard(selected);
        }
      },
        h('span', { className: 'kbd', style: { marginRight: '10px' } }, String(i + 1)),
        h('span', { style: { flex: 1 } }, option)
      );
      buttons.push(btn);
      return btn;
    })
  );

  const hint = h('div', { className: 'shortcut-hint', style: { paddingTop: '8px' } },
    '按数字键 ',
    h('span', { className: 'kbd' }, `1-${options.length}`),
    ' 选择答案'
  );

  return { node: h('div', {}, node, hint), cleanup };
}

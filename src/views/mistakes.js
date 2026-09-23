/**
 * 错词本视图（空壳）
 */
import { h } from '../ui/dom.js';

export function render() {
  return h('div', { style: { padding: '20px', textAlign: 'center' } },
    h('h2', { style: { marginBottom: '16px' } }, '❌ 错词本'),
    h('p', { style: { color: '#6b7280', marginBottom: '24px' } }, '错词复习功能开发中'),
    h('button', { className: 'btn btn-secondary', onClick: () => window.location.hash = '#/' }, '← 返回首页')
  );
}
